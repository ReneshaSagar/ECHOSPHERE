"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProctorEngine from './ProctorEngine';
import { injectKnowledgeBaseIntoAgentInstructions } from '@/lib/enrichment/knowledgeBase';
import { Users, Shield, Zap, Sparkles, Mic, Volume2, UserCheck, AlertCircle } from 'lucide-react';

type InterviewerInfo = {
  interviewer_id?: string;
  name: string;
  role: string;
  voice?: string;
  color?: string;
  is_primary?: boolean;
  agent_uid?: number;
  instructions: string;
  greeting_message: string;
};

type Blueprint = {
  interview_rounds: {
    round_name: string;
    round_type?: 'technical' | 'hr';
    purpose: string;
    interviewers?: InterviewerInfo[];
    interviewer: InterviewerInfo;
    topics: string[];
  }[];
  rubric: Record<string, string>;
};

interface RunningAgent {
  agentId: string;
  agentUid: number;
  name: string;
  role: string;
  voice: string;
  color: string;
  isPrimary: boolean;
  hasFloor: boolean;
  intervening: boolean;
}

export default function InterviewRoom({ 
  blueprint, 
  interviewId, 
  candidateName,
  jobTitle,
  candidateContext,
  resumeText,
  mcpServerUrl
}: { 
  blueprint: Blueprint; 
  interviewId: string;
  candidateName: string;
  jobTitle?: string;
  candidateContext?: any;
  resumeText?: string;
  mcpServerUrl?: string;
}) {
  const router = useRouter();
  const [testState, setTestState] = useState<'IDLE' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'EVALUATING' | 'ENDED' | 'ERROR'>('IDLE');
  const [logs, setLogs] = useState<{time: string, comp: string, msg: string}[]>([]);
  const [transcript, setTranscript] = useState<{round?: string, speaker: string, text: string}[]>([]);
  const [micVolume, setMicVolume] = useState(0);
  const [floorOwner, setFloorOwner] = useState<'PRIMARY_AI' | 'CHALLENGER_AI' | 'HR_AI' | 'CANDIDATE' | 'NONE' | 'CROSSTALK'>('NONE');
  const [currentRound, setCurrentRound] = useState(0);
  const [activePanelAgents, setActivePanelAgents] = useState<RunningAgent[]>([]);
  const [pendingFloorNotice, setPendingFloorNotice] = useState<string | null>(null);

  const runningAgentsRef = useRef<RunningAgent[]>([]);
  useEffect(() => {
    runningAgentsRef.current = activePanelAgents;
  }, [activePanelAgents]);

  // Auto-redirect to completed summary page when interview concludes
  useEffect(() => {
    if (testState === 'ENDED') {
      const timer = setTimeout(() => {
        router.push(`/interview/${interviewId}/completed`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [testState, interviewId, router]);

  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    channel: string;
    candidateUid: number;
    agentIds: string[];
  } | null>(null);

  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);

  const addLog = (comp: string, msg: string) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), comp, msg }]);
  };

  // Cleanup on tab close/refresh: Stop all running agents (Anti-Zombie Guarantee)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionInfo?.agentIds && sessionInfo.agentIds.length > 0) {
        navigator.sendBeacon('/api/agora-mllm/stop-mllm', JSON.stringify({ 
          session_id: sessionInfo.sessionId, 
          agent_ids: sessionInfo.agentIds 
        }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionInfo]);

  // Handle Candidate Utterance & Deterministic Floor Arbitration
  const handleCandidateUtterance = async (utterance: string) => {
    if (!utterance || utterance.length < 10) return;
    try {
      const res = await fetch(`/api/interviews/${interviewId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANDIDATE_UTTERANCE', utterance })
      });
      const stateData = await res.json();
      
      if (stateData.newFloorRequest) {
        const req = stateData.newFloorRequest;
        addLog('Turn Arbiter', `Floor requested by ${req.agentName}: ${req.proposedProbe || req.reason}`);
        setPendingFloorNotice(`⚡ ${req.agentName} requested floor: ${req.proposedProbe || req.reason}`);

        // Arbitrate turn
        const arbRes = await fetch(`/api/interviews/${interviewId}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ARBITRATE_TURN' })
        });
        const arbData = await arbRes.json();
        
        if (arbData.action === 'intervene') {
          addLog('Turn Arbiter', `Floor granted to ${arbData.nextSpeakerName} to challenge candidate's claims.`);
          setActivePanelAgents(prev => prev.map(a => ({
            ...a,
            hasFloor: a.agentId === arbData.nextSpeakerId,
            intervening: a.agentId === arbData.nextSpeakerId
          })));
          setTimeout(() => setPendingFloorNotice(null), 8000);
        }
      }
    } catch (err) {
      console.error('Turn arbitration sync error:', err);
    }
  };

  const startTest = async () => {
    if (testState === 'RUNNING' || testState === 'STARTING') return;
    setTestState('STARTING');
    setLogs([]);
    setTranscript([]);

    const sessionId = `int_${interviewId}_rd${currentRound}`;
    const candidateUid = 1000;
    
    try {
      let AgoraRTC;
      if (!clientRef.current) {
        addLog('Frontend', 'Initializing Agora RTC...');
        AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      }

      const round = blueprint.interview_rounds[currentRound];
      const isTechnicalRound = currentRound === 0 || round.round_type === 'technical';
      addLog('Orchestrator', `Loaded Round ${currentRound + 1}: ${round.round_name}`);

      const roundInterviewers: InterviewerInfo[] = round.interviewers && round.interviewers.length > 0
        ? round.interviewers
        : [round.interviewer];

      const runningAgents: RunningAgent[] = [];
      let channelName = '';
      let candidateToken = '';

      if (isTechnicalRound && roundInterviewers.length >= 2) {
        // Multi-Agent Technical Panel: 2 AI Interviewers simultaneously
        const primary = roundInterviewers[0];
        const challenger = roundInterviewers[1];
        
        addLog('Orchestrator', `Starting Multi-Agent Technical Panel: ${primary.name} (Primary) & ${challenger.name} (Challenger)`);

        // Inject Candidate Knowledge Base into Primary
        const primaryInstructions = injectKnowledgeBaseIntoAgentInstructions(
          primary.instructions || '',
          candidateContext,
          candidateName,
          jobTitle || 'Engineering Role',
          resumeText
        );

        // Inject Candidate Knowledge Base into Challenger
        const challengerInstructions = injectKnowledgeBaseIntoAgentInstructions(
          challenger.instructions || '',
          candidateContext,
          candidateName,
          jobTitle || 'Engineering Role',
          resumeText
        );

        // 1. Spawn Primary Agent (UID 9991, Voice e.g. Aoede)
        addLog('Backend', `Spawning Primary Interviewer (${primary.name}, Voice: ${primary.voice || 'Aoede'})...`);
        const primaryRes = await fetch(`/api/agora-mllm/start-dynamic-mllm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            session_id: sessionId, 
            candidate_uid: candidateUid,
            agent_uid: primary.agent_uid || 9991,
            voice: primary.voice || 'Aoede',
            instructions: primaryInstructions,
            greeting_message: primary.greeting_message
          })
        });
        const primaryData = await primaryRes.json();
        if (!primaryRes.ok) throw new Error(primaryData.detail || `Failed to start ${primary.name}`);

        channelName = primaryData.channel_name;
        candidateToken = primaryData.candidate_token;

        runningAgents.push({
          agentId: primaryData.agent_id,
          agentUid: primary.agent_uid || 9991,
          name: primary.name,
          role: primary.role,
          voice: primary.voice || 'Aoede',
          color: primary.color || '#3B82F6',
          isPrimary: true,
          hasFloor: true,
          intervening: false
        });

        // 2. Spawn Challenger Agent (UID 9992, Voice e.g. Charon) into same channel
        addLog('Backend', `Spawning Specialist / Challenger (${challenger.name}, Voice: ${challenger.voice || 'Charon'})...`);
        const challengerRes = await fetch(`/api/agora-mllm/start-dynamic-mllm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            session_id: sessionId, 
            candidate_uid: candidateUid,
            agent_uid: challenger.agent_uid || 9992,
            voice: challenger.voice || 'Charon',
            instructions: challengerInstructions,
            greeting_message: challenger.greeting_message,
            channel_name: channelName
          })
        });
        const challengerData = await challengerRes.json();
        if (!challengerRes.ok) throw new Error(challengerData.detail || `Failed to start ${challenger.name}`);

        runningAgents.push({
          agentId: challengerData.agent_id,
          agentUid: challenger.agent_uid || 9992,
          name: challenger.name,
          role: challenger.role,
          voice: challenger.voice || 'Charon',
          color: challenger.color || '#8B5CF6',
          isPrimary: false,
          hasFloor: false,
          intervening: false
        });

      } else {
        // Single Agent Round (e.g. Round 2 HR Round)
        const solo = roundInterviewers[0];
        addLog('Orchestrator', `Starting Round Interviewer: ${solo.name} (${solo.role}, Voice: ${solo.voice || 'Aoede'})`);

        const soloInstructions = injectKnowledgeBaseIntoAgentInstructions(
          solo.instructions || '',
          candidateContext,
          candidateName,
          jobTitle || 'Engineering Role',
          resumeText
        );

        const soloRes = await fetch(`/api/agora-mllm/start-dynamic-mllm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            session_id: sessionId, 
            candidate_uid: candidateUid,
            agent_uid: solo.agent_uid || 9993,
            voice: solo.voice || 'Aoede',
            instructions: soloInstructions,
            greeting_message: solo.greeting_message
          })
        });
        const soloData = await soloRes.json();
        if (!soloRes.ok) throw new Error(soloData.detail || `Failed to start ${solo.name}`);

        channelName = soloData.channel_name;
        candidateToken = soloData.candidate_token;

        runningAgents.push({
          agentId: soloData.agent_id,
          agentUid: solo.agent_uid || 9993,
          name: solo.name,
          role: solo.role,
          voice: solo.voice || 'Aoede',
          color: solo.color || '#EA580C',
          isPrimary: true,
          hasFloor: true,
          intervening: false
        });
      }

      setActivePanelAgents(runningAgents);
      setSessionInfo({
        sessionId,
        channel: channelName,
        candidateUid,
        agentIds: runningAgents.map(a => a.agentId)
      });

      addLog('Backend', `Panel active in channel: ${channelName} (${runningAgents.length} agents)`);

      // Attach event listeners BEFORE joining the channel
      clientRef.current.removeAllListeners?.();

      clientRef.current.on("user-joined", (user: any) => {
        addLog('RTC', `[user-joined] Remote UID ${user.uid} joined channel`);
      });

      clientRef.current.on("user-published", async (user: any, mediaType: "audio" | "video") => {
        addLog('RTC', `[user-published] Remote UID ${user.uid} published ${mediaType}`);
        if (mediaType === "audio") {
          try {
            await clientRef.current.subscribe(user, "audio");
            addLog('RTC', `Remote audio subscribed for UID ${user.uid}`);
            if (user.audioTrack) {
              user.audioTrack.play();
              addLog('RTC', `Remote audio playback started for UID ${user.uid}`);
            }
          } catch (e: any) {
            addLog('RTC', `Failed to subscribe to UID ${user.uid}: ${e.message}`);
          }
        }
      });

      clientRef.current.on("user-unpublished", (user: any, mediaType: string) => {
        addLog('RTC', `[user-unpublished] Remote UID ${user.uid} unpublished ${mediaType}`);
      });

      // Data Channel for Transcript & Speaker Attribution
      clientRef.current.on("stream-message", (uid: number, payload: Uint8Array) => {
        try {
          const decoder = new TextDecoder('utf8');
          const dataStr = decoder.decode(payload);
          const data = JSON.parse(dataStr);
          
          if (data.text) {
            let speakerName = candidateName;
            if (Number(data.uid) === 9991) {
              speakerName = runningAgentsRef.current.find(a => a.agentUid === 9991)?.name || 'Primary Interviewer';
            } else if (Number(data.uid) === 9992) {
              speakerName = runningAgentsRef.current.find(a => a.agentUid === 9992)?.name || 'Challenger';
            } else if (Number(data.uid) === 9993) {
              speakerName = runningAgentsRef.current.find(a => a.agentUid === 9993)?.name || 'HR Interviewer';
            } else if (Number(data.uid) !== candidateUid) {
              speakerName = 'Interviewer';
            }

            setTranscript(prev => {
              const newArr = [...prev];
              const last = newArr[newArr.length - 1];
              
              if (last && last.speaker === speakerName) {
                if (data.is_final) {
                  last.text += " " + data.text;
                }
              } else {
                newArr.push({ round: round.round_name, speaker: speakerName, text: data.text });
              }
              return newArr;
            });

            // If candidate spoke, check for deterministic scalability/concurrency triggers
            if (Number(data.uid) === candidateUid && data.is_final) {
              handleCandidateUtterance(data.text);
            }
          }
        } catch (e) {
          // Ignore non-JSON Agora metadata frames
        }
      });

      // Turn Arbiter (Floor Control & Multi-Agent Volume Tracking)
      clientRef.current.enableAudioVolumeIndicator();
      clientRef.current.on("volume-indicator", (volumes: any[]) => {
        let primarySpeaking = false;
        let challengerSpeaking = false;
        let hrSpeaking = false;
        let candidateSpeaking = false;

        volumes.forEach((vol) => {
          if ((vol.uid === 9991 || vol.uid === 9999) && vol.level > 10) primarySpeaking = true;
          if (vol.uid === 9992 && vol.level > 10) challengerSpeaking = true;
          if (vol.uid === 9993 && vol.level > 10) hrSpeaking = true;
          if (vol.uid === candidateUid && vol.level > 10) candidateSpeaking = true;
        });

        const anyAiSpeaking = primarySpeaking || challengerSpeaking || hrSpeaking;

        if (candidateSpeaking && !anyAiSpeaking) {
          setFloorOwner('CANDIDATE');
          setMicVolume(volumes.find(v => v.uid === candidateUid)?.level || 0);
        } else if (!candidateSpeaking && anyAiSpeaking) {
          if (primarySpeaking) setFloorOwner('PRIMARY_AI');
          else if (challengerSpeaking) setFloorOwner('CHALLENGER_AI');
          else if (hrSpeaking) setFloorOwner('HR_AI');
          setMicVolume(0);
        } else if (!candidateSpeaking && !anyAiSpeaking) {
          setFloorOwner('NONE');
          setMicVolume(0);
        } else {
          setFloorOwner('CROSSTALK');
          setMicVolume(volumes.find(v => v.uid === candidateUid)?.level || 0);
        }
      });

      // Join RTC Channel
      if (clientRef.current.connectionState === 'DISCONNECTED') {
        addLog('RTC', 'Joining RTC Channel...');
        await clientRef.current.join(
          process.env.NEXT_PUBLIC_AGORA_APP_ID || '', 
          channelName, 
          candidateToken, 
          candidateUid
        );

        clientRef.current.remoteUsers.forEach(async (user: any) => {
          if (user.hasAudio) {
            try {
              await clientRef.current.subscribe(user, "audio");
              user.audioTrack?.play();
              addLog('RTC', `Subscribed to existing remote UID ${user.uid}`);
            } catch (e) {}
          }
        });

        const AgoraRTCSDK = (await import('agora-rtc-sdk-ng')).default;
        localAudioTrackRef.current = await AgoraRTCSDK.createMicrophoneAudioTrack();
        await clientRef.current.publish([localAudioTrackRef.current]);
        addLog('RTC', 'Local microphone published.');
      } else {
        addLog('RTC', 'Reusing existing RTC connection for new round.');
        if (localAudioTrackRef.current) {
          await clientRef.current.publish([localAudioTrackRef.current]).catch((e: any) => console.log('Already published', e));
        }
      }

      setTestState('RUNNING');
      addLog('System', `Round ${currentRound + 1} is running with active panel.`);

    } catch (e: any) {
      setTestState('ERROR');
      addLog('Error', e.message);
    }
  };

  const finishRound = async () => {
    setTestState('STOPPING');
    addLog('System', 'Stopping all active agents for this round...');
    try {
      // 1. Anti-Zombie Guarantee: Stop ALL running agents from this round
      if (sessionInfo?.agentIds && sessionInfo.agentIds.length > 0) {
        await fetch('/api/agora-mllm/stop-mllm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            session_id: sessionInfo.sessionId, 
            agent_ids: sessionInfo.agentIds 
          })
        });
        addLog('System', `Stopped ${sessionInfo.agentIds.length} agent(s).`);
      }
      
      // Temporarily unpublish local mic
      if (localAudioTrackRef.current) {
        await clientRef.current?.unpublish([localAudioTrackRef.current]);
      }
      setSessionInfo(null);
      setActivePanelAgents([]);
      
      // 2. Decision Gate (Evaluate Round)
      setTestState('EVALUATING');
      addLog('Arbiter', 'Evaluating round evidence via Decision Gate...');
      
      const roundName = blueprint.interview_rounds[currentRound].round_name;
      const roundTranscript = transcript.filter(t => (t as any).round === roundName);
      
      const evalRes = await fetch(`/api/interviews/${interviewId}/evaluate-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundName: roundName,
          transcript: roundTranscript,
          rubric: blueprint.rubric
        })
      });
      
      const evalData = await evalRes.json();
      if (!evalRes.ok) throw new Error(evalData.error || 'Evaluation failed');
      
      addLog('Arbiter', `Decision Gate Outcome: ${evalData.evaluation.decision} (Score: ${evalData.evaluation.score}/100)`);

      // 3. Transition Logic
      if (evalData.evaluation.decision === 'FAIL') {
        localAudioTrackRef.current?.close();
        await clientRef.current?.leave();
        setTestState('ENDED');
        addLog('System', 'Candidate did not meet criteria for technical round. Interview concluded.');
      } else {
        // PASS
        if (currentRound + 1 < blueprint.interview_rounds.length) {
          addLog('System', `Decision Gate Passed! Transitioning to Round ${currentRound + 2} (HR Round)...`);

          // Transition shared interview state to HR
          await fetch(`/api/interviews/${interviewId}/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'TRANSITION_HR',
              technicalScore: evalData.evaluation.score,
              technicalDecisionReason: evalData.evaluation.reason
            })
          }).catch(err => console.error('State transition error:', err));

          setCurrentRound(prev => prev + 1);
          setTestState('IDLE'); 
          
          setTimeout(() => {
            const startBtn = document.getElementById('auto-start-btn');
            if (startBtn) startBtn.click();
          }, 2500);
        } else {
          localAudioTrackRef.current?.close();
          await clientRef.current?.leave();
          setTestState('ENDED');
          addLog('System', 'All rounds completed successfully.');
        }
      }

    } catch (e: any) {
      setTestState('ERROR');
      addLog('Error', `Round completion failed: ${e.message}`);
    }
  };

  const primaryAgent = activePanelAgents.find(a => a.isPrimary) || activePanelAgents[0];
  const challengerAgent = activePanelAgents.find(a => !a.isPrimary);

  return (
    <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 relative">
      <ProctorEngine interviewId={interviewId} isRunning={testState === 'RUNNING'} />
      
      {/* Left Column: Multi-Agent Video/Controls */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-gray-900 rounded-2xl flex-1 min-h-[460px] flex flex-col justify-between relative overflow-hidden shadow-2xl border border-gray-800 p-6">
          
          {/* Top Panel Bar: Round Info & Active Panel Members */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Round {currentRound + 1}: {blueprint.interview_rounds[currentRound]?.round_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Panel Architecture:</span>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                {currentRound === 0 ? '2 Technical Agents' : '1 HR Agent'}
              </span>
            </div>
          </div>

          {/* Center: Multi-Agent Visualizer & Interviewer Cards */}
          <div className="my-auto py-6">
            {testState === 'RUNNING' && activePanelAgents.length >= 2 ? (
              // 2-Agent Technical Panel (Primary + Challenger)
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Primary Interviewer Card */}
                <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center ${
                  floorOwner === 'PRIMARY_AI' 
                    ? 'bg-blue-950/40 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-102' 
                    : 'bg-gray-850/60 border-gray-800 opacity-90'
                }`}>
                  <div className="relative mb-3">
                    <div 
                      className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl text-white transition-all shadow-md ${
                        floorOwner === 'PRIMARY_AI' ? 'ring-4 ring-blue-500 ring-offset-4 ring-offset-gray-900 scale-105' : ''
                      }`}
                      style={{ backgroundColor: primaryAgent?.color || '#3B82F6' }}
                    >
                      {primaryAgent?.name?.[0] || 'P'}
                    </div>
                    {floorOwner === 'PRIMARY_AI' && (
                      <div className="absolute -inset-2 border-2 border-blue-400 rounded-full animate-ping pointer-events-none"></div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white">{primaryAgent?.name}</h3>
                  <p className="text-xs text-gray-400 mb-3">{primaryAgent?.role}</p>
                  
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <span className="text-3xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold uppercase">
                      Primary Driver
                    </span>
                    <span className={`text-3xs px-2 py-0.5 rounded-full font-bold uppercase ${
                      floorOwner === 'PRIMARY_AI' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {floorOwner === 'PRIMARY_AI' ? '🎙️ Speaking' : '👂 Listening'}
                    </span>
                  </div>
                </div>

                {/* Challenger Interviewer Card */}
                <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center ${
                  floorOwner === 'CHALLENGER_AI' 
                    ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_30px_rgba(139,92,246,0.3)] scale-102' 
                    : challengerAgent?.intervening
                      ? 'bg-amber-950/30 border-amber-500/60'
                      : 'bg-gray-850/60 border-gray-800 opacity-90'
                }`}>
                  <div className="relative mb-3">
                    <div 
                      className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl text-white transition-all shadow-md ${
                        floorOwner === 'CHALLENGER_AI' ? 'ring-4 ring-purple-500 ring-offset-4 ring-offset-gray-900 scale-105' : ''
                      }`}
                      style={{ backgroundColor: challengerAgent?.color || '#8B5CF6' }}
                    >
                      {challengerAgent?.name?.[0] || 'C'}
                    </div>
                    {floorOwner === 'CHALLENGER_AI' && (
                      <div className="absolute -inset-2 border-2 border-purple-400 rounded-full animate-ping pointer-events-none"></div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white">{challengerAgent?.name}</h3>
                  <p className="text-xs text-gray-400 mb-3">{challengerAgent?.role}</p>

                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <span className="text-3xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                      Specialist Lead
                    </span>
                    <span className={`text-3xs px-2 py-0.5 rounded-full font-bold uppercase ${
                      floorOwner === 'CHALLENGER_AI'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : challengerAgent?.intervening
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          : 'bg-gray-800 text-gray-400'
                    }`}>
                      {floorOwner === 'CHALLENGER_AI' 
                        ? '⚡ Probing Scale' 
                        : challengerAgent?.intervening 
                          ? '✋ Intervening' 
                          : '👂 Listening'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Single Interviewer Display (HR Round or Pre-start)
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-4">
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                    testState !== 'RUNNING' ? 'bg-gray-700' :
                    floorOwner === 'HR_AI' || floorOwner === 'PRIMARY_AI' ? 'bg-orange-600 scale-105 shadow-[0_0_40px_rgba(234,88,12,0.5)]' : 
                    floorOwner === 'CANDIDATE' ? 'bg-green-600' :
                    floorOwner === 'CROSSTALK' ? 'bg-red-600' :
                    'bg-gray-800'
                  }`}>
                    <Users className="w-14 h-14 text-white" />
                  </div>
                  {(floorOwner === 'HR_AI' || floorOwner === 'PRIMARY_AI') && (
                    <div className="absolute -inset-3 border-4 border-orange-500/50 rounded-full animate-ping pointer-events-none"></div>
                  )}
                  {floorOwner === 'CANDIDATE' && (
                    <div className="absolute -inset-3 border-4 border-green-500/50 rounded-full animate-pulse pointer-events-none"></div>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-white">
                  {blueprint.interview_rounds[currentRound]?.interviewers?.[0]?.name || blueprint.interview_rounds[currentRound]?.interviewer?.name || 'AI Interviewer'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {blueprint.interview_rounds[currentRound]?.interviewers?.[0]?.role || blueprint.interview_rounds[currentRound]?.interviewer?.role || 'Interviewer'}
                </p>
              </div>
            )}

            {/* Challenger Floor Request Alert Banner */}
            {pendingFloorNotice && (
              <div className="mt-4 max-w-lg mx-auto bg-purple-900/40 border border-purple-500/50 rounded-xl p-3 text-xs text-purple-200 flex items-center gap-2.5 animate-in fade-in duration-200">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 animate-bounce" />
                <span className="font-mono">{pendingFloorNotice}</span>
              </div>
            )}
          </div>

          {/* Floor Arbiter Bar */}
          {testState === 'RUNNING' && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800/80 p-3.5 rounded-xl border border-gray-700/60 backdrop-blur">
              <div className={`px-4 py-1.5 rounded-full font-bold tracking-wider uppercase text-xs flex items-center gap-2 ${
                floorOwner === 'PRIMARY_AI' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                floorOwner === 'CHALLENGER_AI' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 
                floorOwner === 'HR_AI' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
                floorOwner === 'CANDIDATE' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                floorOwner === 'CROSSTALK' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                'bg-gray-900/60 text-gray-400'
              }`}>
                {floorOwner === 'PRIMARY_AI' ? `🎙️ ${primaryAgent?.name || 'Primary'} Speaking` : 
                 floorOwner === 'CHALLENGER_AI' ? `⚡ ${challengerAgent?.name || 'Challenger'} Intervening` : 
                 floorOwner === 'HR_AI' ? '🎙️ HR Interviewer Speaking' : 
                 floorOwner === 'CANDIDATE' ? '🗣️ You are Speaking' : 
                 floorOwner === 'CROSSTALK' ? '⚠️ Interruption Detected' : 
                 'Listening...'}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:w-48">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-75" style={{width: `${micVolume}%`}}></div>
                  </div>
                </div>
                <button 
                  onClick={finishRound} 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition shadow-md whitespace-nowrap cursor-pointer"
                >
                  Finish Round
                </button>
              </div>
            </div>
          )}

          {/* Evaluating State Overlay */}
          {testState === 'EVALUATING' && (
            <div className="absolute inset-0 bg-gray-950/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-md rounded-2xl p-6">
              <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <h3 className="text-xl font-bold">Decision Gate in Progress</h3>
              <p className="text-gray-400 mt-2 text-center max-w-sm text-xs leading-relaxed">
                The Decision Gate is synthesizing evidence from the technical panel before transitioning to the HR round.
              </p>
            </div>
          )}

          {/* Ended State Overlay */}
          {testState === 'ENDED' && (
            <div className="absolute inset-0 bg-gray-950/95 z-30 flex flex-col items-center justify-center text-white backdrop-blur-md rounded-2xl p-6 text-center animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Interview Completed!</h3>
              <p className="text-gray-300 max-w-sm text-sm mb-5">
                Session telemetry and responses captured. Redirecting to your session completion report...
              </p>
              <button 
                onClick={() => router.push(`/interview/${interviewId}/completed`)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                View Session Summary →
              </button>
            </div>
          )}
        </div>

        {/* Pre-start Round Banner */}
        {testState !== 'RUNNING' && testState !== 'STARTING' && testState !== 'EVALUATING' && testState !== 'ENDED' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center shadow-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs mb-3 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Ready for Round {currentRound + 1} of {blueprint.interview_rounds.length}</span>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-1">{blueprint.interview_rounds[currentRound]?.round_name}</h3>
            <p className="text-gray-600 text-sm mb-6 max-w-lg mx-auto">{blueprint.interview_rounds[currentRound]?.purpose}</p>
            <button 
              id="auto-start-btn" 
              onClick={startTest} 
              className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              Start Round {currentRound + 1}
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Live Transcript & System Logs */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden max-h-[58vh]">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-sm">Live Panel Transcript</h3>
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${testState === 'RUNNING' ? 'bg-red-400' : 'hidden'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${testState === 'RUNNING' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
            </span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {transcript.map((msg, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-xl text-sm ${
                  msg.speaker === candidateName 
                    ? 'bg-blue-50 ml-6 border border-blue-100 text-gray-900' 
                    : 'bg-gray-50 mr-6 border border-gray-200 text-gray-800'
                }`}
              >
                <div className="text-3xs font-black text-gray-400 mb-1 uppercase tracking-wider">{msg.speaker}</div>
                <div className="leading-relaxed">{msg.text}</div>
              </div>
            ))}
            {transcript.length === 0 && (
              <div className="text-gray-400 text-xs italic text-center mt-12">
                Panel transcript will appear live as speakers interact...
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-950 rounded-2xl shadow-sm border border-gray-800 flex-1 flex flex-col overflow-hidden max-h-[32vh]">
          <div className="p-3 bg-gray-900 border-b border-gray-800">
            <h3 className="font-bold text-gray-300 text-xs font-mono">Turn Arbiter & System Logs</h3>
          </div>
          <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-3xs">
            {logs.map((log, i) => (
              <div key={i} className="text-gray-300 border-b border-gray-900 pb-1">
                <span className="text-gray-500 mr-2">[{log.time}]</span>
                <span className="text-blue-400 font-bold mr-1.5">{log.comp}:</span>
                <span className="text-emerald-400/90">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

