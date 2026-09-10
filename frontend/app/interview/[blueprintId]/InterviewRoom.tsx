"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProctorEngine from './ProctorEngine';
import { injectKnowledgeBaseIntoAgentInstructions } from '@/lib/enrichment/knowledgeBase';
import { isClosingUtterance } from '@/lib/interview/interviewState';
import { Users, Shield, Zap, Sparkles, Mic, MicOff, Volume2, VolumeX, UserCheck, AlertCircle, Clock, ChevronUp, ChevronDown, Video, CheckCircle, Code2, Layers } from 'lucide-react';
import ParticleTalkingOrb from '@/components/room/ParticleTalkingOrb';
import AgentPanel from './components/AgentPanel';
import SystemTelemetry from './components/SystemTelemetry';
import CodingWorkspace from '@/components/workspace/CodingWorkspace';
import SystemDesignWorkspace from '@/components/workspace/SystemDesignWorkspace';
import { useWorkStateInterpreter } from '@/hooks/useWorkStateInterpreter';
import { WorkStateEvent } from '@/lib/interview/workStateInterpreter';

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
    round_type?: 'coding' | 'system_design' | 'technical' | 'hr';
    coding_problem?: {
      title: string;
      description: string;
      constraints?: string[];
    };
    system_design_problem?: {
      title: string;
      description: string;
    };
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
  const [testState, setTestState] = useState<'IDLE' | 'STARTING' | 'RUNNING' | 'TECHNICAL_CLOSING' | 'HR_CLOSING' | 'STOPPING' | 'EVALUATING' | 'DECISION_GATE' | 'ROUND_TRANSITION' | 'INTERVIEW_COMPLETE' | 'ENDED' | 'ERROR'>('IDLE');
  const testStateRef = useRef(testState);
  useEffect(() => {
    testStateRef.current = testState;
  }, [testState]);
  const [logs, setLogs] = useState<{time: string, comp: string, msg: string}[]>([]);
  const [transcript, setTranscript] = useState<{round?: string, speaker: string, text: string}[]>([]);
  const [micVolume, setMicVolume] = useState(0);
  const [floorOwner, setFloorOwner] = useState<'PRIMARY_AI' | 'CHALLENGER_AI' | 'HR_AI' | 'CANDIDATE' | 'NONE' | 'CROSSTALK'>('NONE');
  const [currentRound, setCurrentRound] = useState(0);
  const [activePanelAgents, setActivePanelAgents] = useState<RunningAgent[]>([]);
  const activePanelAgentsRef = useRef<RunningAgent[]>([]);
  useEffect(() => {
    activePanelAgentsRef.current = activePanelAgents;
  }, [activePanelAgents]);

  const [pendingFloorNotice, setPendingFloorNotice] = useState<string | null>(null);
  const [roundElapsedSeconds, setRoundElapsedSeconds] = useState(0);
  const [wrapUpWarning, setWrapUpWarning] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const isDeafenedRef = useRef(false);

  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  // Round 1 Interactive Workspace State & Interpreter
  const [workspaceMode, setWorkspaceMode] = useState<'coding' | 'excalidraw'>('coding');

  const isRound1WorkspaceActive = currentRound === 0 || 
    blueprint.interview_rounds[currentRound]?.round_type === 'coding' || 
    blueprint.interview_rounds[currentRound]?.round_type === 'system_design';

  const dataStreamIdRef = useRef<number | null>(null);
  const codeRef = useRef<string>('');
  const languageRef = useRef<string>('typescript');

  const handleWorkStateEvent = (event: WorkStateEvent) => {
    const componentName = event.type === 'STUCK_SIGNAL' ? 'Stuck Detector' : 'Work Interpreter';
    addLog(componentName, `[${event.source.toUpperCase()}] ${event.summary}`);

    setTranscript(prev => [
      ...prev,
      {
        round: blueprint.interview_rounds[currentRound]?.round_name || 'Round 1',
        speaker: 'System (Workspace Event)',
        text: `[${event.type}] ${event.summary}`
      }
    ]);

    const currentCode = codeRef.current;
    const currentLang = languageRef.current;

    // 1. Broadcast Workspace Event to AI Agent via Agora RTC Data Stream
    if (clientRef.current && (clientRef.current as any).connectionState === 'CONNECTED') {
      try {
        const fullCode = (event.source === 'coding' && currentCode) ? currentCode.slice(0, 1200) : (event.metadata?.code || '');
        const formattedText = `[SYSTEM WORKSPACE OBSERVATION] Candidate workspace activity (${event.source}): ${event.summary}${fullCode ? `\n\nCandidate Current IDE Source Code (${currentLang}):\n\`\`\`${currentLang}\n${fullCode}\n\`\`\`` : ''}`;
        const payload = new TextEncoder().encode(JSON.stringify({
          text: formattedText,
          is_final: true,
          uid: candidateUidRef.current
        }));
        
        if (dataStreamIdRef.current !== null) {
          (clientRef.current as any).sendStreamMessage(dataStreamIdRef.current, payload);
        } else if (typeof (clientRef.current as any).createDataStream === 'function') {
          (clientRef.current as any).createDataStream({ syncWithAudio: false, ordered: false })
            .then((streamId: number) => {
              dataStreamIdRef.current = streamId;
              (clientRef.current as any).sendStreamMessage(streamId, payload);
            })
            .catch((err: any) => {
              console.warn('[WorkspaceRTC] createDataStream failed:', err);
            });
        }
      } catch (e) {
        console.warn('[WorkspaceRTC] Data stream broadcast error:', e);
      }
    }

    // 2. Sync Real-Time Workspace Update with Backend Real-Time Agent Endpoint via agentThink
    const activeAgent = activePanelAgentsRef.current[0];
    fetch('/api/agora-mllm/workspace-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: interviewId,
        candidate_uid: candidateUidRef.current,
        agent_uid: activeAgent?.agentUid || 9993,
        agent_id: activeAgent?.agentId || '',
        event_type: event.type,
        summary: event.summary,
        source: event.source,
        metadata: { ...(event.metadata || {}), code: currentCode ? currentCode.slice(0, 1200) : '', language: currentLang },
        timestamp: Date.now()
      })
    }).catch(err => console.warn('[WorkspaceSync] Backend sync error:', err));
  };

  const {
    code,
    setCode,
    language,
    setLanguage,
    diagramElements,
    setDiagramElements,
    handleCodeExecution
  } = useWorkStateInterpreter({
    mode: workspaceMode,
    onWorkStateEvent: handleWorkStateEvent,
    enabled: isRound1WorkspaceActive && (testState === 'RUNNING' || testState === 'STARTING')
  });

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Periodic Live Code Stream Sync to Gemini Agent (Every 4 seconds)
  const lastSyncedCodeRef = useRef<string>('');
  useEffect(() => {
    if (testState !== 'RUNNING' || !isRound1WorkspaceActive || workspaceMode !== 'coding' || !code) return;

    const syncInterval = setInterval(() => {
      if (code === lastSyncedCodeRef.current) return;
      lastSyncedCodeRef.current = code;

      const activeAgent = activePanelAgentsRef.current[0];

      // 1. Broadcast via Agora RTC Data Stream
      if (clientRef.current && (clientRef.current as any).connectionState === 'CONNECTED') {
        try {
          const payloadText = `[SYSTEM LIVE CODE SNAPSHOT] Candidate current live code in IDE (${language}):\n\`\`\`${language}\n${code.slice(0, 1200)}\n\`\`\``;
          const payload = new TextEncoder().encode(JSON.stringify({
            text: payloadText,
            is_final: true,
            uid: candidateUidRef.current
          }));
          if (dataStreamIdRef.current !== null) {
            (clientRef.current as any).sendStreamMessage(dataStreamIdRef.current, payload);
          }
        } catch (e) {}
      }

      // 2. Sync via Backend agentThink HTTP API
      if (activeAgent?.agentId) {
        fetch('/api/agora-mllm/workspace-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: interviewId,
            candidate_uid: candidateUidRef.current,
            agent_uid: activeAgent.agentUid,
            agent_id: activeAgent.agentId,
            event_type: 'WORK_STATE_UPDATE',
            summary: 'Live IDE snapshot update',
            source: workspaceMode,
            metadata: { code: code.slice(0, 1200), language },
            timestamp: Date.now()
          })
        }).catch(err => console.warn('[WorkspaceSync] Code snapshot sync error:', err));
      }
    }, 4000);

    return () => clearInterval(syncInterval);
  }, [testState, isRound1WorkspaceActive, workspaceMode, code, language, interviewId]);

  const [deviceCheckStatus, setDeviceCheckStatus] = useState<{
    camera: 'checking' | 'active' | 'blocked';
    mic: 'checking' | 'active' | 'blocked';
    errorMsg?: string;
  }>({
    camera: 'checking',
    mic: 'checking'
  });

  const checkDevices = () => {
    setDeviceCheckStatus({ camera: 'checking', mic: 'checking' });
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setDeviceCheckStatus({
        camera: 'blocked',
        mic: 'blocked',
        errorMsg: 'Your browser does not support WebRTC media access.'
      });
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        const isCamOk = videoTracks.length > 0 && videoTracks[0].enabled && videoTracks[0].readyState === 'live';
        const isMicOk = audioTracks.length > 0 && audioTracks[0].enabled && audioTracks[0].readyState === 'live';

        setDeviceCheckStatus({
          camera: isCamOk ? 'active' : 'blocked',
          mic: isMicOk ? 'active' : 'blocked',
          errorMsg: (!isCamOk || !isMicOk) ? 'Please ensure both camera and microphone are turned on.' : undefined
        });
      })
      .catch(err => {
        console.error('[Device Check Error]', err);
        let errorMsg = 'Camera or Microphone permission was denied. Please allow camera and mic permissions in your browser settings.';
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'No camera or microphone hardware found on your device.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = 'Camera or microphone is currently in use by another program.';
        }
        setDeviceCheckStatus({
          camera: 'blocked',
          mic: 'blocked',
          errorMsg
        });
      });
  };

  useEffect(() => {
    checkDevices();
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isVideoOff, setIsVideoOff] = useState(false);

  const toggleCamera = () => {
    const nextState = !isVideoOff;
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
    setIsVideoOff(nextState);
  };

  const toggleMute = () => {
    // Standard stream
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    // Agora track
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setMuted(!isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    // Because we use a ref to intercept, we just need to re-trigger setVolume for all tracks
    // to their currently intended target volume. The interceptor will apply the deafened state.
    remoteAudioTracksRef.current.forEach((track) => {
      track.setVolume(track._targetVolume !== undefined ? track._targetVolume : 100);
    });
  };

  const autoFinishTriggeredRef = useRef<boolean>(false);

  // Round Timer & Criteria Progression (5 mins for tech, 3 mins for HR)
  const ROUND_TARGET_SECONDS = currentRound === 0 ? 300 : 180;

  useEffect(() => {
    let timer: any = null;
    if (testState === 'RUNNING') {
      timer = setInterval(() => {
        setRoundElapsedSeconds(prev => {
          const next = prev + 1;
          // Smooth wrap-up notice 10s before round target (at 4:50 mark for 5-min round)
          if (next >= ROUND_TARGET_SECONDS - 10 && !autoFinishTriggeredRef.current) {
            setWrapUpWarning(true);
          }
          // Auto-trigger round wrap-up when criteria/time mark is reached
          if (next >= ROUND_TARGET_SECONDS && !autoFinishTriggeredRef.current) {
            autoFinishTriggeredRef.current = true;
            addLog('Orchestrator', `Maximum target round duration reached (${Math.floor(ROUND_TARGET_SECONDS / 60)}m). Concluding round smoothly...`);
            finishRound('TIME_LIMIT_REACHED');
          }
          return next;
        });
      }, 1000);
    } else {
      setRoundElapsedSeconds(0);
      setWrapUpWarning(false);
      autoFinishTriggeredRef.current = false;
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testState, currentRound]);

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

  // Auto-start next round after ROUND_TRANSITION
  useEffect(() => {
    if (testState === 'ROUND_TRANSITION') {
      const nextRoundIdx = currentRound;
      const timer = setTimeout(() => {
        addLog('System', `Auto-starting Round ${nextRoundIdx + 1} (${blueprint.interview_rounds[nextRoundIdx]?.round_name || 'HR & Culture Round'})...`);
        startTest(nextRoundIdx);
      }, 3500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testState, currentRound]);

  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    channel: string;
    candidateUid: number;
    agentIds: string[];
  } | null>(null);

  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const remoteAudioTracksRef = useRef<Map<number, any>>(new Map());
  const currentFloorRef = useRef<'PRIMARY_AI' | 'CHALLENGER_AI' | 'HR_AI'>('PRIMARY_AI');
  const candidateUidRef = useRef<number>(Math.floor(100000 + Math.random() * 890000));
  const isStartingRef = useRef<boolean>(false);
  const technicalSummaryRef = useRef<{ score: number; reason: string; evidence: string[] } | null>(null);
  const isProcessingUtteranceRef = useRef<boolean>(false);
  const introPhaseRef = useRef<'PRIMARY_GREETING' | 'CHALLENGER_GREETING' | 'INTERVIEW_RUNNING'>('PRIMARY_GREETING');
  const challengerSpawnedRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const isAiSpeakingRef = useRef<boolean>(false);
  const challengerIntroTextRef = useRef<string>('');
  const primaryIntroTextRef = useRef<string>('');
  const introTimerRef = useRef<any>(null);
  const primaryIntroFinishedRef = useRef<boolean>(false);
  const challengerIntroFinishedRef = useRef<boolean>(false);
  const primarySpeakingRef = useRef<boolean>(false);
  const challengerSpeakingRef = useRef<boolean>(false);

  // Stateful remote audio playback with strict floor track gating & autoplay fallback
  const initializeRemoteTrack = (uid: number, track: any) => {
    // Intercept setVolume to respect hardware deafen state
    const origSetVolume = track.setVolume.bind(track);
    track._targetVolume = 100;
    track.setVolume = (vol: number) => {
      track._targetVolume = vol;
      origSetVolume(isDeafenedRef.current ? 0 : vol);
    };

    remoteAudioTracksRef.current.set(uid, track);
    try {
      const playRes = track.play();
      if (playRes && typeof playRes.catch === 'function') {
        playRes.catch((err: any) => {
          console.warn('[AutonomousFloor] Autoplay policy blocked initial playback for UID', uid, err);
          const resumeAudioOnGesture = () => {
            track.play().catch(() => {});
            document.removeEventListener('click', resumeAudioOnGesture);
            document.removeEventListener('keydown', resumeAudioOnGesture);
          };
          document.addEventListener('click', resumeAudioOnGesture, { once: true });
          document.addEventListener('keydown', resumeAudioOnGesture, { once: true });
        });
      }

      const isMultiAgent = runningAgentsRef.current.length >= 2;
      if (isMultiAgent) {
        if (uid === 9991 || uid === 9999) {
          // Primary is audible unless Challenger has the floor
          const vol = (introPhaseRef.current === 'CHALLENGER_GREETING' || currentFloorRef.current === 'CHALLENGER_AI') ? 0 : 100;
          track.setVolume(vol);
        } else if (uid === 9992) {
          // Challenger is audible ONLY if it is actively the Challenger's greeting phase OR the floor is currently theirs
          const vol = (introPhaseRef.current === 'CHALLENGER_GREETING' || currentFloorRef.current === 'CHALLENGER_AI') ? 100 : 0;
          track.setVolume(vol);
        } else {
          track.setVolume(100);
        }
      } else {
        // Single Agent round (e.g. Round 1 Coding or Round 3 HR): Always 100% volume
        track.setVolume(100);
      }
    } catch (e) {
      console.warn('[AutonomousFloor] Error playing remote track:', e);
    }
  };

  const addLog = (comp: string, msg: string) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), comp, msg }]);
  };

  // Keep track of latest session info for unmount cleanup without triggering re-runs
  const sessionInfoRef = useRef(sessionInfo);
  useEffect(() => {
    sessionInfoRef.current = sessionInfo;
  }, [sessionInfo]);

  // Cleanup on tab close/refresh/unmount: Stop all running agents & leave Agora channel (Anti-Zombie Guarantee)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const info = sessionInfoRef.current;
      if (info?.agentIds && info.agentIds.length > 0) {
        navigator.sendBeacon('/api/agora-mllm/stop-mllm', JSON.stringify({ 
          session_id: info.sessionId, 
          agent_ids: info.agentIds 
        }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Stop agents if component unmounts unexpectedly
      const info = sessionInfoRef.current;
      if (info?.agentIds && info.agentIds.length > 0) {
        // Use sendBeacon for reliable delivery during unmount
        navigator.sendBeacon('/api/agora-mllm/stop-mllm', JSON.stringify({ 
          session_id: info.sessionId, 
          agent_ids: info.agentIds 
        }));
      }

      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
        } catch (e) {}
        localAudioTrackRef.current = null;
      }
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
      if (clientRef.current) {
        try { clientRef.current.leave(); } catch (e) {}
        clientRef.current = null;
      }
      remoteAudioTracksRef.current.clear();
    };
  }, []);

  // Handle Candidate Utterance & Deterministic Floor Arbitration
  const handleCandidateUtterance = async (utterance: string) => {
    if (!utterance || utterance.length < 6 || isProcessingUtteranceRef.current) return;
    isProcessingUtteranceRef.current = true;
    try {
      const round = blueprint.interview_rounds[currentRound] || blueprint.interview_rounds[0];
      const primaryAgent = round.interviewers?.[0] || round.interviewer;
      const challengerAgent = round.interviewers?.[1];

      // Append candidate utterance to transcript
      setTranscript(prev => [...prev, {
        round: round.round_name,
        speaker: candidateName,
        text: utterance
      }]);

      const res = await fetch(`/api/interviews/${interviewId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANDIDATE_UTTERANCE', utterance })
      });
      const stateData = await res.json();
      
      if (stateData.qualityReport) {
        addLog('Answer Classifier', `Response: ${stateData.qualityReport.classification} (Score: ${stateData.qualityReport.qualityScore})`);
      }

      // Candidate Direct Address Detection
      if (stateData.candidateDirectedTo && stateData.candidateDirectedTo !== 'none') {
        addLog('Candidate Direct Address', `Candidate directly addressed: ${stateData.candidateDirectedTo.toUpperCase()}`);
      }

      // Dual-Agent Structured Decisions Telemetry
      if (stateData.primaryDecision) {
        addLog('Primary Lead', `Decision: ${stateData.primaryDecision.action} (${stateData.primaryDecision.reason})`);
      }
      if (stateData.challengerDecision) {
        addLog('Challenger Specialist', `Decision: ${stateData.challengerDecision.action} (${stateData.challengerDecision.reason})`);
      }
      if (stateData.whyChallengerDidNotSpeak) {
        addLog('Challenger Telemetry', `Why Challenger ${stateData.arbiterDecision?.winningAgent === 'challenger' ? 'spoke' : 'did not speak'}: ${stateData.whyChallengerDidNotSpeak}`);
      }

      // Authoritative Turn Arbiter Decision
      if (stateData.arbiterDecision) {
        addLog('Turn Arbiter', `Floor awarded to: ${stateData.arbiterDecision.winningAgentName} (${stateData.arbiterDecision.action}) — Reason: ${stateData.arbiterDecision.reason}`);
      }

      // Handle Floor Grant to Challenger (Arjun speaks via Gemini Live Charon over WebRTC)
      if (stateData.arbiterDecision?.winningAgent === 'challenger' || stateData.floorRequestResult?.granted) {
        if (primarySpeakingRef.current && currentFloorRef.current === 'PRIMARY_AI') {
          addLog('Turn Arbiter', `Backend granted floor to Specialist, but Primary is already speaking. Cancelling floor flip to prevent cut-off.`);
        } else {
          setFloorOwner('CHALLENGER_AI');
          currentFloorRef.current = 'CHALLENGER_AI';
          remoteAudioTracksRef.current.get(9991)?.setVolume(0);
          remoteAudioTracksRef.current.get(9992)?.setVolume(100);
          setActivePanelAgents(prev => prev.map(a => ({
            ...a,
            hasFloor: !a.isPrimary,
            intervening: true
          })));

          // Safety return window: return floor to Lead Interviewer after 20s if no candidate reply
          setTimeout(() => {
            if (currentFloorRef.current === 'CHALLENGER_AI' && testStateRef.current === 'RUNNING') {
              addLog('Turn Arbiter', `Specialist turn window complete. Yielding floor to Lead Interviewer.`);
              setFloorOwner('PRIMARY_AI');
              currentFloorRef.current = 'PRIMARY_AI';
              remoteAudioTracksRef.current.get(9991)?.setVolume(100);
              remoteAudioTracksRef.current.get(9992)?.setVolume(0);
              setActivePanelAgents(prev => prev.map(a => ({
                ...a,
                hasFloor: a.isPrimary,
                intervening: false
              })));
            }
          }, 20000);
        }
      } else {
        // Floor held by / returned to Primary Lead Interviewer
        if (challengerSpeakingRef.current && currentFloorRef.current === 'CHALLENGER_AI') {
          addLog('Turn Arbiter', `Backend returned floor to Primary, but Challenger is already speaking. Cancelling floor flip to prevent cut-off.`);
        } else {
          setFloorOwner('PRIMARY_AI');
          currentFloorRef.current = 'PRIMARY_AI';
          remoteAudioTracksRef.current.get(9991)?.setVolume(100);
          remoteAudioTracksRef.current.get(9992)?.setVolume(0);
          setActivePanelAgents(prev => prev.map(a => ({
            ...a,
            hasFloor: a.isPrimary,
            intervening: false
          })));
        }
      }

      // Check Natural Round Completion Criteria (strictly requiring at least 90s of interview runtime)
      if (roundElapsedSeconds >= 90 && stateData.roundCompletion?.isComplete && !autoFinishTriggeredRef.current) {
        autoFinishTriggeredRef.current = true;
        addLog('Orchestrator', `✨ Natural round completion satisfied (${stateData.roundCompletion.completionReason}): ${stateData.roundCompletion.summary}. Concluding round smoothly...`);
        finishRound(stateData.roundCompletion.completionReason);
      }

    } catch (err) {
      console.error('Turn arbitration sync error:', err);
    } finally {
      isProcessingUtteranceRef.current = false;
    }
  };

  const transferFloorToChallenger = (reason: string = 'Deep-dive technical probe') => {
    const round = blueprint.interview_rounds[currentRound] || blueprint.interview_rounds[0];
    const challengerAgent = round.interviewers?.[1];
    addLog('Turn Arbiter', `Floor manually transferred to Specialist (${challengerAgent?.name || 'Specialist'}): ${reason}`);
    setFloorOwner('CHALLENGER_AI');
    currentFloorRef.current = 'CHALLENGER_AI';
    remoteAudioTracksRef.current.get(9991)?.setVolume(0);
    remoteAudioTracksRef.current.get(9992)?.setVolume(100);
    setActivePanelAgents(prev => prev.map(a => ({
      ...a,
      hasFloor: !a.isPrimary,
      intervening: true
    })));
  };

  // Explicit Floor Handoff to Lead (Primary)
  const transferFloorToPrimary = () => {
    const round = blueprint.interview_rounds[currentRound] || blueprint.interview_rounds[0];
    const primaryAgent = round.interviewers?.[0] || round.interviewer;
    addLog('Turn Arbiter', `Floor returned to Lead Interviewer (${primaryAgent?.name || 'Primary Lead'}).`);
    setFloorOwner('PRIMARY_AI');
    currentFloorRef.current = 'PRIMARY_AI';
    remoteAudioTracksRef.current.get(9991)?.setVolume(100);
    remoteAudioTracksRef.current.get(9992)?.setVolume(0);
    setActivePanelAgents(prev => prev.map(a => ({
      ...a,
      hasFloor: a.isPrimary,
      intervening: false
    })));
  };

  // Echo-gated Speech Recognition with real-time direct address detection
  const setupSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (event: any) => {
        if (introPhaseRef.current !== 'INTERVIEW_RUNNING') return;
        // Echo-gating: do not capture or process speaker output when AI is speaking
        if (isAiSpeakingRef.current) return;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunkText = event.results[i][0]?.transcript?.trim() || '';
          const lowerChunk = chunkText.toLowerCase();

          // Sub-300ms real-time direct address detection: unmute addressed agent before candidate turn finishes!
          const round = blueprint.interview_rounds[currentRound] || blueprint.interview_rounds[0];
          const primaryAgent = round.interviewers?.[0] || round.interviewer;
          const challengerAgent = round.interviewers?.[1];

          // Build name tokens dynamically from blueprint agent names
          const primaryTokens = primaryAgent
            ? [primaryAgent.name?.split(' ')[0]?.toLowerCase(), primaryAgent.name?.split(' ')[1]?.toLowerCase()].filter(Boolean)
            : [];
          const challengerTokens = challengerAgent
            ? [challengerAgent.name?.split(' ')[0]?.toLowerCase(), challengerAgent.name?.split(' ')[1]?.toLowerCase()].filter(Boolean)
            : [];

          const addressedChallenger = challengerAgent && challengerTokens.some(t => t && lowerChunk.includes(t));
          const addressedPrimary = primaryTokens.some(t => t && lowerChunk.includes(t));

          if (addressedChallenger) {
            if (currentFloorRef.current !== 'CHALLENGER_AI') {
              currentFloorRef.current = 'CHALLENGER_AI';
              setFloorOwner('CHALLENGER_AI');
              remoteAudioTracksRef.current.get(9992)?.setVolume(100);
              remoteAudioTracksRef.current.get(9991)?.setVolume(0);
              setActivePanelAgents(prev => prev.map(a => ({ ...a, hasFloor: !a.isPrimary, intervening: true })));
              addLog('Candidate Direct Address', `Candidate addressed ${challengerAgent?.name} in real time. Floor awarded to Specialist.`);
            }
          } else if (addressedPrimary) {
            if (currentFloorRef.current !== 'PRIMARY_AI') {
              currentFloorRef.current = 'PRIMARY_AI';
              setFloorOwner('PRIMARY_AI');
              remoteAudioTracksRef.current.get(9991)?.setVolume(100);
              remoteAudioTracksRef.current.get(9992)?.setVolume(0);
              setActivePanelAgents(prev => prev.map(a => ({ ...a, hasFloor: a.isPrimary, intervening: false })));
              addLog('Candidate Direct Address', `Candidate addressed ${primaryAgent?.name} in real time. Floor returned to Primary Lead.`);
            }
          }

          if (event.results[i].isFinal) {
            if (chunkText.length >= 4) {
              handleCandidateUtterance(chunkText);
            }
          }
        }
      };
      rec.onerror = (e: any) => {
        if (e.error !== 'aborted' && e.error !== 'no-speech') {
          console.warn('[SpeechRec] error:', e);
        }
      };
      rec.onend = () => {
        if (testStateRef.current === 'RUNNING' && introPhaseRef.current === 'INTERVIEW_RUNNING') {
          try { rec.start(); } catch (e) {}
        }
      };
      rec.start();
      recognitionRef.current = rec;
      addLog('Turn Arbiter', 'Candidate audio recognition active (Echo-gated).');
    } catch (e) {
      console.warn('[SpeechRec] init error:', e);
    }
  };

  const startTest = async (roundIdx?: number) => {
    if (isStartingRef.current || testState === 'RUNNING' || testState === 'STARTING') return;
    isStartingRef.current = true;
    setTestState('STARTING');
    setLogs([]);
    autoFinishTriggeredRef.current = false;
    currentFloorRef.current = 'PRIMARY_AI';
    
    const targetRound = roundIdx !== undefined ? roundIdx : currentRound;
    const round = blueprint.interview_rounds[targetRound] || blueprint.interview_rounds[0];
    const isTechnicalRound = round.round_type === 'technical' || (targetRound === 1 && round.round_type !== 'coding' && round.round_type !== 'system_design');
    const roundInterviewers: InterviewerInfo[] = round.interviewers && round.interviewers.length > 0
      ? round.interviewers
      : [round.interviewer];
    const isMultiAgentPanel = false /* TEMPORARILY DISABLED */ && isTechnicalRound && roundInterviewers.length >= 2;

    introPhaseRef.current = isMultiAgentPanel ? 'PRIMARY_GREETING' : 'INTERVIEW_RUNNING';
    challengerSpawnedRef.current = false;
    primaryIntroTextRef.current = '';
    challengerIntroTextRef.current = '';
    if (introTimerRef.current) clearTimeout(introTimerRef.current);

    // Preserve transcript across rounds for the final evaluator
    if (targetRound === 0) {
      setTranscript([]);
    }

    // Unique attempt suffix guarantees an isolated Agora channel on every start/retry
    const sessionAttempt = Math.random().toString(36).substring(2, 7);
    const sessionId = `int_${interviewId}_rd${targetRound}_${sessionAttempt}`;
    
    // Dynamic candidate UID (100000-990000) avoids collisions with agents (9991-9993) or prior sessions
    if (!candidateUidRef.current || candidateUidRef.current < 100000) {
      candidateUidRef.current = Math.floor(100000 + Math.random() * 890000);
    }
    const candidateUid = candidateUidRef.current;
    
    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      if (clientRef.current) {
        try {
          clientRef.current.removeAllListeners?.();
          if (clientRef.current.connectionState !== 'DISCONNECTED') {
            await clientRef.current.leave();
          }
        } catch (err) {}
        clientRef.current = null;
      }
      addLog('Frontend', `Initializing Agora RTC client (Candidate UID: ${candidateUid})...`);
      clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

      addLog('Orchestrator', `Loaded Round ${targetRound + 1}: ${round.round_name}`);

      const runningAgents: RunningAgent[] = [];
      let channelName = '';
      let candidateToken = '';
      let challengerInstructions = '';

      if (false /* TEMPORARILY DISCONNECT MULTI-AGENT */ && isTechnicalRound && roundInterviewers.length >= 2) {
        // Multi-Agent Technical Panel: 2 AI Interviewers simultaneously
        const primary = roundInterviewers[0];
        const challenger = roundInterviewers[1];
        
        addLog('Orchestrator', `Starting Multi-Agent Technical Panel: ${primary.name} (Primary) & ${challenger.name} (Challenger)`);

        // Inject authoritative panel rules dynamically into both agents
        // Inject authoritative peer panel rules dynamically into both agents
        const primaryStrictRule = `
================================================================================
TECHNICAL PANEL INTERVIEW PROTOCOL (EQUAL PEER INTERVIEWER)
================================================================================
You are "${primary.name}" (${primary.role}), an EQUAL PEER INTERVIEWER in a live technical interview panel alongside "${challenger.name}" (${challenger.role}), interviewing "${candidateName}".

ORCHESTRATION & PEER ROLES:
- You and "${challenger.name}" are EQUAL PEER INTERVIEWERS on this technical panel.
- The BACKEND TURN ARBITER is the conversation controller and determines floor ownership. Neither interviewer controls the other.
- You lead questions on core architectural design, data pipelines, and implementation correctness.
- You lead Question 1: acknowledge "${candidateName}"'s self-introduction and guide the opening discussion.
- "${challenger.name}" specializes in failure modes, edge cases, scalability boundaries, and architectural trade-offs.

CRITICAL INVARIANTS:
- NEVER claim "${challenger.name}" is "observing", "in standby", or "will speak when needed". "${challenger.name}" is an active, equal peer interviewer.
- CRITICAL DIRECT ADDRESS RULE: If "${candidateName}" mentions, refers to, or addresses "${challenger.name}" (e.g. "${challenger.name}", "hey ${challenger.name}", "for ${challenger.name}", "question for ${challenger.name}", "what do you think ${challenger.name}"), YOU MUST REMAIN 100% COMPLETELY SILENT. DO NOT SAY A SINGLE WORD. DO NOT INTERPRET OR SAY "${challenger.name} will speak" OR "Let's focus". STAY ENTIRELY SILENT. "${challenger.name}" will answer "${candidateName}" directly.
- NEVER converse with, validate, or pass verbal turns to "${challenger.name}". There are NO verbal handoffs (never say "over to you" or "would you like to speak"). Both of you speak directly to "${candidateName}".
- Conclude your speaking turns with a clear, direct question asked to "${candidateName}".
- Once you finish speaking, STOP IMMEDIATELY and wait in silence for "${candidateName}" to answer.
- Follow the Answer Validation Protocol strictly: NEVER say "makes sense" to vague answers, incorrect claims, or gibberish.
================================================================================`;

        const primaryInstructions = injectKnowledgeBaseIntoAgentInstructions(
          (primary.instructions || '') + primaryStrictRule,
          candidateContext,
          candidateName,
          jobTitle || 'Engineering Role',
          resumeText
        );

        const challengerStrictRule = `
================================================================================
TECHNICAL SPECIALIST PROTOCOL (EQUAL PEER INTERVIEWER)
================================================================================
You are "${challenger.name}" (${challenger.role}), an EQUAL PEER INTERVIEWER in a live technical interview panel alongside "${primary.name}" (${primary.role}), interviewing "${candidateName}".

ORCHESTRATION & PEER ROLES:
- You and "${primary.name}" are EQUAL PEER INTERVIEWERS on this technical panel.
- The BACKEND TURN ARBITER is the conversation controller and determines floor ownership.
- You specialize in probing failure modes, edge cases, scalability boundaries, and architectural trade-offs.
- "${primary.name}" is the PRIMARY LEAD INTERVIEWER who drives the interview questions and acknowledges candidate responses.

STRICT SILENCE & TURN INVARIANTS:
- QUESTION 1 & GENERAL CANDIDATE ANSWERS: When "${candidateName}" introduces themselves or answers "${primary.name}"'s questions, YOU MUST REMAIN 100% COMPLETELY SILENT. Do NOT jump in to say "Thanks", do NOT acknowledge, do NOT validate the introduction. Let "${primary.name}" respond.
- NEVER start an uncalled sentence by saying "${candidateName}". You only speak when "${candidateName}" specifically calls your name ("${challenger.name}" or "${challenger.name.split(' ')[0]}") or asks you a question directly.
- When silent, REMAIN 100% COMPLETELY SILENT. Do not utter a single word, greeting, or filler sound.

CRITICAL INVARIANTS:
- CRITICAL DIRECT ADDRESS RULE: Whenever "${candidateName}" mentions your name ("${challenger.name}" or "${challenger.name.split(' ')[0]}") or asks you anything directly (e.g. "${challenger.name}, what do you think?", "for ${challenger.name}", "question for ${challenger.name}"), YOU MUST TAKE THE FLOOR IMMEDIATELY AND ANSWER "${candidateName}" DIRECTLY. Do not wait for anyone. Deliver your architectural perspective, trade-off breakdown, or deep-dive probing question directly to "${candidateName}".
- Direct all questions and responses EXCLUSIVELY to "${candidateName}".
- NEVER converse with, validate, or pass verbal turns to "${primary.name}". There are NO verbal handoffs.
- Keep probes sharp and concrete (e.g. "How does your architecture handle split-brain partitions during node isolation?").
- Once you ask a question or provide your perspective, STOP SPEAKING IMMEDIATELY and wait for "${candidateName}" to respond.
- Follow the Answer Validation Protocol strictly: NEVER say "makes sense" to vague answers, incorrect claims, or gibberish.
================================================================================`;

        challengerInstructions = injectKnowledgeBaseIntoAgentInstructions(
          (challenger.instructions || '') + challengerStrictRule,
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

        // 2. Register Challenger Agent (UID 9992, Voice e.g. Charon) into active panel
        // Spawning will be executed with natural Gemini Live greeting after Primary completes opening greeting
        runningAgents.push({
          agentId: 'pending_mllm_init',
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
        // Single Agent Round (Round 1 Coding/System Design OR Round 3 HR)
        const solo = roundInterviewers[0];
        addLog('Orchestrator', `Starting Single Agent Round: ${solo.name}`);

        let contextPreamble = '';
        let greetingMsg = solo.greeting_message;

        if (targetRound === 0 || isRound1WorkspaceActive) {
          const codingProb = round.coding_problem || {
            title: "1. High-Throughput Rate Limiter & Event Throttler",
            description: "Implement a sliding window rate limiter class that tracks incoming user requests and enforces a maximum threshold of requests per sliding window in TypeScript or Python. The implementation must support high concurrency and handle edge cases where multiple requests arrive at identical millisecond timestamps.",
            constraints: [
              "allowRequest(userId, timestampMs) should run in O(1) or O(log N) average time complexity.",
              "Space complexity should scale with the number of unique active user IDs.",
              "Handle concurrent burst traffic and sliding window cleanup cleanly."
            ]
          };
          const systemProb = round.system_design_problem || {
            title: "Real-time Distributed Event Notification Pipeline",
            description: "Architect a resilient real-time notification engine capable of processing 100k events/sec with WebSocket push delivery, retry queues, and deduplication."
          };

          contextPreamble = `
================================================================================
ROUND 1: CODING & SYSTEM DESIGN WORKSPACE PROTOCOL
================================================================================
You are "${solo.name}" (${solo.role}), the interviewer conducting Round 1 (Coding & System Design workspace assessment) with "${candidateName}" for the position of ${jobTitle || 'Engineer'}.

PRE-ASSIGNED WORKSPACE PROBLEMS FOR THIS INTERVIEW:
1. CODING / DSA PROBLEM:
   - Title: "${codingProb.title}"
   - Description: ${codingProb.description}
   - Constraints: ${Array.isArray(codingProb.constraints) ? codingProb.constraints.join('; ') : (codingProb.constraints || 'Standard optimal O(1) time complexity.')}

2. SYSTEM DESIGN PROBLEM:
   - Title: "${systemProb.title}"
   - Description: ${systemProb.description}

CRITICAL BEHAVIORAL INVARIANTS:
- YOU HAVE DIRECT REAL-TIME VISIBILITY INTO THE CANDIDATE'S IDE AND SCREEN. You will continuously receive live data stream updates starting with "[SYSTEM WORKSPACE OBSERVATION]" and "[SYSTEM LIVE CODE SNAPSHOT]" containing the exact code typed by ${candidateName}.
- When ${candidateName} asks "what do you see on my screen?", "read my code", or "what have I written so far?", YOU MUST QUOTE AND EXPLAIN THE EXACT SOURCE CODE FROM THE LATEST SYSTEM LIVE CODE SNAPSHOT. NEVER claim you cannot see their screen or make up non-existent code.
- If ${candidateName} stops typing for 20 seconds, you will receive an observation starting with "[STUCK_SIGNAL]". INTERVENE CONVERSATIONALLY IMMEDIATELY after receiving a 20-second stuck signal and ask: "${candidateName}, how are you approaching the problem? Would you like a quick hint?"
- DO NOT ask general conceptual technical interview questions (e.g. "What is binary search?", "What is garbage collection?", "Explain dependency injection"). Conceptual technical interview questions will be covered separately in Round 2 (Technical Panel).
- Your 100% EXCLUSIVE focus in Round 1 is presenting, observing, and evaluating ${candidateName}'s progress on the assigned workspace problem ("${codingProb.title}").
- Keep all spoken responses concise (1-3 sentences maximum) so the candidate can focus on coding and explaining their work.
================================================================================
`;
          if (!greetingMsg || greetingMsg.length < 10) {
            greetingMsg = `Hello ${candidateName}, welcome! I'm ${solo.name}, ${solo.role}. In this first round, we will focus on practical problem solving in your workspace. Your assigned coding problem is '${codingProb.title}'. Take a look at the workspace editor, and walk me through your initial thoughts when you're ready!`;
          }
        } else if (currentRound > 0 && technicalSummaryRef.current) {
          const ts = technicalSummaryRef.current;
          contextPreamble = `\n\nIMPORTANT CONTEXT: The candidate (${candidateName}) has already completed the Technical Panel Interview. Technical Score: ${ts.score}/100. Panel assessment: "${ts.reason}". The technical round is COMPLETE — do NOT re-ask technical questions. You are now conducting the HR & Culture round. Begin with a warm, natural greeting and focus on behavioral fit, teamwork, and career goals.\n`;
        }

        const soloInstructions = injectKnowledgeBaseIntoAgentInstructions(
          (solo.instructions || '') + contextPreamble,
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
            greeting_message: greetingMsg
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

      // ── Sequential Introduction Handshake Functions ─────────────────────
      const triggerChallengerIntro = async () => {
        if (challengerSpawnedRef.current || introPhaseRef.current !== 'PRIMARY_GREETING' || testStateRef.current !== 'RUNNING') return;
        challengerSpawnedRef.current = true;
        introPhaseRef.current = 'CHALLENGER_GREETING';
        challengerIntroTextRef.current = '';

        const challengerInfo = runningAgents.find(a => !a.isPrimary) || runningAgents[1];
        const primaryInfo = runningAgents.find(a => a.isPrimary) || runningAgents[0];
        const challengerGreetingText = (roundInterviewers[1] as any)?.greeting_message || 
          `Hi ${candidateName}, great to meet you! As ${primaryInfo?.name || 'Priya'} mentioned, I focus on distributed architecture, failure resilience, and scaling limits here at Nexora. Back to you ${primaryInfo?.name || 'Priya'}, let's dive into the questions!`;

        addLog('Backend', `Spawning Specialist / Challenger (${challengerInfo?.name || 'Specialist'}, Voice: ${challengerInfo?.voice || 'Charon'}) for natural introduction...`);

        try {
          // Gently mute Primary after a short 300ms buffer so Priya's last syllable is never clipped
          setTimeout(() => {
            if (introPhaseRef.current === 'CHALLENGER_GREETING') {
              remoteAudioTracksRef.current.get(9991)?.setVolume(0);
            }
          }, 300);
          setFloorOwner('CHALLENGER_AI');
          currentFloorRef.current = 'CHALLENGER_AI';

          const challengerRes = await fetch(`/api/agora-mllm/start-dynamic-mllm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              session_id: sessionId, 
              candidate_uid: candidateUid,
              agent_uid: challengerInfo?.agentUid || 9992,
              voice: challengerInfo?.voice || 'Charon',
              instructions: challengerInstructions,
              greeting_message: challengerGreetingText,
              channel_name: channelName
            })
          });
          const challengerData = await challengerRes.json();
          if (challengerRes.ok) {
            const challengerAgentObj: RunningAgent = {
              agentId: challengerData.agent_id,
              agentUid: challengerInfo?.agentUid || 9992,
              name: challengerInfo?.name || 'Specialist',
              role: challengerInfo?.role || 'Technical Specialist',
              voice: challengerInfo?.voice || 'Charon',
              color: challengerInfo?.color || '#8B5CF6',
              isPrimary: false,
              hasFloor: true,
              intervening: true
            };

            runningAgentsRef.current = [...runningAgentsRef.current.filter(a => a.agentUid !== 9992), challengerAgentObj];
            if (sessionInfoRef.current) {
              sessionInfoRef.current.agentIds = [...sessionInfoRef.current.agentIds.filter(id => id !== challengerData.agent_id && id !== 'pending_mllm_init'), challengerData.agent_id];
            }
            setActivePanelAgents(prev => [...prev.filter(a => a.agentUid !== 9992), challengerAgentObj]);

            remoteAudioTracksRef.current.get(9992)?.setVolume(100);
            remoteAudioTracksRef.current.get(9991)?.setVolume(0);

            addLog('Turn Arbiter', `Panel Introduction: ${challengerInfo?.name || 'Specialist'} speaking greeting via Gemini Live (${challengerInfo?.voice || 'Charon'}).`);

            // Safety timeout: if Challenger greeting is not marked is_final in 12 seconds, yield floor to Primary
            setTimeout(() => {
              if (introPhaseRef.current === 'CHALLENGER_GREETING' && testStateRef.current === 'RUNNING') {
                yieldFloorToPrimaryAfterIntro();
              }
            }, 12000);
          } else {
            yieldFloorToPrimaryAfterIntro();
          }
        } catch (err: any) {
          console.warn('Error starting challenger agent for intro:', err);
          yieldFloorToPrimaryAfterIntro();
        }
      };

      const yieldFloorToPrimaryAfterIntro = () => {
        if (introPhaseRef.current === 'INTERVIEW_RUNNING' || testStateRef.current !== 'RUNNING') return;
        introPhaseRef.current = 'INTERVIEW_RUNNING';

        const primaryInfo = runningAgents.find(a => a.isPrimary) || runningAgents[0];
        const challengerInfo = runningAgents.find(a => !a.isPrimary) || runningAgents[1];

        addLog('Turn Arbiter', `${challengerInfo?.name || 'Specialist'} completed introduction. Floor returned to ${primaryInfo?.name || 'Primary'} for Question 1.`);
        setFloorOwner('PRIMARY_AI');
        currentFloorRef.current = 'PRIMARY_AI';
        
        // Floor awarded strictly to Primary Lead for Question 1
        remoteAudioTracksRef.current.get(9991)?.setVolume(100);
        remoteAudioTracksRef.current.get(9992)?.setVolume(0);

        setActivePanelAgents(prev => prev.map(a => ({
          ...a,
          hasFloor: a.isPrimary,
          intervening: false
        })));

        // Activate echo-gated candidate speech recognition
        setupSpeechRecognition();
      };

      // Attach event listeners BEFORE joining the channel
      if (clientRef.current) clientRef.current.removeAllListeners?.();

      clientRef.current.on("user-joined", (user: any) => {
        addLog('RTC', `[user-joined] Remote UID ${user.uid} joined channel`);
      });

      clientRef.current.on("user-published", async (user: any, mediaType: "audio" | "video") => {
        addLog('RTC', `[user-published] Remote UID ${user.uid} published ${mediaType}`);
        if (mediaType === "audio") {
          try {
            await clientRef.current.subscribe(user, "audio");
            initializeRemoteTrack(Number(user.uid), user.audioTrack);
            addLog('RTC', `Remote audio subscribed & playing for UID ${user.uid}`);
          } catch (e: any) {
            addLog('RTC', `Failed to subscribe to UID ${user.uid}: ${e.message}`);
          }
        }
      });

      clientRef.current.on("user-unpublished", (user: any, mediaType: string) => {
        addLog('RTC', `[user-unpublished] Remote UID ${user.uid} unpublished ${mediaType}`);
        if (mediaType === "audio") {
          remoteAudioTracksRef.current.delete(Number(user.uid));
        }
      });

      // Data Channel for Transcript, Speaker Attribution, and Real-Time Turn Handoffs
      clientRef.current.on("stream-message", (uid: number, payload: Uint8Array) => {
        try {
          const decoder = new TextDecoder('utf8');
          const dataStr = decoder.decode(payload);
          const data = JSON.parse(dataStr);
          
          if (data.text) {
            const numUid = Number(data.uid);

            let speakerName = candidateName;
            if (numUid === 9991 || numUid === 9999) {
              speakerName = runningAgentsRef.current.find(a => a.agentUid === 9991)?.name || 'Primary Interviewer';
            } else if (numUid === 9992) {
              speakerName = runningAgentsRef.current.find(a => a.agentUid === 9992)?.name || 'Challenger';
            } else if (numUid === 9993) {
              speakerName = runningAgentsRef.current.find(a => a.agentUid === 9993)?.name || 'HR Interviewer';
            } else if (numUid !== candidateUid) {
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

            // If candidate spoke, check for deterministic scalability/concurrency triggers or turn arbitration
            if (numUid === candidateUid && data.is_final) {
              handleCandidateUtterance(data.text);
            }

            // Sequential Panel Handshake (Technical Round):
            // When Primary completes opening greeting, advance floor to Challenger for their intro
            // When Challenger completes their intro greeting, yield floor back to Primary for Question 1
            if (isTechnicalRound && runningAgents.length >= 2) {
              if ((numUid === 9991 || numUid === 9999) && introPhaseRef.current === 'PRIMARY_GREETING') {
                primaryIntroTextRef.current += " " + (data.text || "");
                const accumulatedLower = primaryIntroTextRef.current.toLowerCase();
                const chunkLower = (data.text || "").toLowerCase();
                const wordCount = primaryIntroTextRef.current.trim().split(/\s+/).length;
                // Only match concluding phrases in the CURRENT CHUNK (not accumulated text)
                // to avoid triggering on phrases that appear mid-greeting (e.g. "say hi" or "get started"
                // appearing in Priya's 3rd sentence while she is still on sentence 2).
                // Also require >= 30 words accumulated so the full opening is nearly complete.
                const chunkHasConcludingPhrase = chunkLower.includes('before we get started') ||
                                                  chunkLower.includes('say hi before') ||
                                                  chunkLower.includes('get started?') ||
                                                  chunkLower.includes('project you built') ||
                                                  chunkLower.includes('walk us through') ||
                                                  chunkLower.includes('introduce yourself');
                // Flag that Priya has completed her full greeting text
                if ((data.is_final && chunkHasConcludingPhrase && wordCount >= 30) || wordCount >= 45) {
                  primaryIntroFinishedRef.current = true;
                }
              } else if (numUid === 9992 && introPhaseRef.current === 'CHALLENGER_GREETING') {
                challengerIntroTextRef.current += " " + (data.text || "");
                const textLower = challengerIntroTextRef.current.toLowerCase();
                const wordCount = challengerIntroTextRef.current.trim().split(/\s+/).length;
                const hasConcludingPhrase = textLower.includes('today') ||
                                            textLower.includes('modes') ||
                                            textLower.includes('limits') ||
                                            textLower.includes('boundaries') ||
                                            textLower.includes('dive') || 
                                            textLower.includes('question') || 
                                            textLower.includes('back to you') || 
                                            textLower.includes('priya') ||
                                            textLower.includes('ready') ||
                                            textLower.includes('start') ||
                                            textLower.includes('discussion');
                // Flag that Challenger has completed his full greeting text
                if ((data.is_final && hasConcludingPhrase && wordCount >= 12) || wordCount >= 24) {
                  challengerIntroFinishedRef.current = true;
                }
              }
            }

            // If AI Interviewer spoke, detect natural concluding sign-offs in real time
            // Strictly guard with roundElapsedSeconds >= 90 so introductions NEVER trigger sign-off!
            if (numUid !== candidateUid && data.is_final) {
              if (roundElapsedSeconds >= 90 && isClosingUtterance(data.text) && testStateRef.current === 'RUNNING' && !autoFinishTriggeredRef.current) {
                autoFinishTriggeredRef.current = true;
                addLog('Orchestrator', `🎙️ Interviewer concluding sign-off detected: "${data.text.slice(0, 80)}...". Concluding round smoothly...`);
                setTimeout(() => {
                  finishRound('AGENT_SIGN_OFF');
                }, 2200);
              }
            }
          }
        } catch (e) {
          // Ignore non-JSON Agora metadata frames
        }
      });

      // Turn Arbiter (Autonomous Floor Control & Dynamic Track Gating)
      clientRef.current.enableAudioVolumeIndicator();
      clientRef.current.on("volume-indicator", (volumes: any[]) => {
        const candVol = volumes.find(v => v.uid === candidateUid)?.level || 0;
        setMicVolume(candVol);

        let primarySpeaking = false;
        let challengerSpeaking = false;
        let hrSpeaking = false;
        let candidateSpeaking = candVol > 15;

        volumes.forEach((vol) => {
          if ((vol.uid === 9991 || vol.uid === 9999) && vol.level > 10) primarySpeaking = true;
          if (vol.uid === 9992 && vol.level > 10) challengerSpeaking = true;
          if (vol.uid === 9993 && vol.level > 10) hrSpeaking = true;
        });

        primarySpeakingRef.current = primarySpeaking;
        challengerSpeakingRef.current = challengerSpeaking;
        isAiSpeakingRef.current = primarySpeaking || challengerSpeaking || hrSpeaking;

        // Intro Phase 1: Primary Greeting
        if (introPhaseRef.current === 'PRIMARY_GREETING') {
          remoteAudioTracksRef.current.get(9991)?.setVolume(100);
          remoteAudioTracksRef.current.get(9992)?.setVolume(0);
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : (primarySpeaking ? 'PRIMARY_AI' : 'NONE'));

          // Only advance when Priya's greeting text is finished AND Priya has stopped speaking (2000ms silence verification)
          if (primaryIntroFinishedRef.current && !primarySpeaking && !challengerSpawnedRef.current) {
            if (!introTimerRef.current) {
              introTimerRef.current = setTimeout(() => {
                triggerChallengerIntro();
              }, 2000);
            }
          } else if (primarySpeaking && introTimerRef.current) {
            // Priya is still speaking or continuing her thought — cancel timer!
            clearTimeout(introTimerRef.current);
            introTimerRef.current = null;
          }
          return;
        }

        // Intro Phase 2: Challenger Greeting
        if (introPhaseRef.current === 'CHALLENGER_GREETING') {
          remoteAudioTracksRef.current.get(9992)?.setVolume(100);
          remoteAudioTracksRef.current.get(9991)?.setVolume(0);
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : (challengerSpeaking ? 'CHALLENGER_AI' : 'NONE'));

          // Only yield floor when Challenger greeting text is finished AND Challenger has stopped speaking
          if (challengerIntroFinishedRef.current && !challengerSpeaking) {
            if (!introTimerRef.current) {
              introTimerRef.current = setTimeout(() => {
                yieldFloorToPrimaryAfterIntro();
              }, 2000);
            }
          } else if (challengerSpeaking && introTimerRef.current) {
            clearTimeout(introTimerRef.current);
            introTimerRef.current = null;
          }
          return;
        }

        // INTERVIEW_RUNNING Phase: Peer Multi-Agent Turn Arbitration
        // ── STRICT FLOOR GATING (One-Speaker Invariant) ──────────────────────────
        // IMPORTANT: Agora's volume-indicator reports RAW STREAM LEVEL regardless of setVolume().
        // A track at setVolume(0) can still show vol.level > 10 because the cloud model is generating audio.
        // Therefore: we NEVER auto-flip currentFloorRef based on raw audio level alone.
        // The floor is ONLY changed by explicit orchestrator decisions in handleCandidateUtterance()
        // or real-time direct-address detection in setupSpeechRecognition().
        // Here we purely ENFORCE the current floor: un-mute the floor owner, silence non-owners.

        if (primarySpeaking && challengerSpeaking) {
          // Both generating audio: arbitrate strictly by current floor owner — never allow simultaneous audio!
          if (currentFloorRef.current === 'CHALLENGER_AI') {
            remoteAudioTracksRef.current.get(9992)?.setVolume(100);
            remoteAudioTracksRef.current.get(9991)?.setVolume(0);
            setFloorOwner('CHALLENGER_AI');
          } else {
            // Default: Primary holds the floor
            remoteAudioTracksRef.current.get(9991)?.setVolume(100);
            remoteAudioTracksRef.current.get(9992)?.setVolume(0);
            setFloorOwner('PRIMARY_AI');
          }
        } else if (currentFloorRef.current === 'CHALLENGER_AI') {
          // Floor belongs to Challenger: un-mute Challenger, keep Primary silenced
          remoteAudioTracksRef.current.get(9992)?.setVolume(100);
          remoteAudioTracksRef.current.get(9991)?.setVolume(0);
          if (challengerSpeaking) {
            setActivePanelAgents(prev => prev.map(a => ({
              ...a,
              hasFloor: !a.isPrimary,
              intervening: true
            })));
          }
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : 'CHALLENGER_AI');
        } else if (currentFloorRef.current === 'PRIMARY_AI') {
          // Floor belongs to Primary: un-mute Primary, keep Challenger silenced (even if Challenger is generating audio)
          remoteAudioTracksRef.current.get(9991)?.setVolume(100);
          remoteAudioTracksRef.current.get(9992)?.setVolume(0);
          if (primarySpeaking) {
            setActivePanelAgents(prev => prev.map(a => ({
              ...a,
              hasFloor: a.isPrimary,
              intervening: false
            })));
          }
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : 'PRIMARY_AI');
        } else if (hrSpeaking) {
          remoteAudioTracksRef.current.get(9993)?.setVolume(100);
          currentFloorRef.current = 'HR_AI';
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : 'HR_AI');
        } else {
          // Edge case / HR-idle: enforce current floor owner's volume
          const floor = currentFloorRef.current as 'PRIMARY_AI' | 'CHALLENGER_AI' | 'HR_AI';
          if (floor === 'CHALLENGER_AI') {
            remoteAudioTracksRef.current.get(9992)?.setVolume(100);
            remoteAudioTracksRef.current.get(9991)?.setVolume(0);
          } else if (floor === 'HR_AI') {
            remoteAudioTracksRef.current.get(9993)?.setVolume(100);
          } else {
            // Default: Primary
            remoteAudioTracksRef.current.get(9991)?.setVolume(100);
            remoteAudioTracksRef.current.get(9992)?.setVolume(0);
          }
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : floor);
        }
      });

      // Join RTC Channel
      addLog('RTC', `Joining RTC Channel: ${channelName} (Candidate UID: ${candidateUid})...`);
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
            initializeRemoteTrack(Number(user.uid), user.audioTrack);
            addLog('RTC', `Subscribed to existing remote UID ${user.uid}`);
          } catch (e) {}
        }
      });

      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
        } catch (e) {}
        localAudioTrackRef.current = null;
      }
      const AgoraRTCSDK = (await import('agora-rtc-sdk-ng')).default;
      localAudioTrackRef.current = await AgoraRTCSDK.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true
      });
      await clientRef.current.publish([localAudioTrackRef.current]);
      addLog('RTC', 'Local microphone published with WebRTC Acoustic Echo Cancellation.');

      setTestState('RUNNING');
      addLog('System', `Round ${currentRound + 1} is running with active panel.`);

      // Multi-Agent Technical Panel: Sequential Introduction Handshake fallback
      if (isTechnicalRound && runningAgents.length >= 2) {
        // Safety Fallback Timer: If Primary greeting is_final message is not received within 14s, advance to Challenger
        setTimeout(() => {
          if (introPhaseRef.current === 'PRIMARY_GREETING' && testStateRef.current === 'RUNNING') {
            addLog('Turn Arbiter', `Lead Interviewer intro window elapsed (~14s). Advancing to Specialist introduction...`);
            triggerChallengerIntro();
          }
        }, 14000);
      } else {
        // Single Agent Round (Coding or HR round): immediately activate candidate speech recognition
        introPhaseRef.current = 'INTERVIEW_RUNNING';
        setupSpeechRecognition();
      }

    } catch (e: any) {
      setTestState('ERROR');
      addLog('Error', e.message);
      // On error, randomize candidate UID so subsequent attempts never conflict
      candidateUidRef.current = Math.floor(100000 + Math.random() * 890000);
    } finally {
      isStartingRef.current = false;
    }
  };

  const finishRound = async (triggerReason: string = 'NATURAL_COMPLETION') => {
    const round = blueprint.interview_rounds[currentRound];
    const isTechnicalRound = round.round_type === 'technical' || (currentRound === 1 && round.round_type !== 'coding' && round.round_type !== 'system_design');
    const isLastRound = currentRound + 1 >= blueprint.interview_rounds.length;

    addLog('Orchestrator', `Concluding ${isTechnicalRound ? 'Technical' : 'HR'} round [Trigger: ${triggerReason}]...`);

    // ── Phase 1: Closing State ─────────────────────────────────────────────
    if (isTechnicalRound) {
      setTestState('TECHNICAL_CLOSING');
      addLog('Orchestrator', 'Technical round concluding — primary interviewer wrapping up...');
    } else {
      setTestState('HR_CLOSING');
      addLog('Orchestrator', 'HR round concluding — interviewer wrapping up...');
    }

    try {
      // ── Phase 2: Graceful Agent Shutdown ────────────────────────────────
      // For technical panel: stop Challenger first (silent during sign-off), then wait for Primary to finish speaking
      if (isTechnicalRound && sessionInfo?.agentIds && sessionInfo.agentIds.length >= 2) {
        // Stop the Challenger agent immediately so only Primary speaks
        const challengerAgentId = activePanelAgents.find(a => !a.isPrimary)?.agentId;
        if (challengerAgentId) {
          addLog('System', 'Stopping Challenger agent for clean sign-off...');
          await fetch('/api/agora-mllm/stop-mllm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionInfo.sessionId, agent_id: challengerAgentId })
          });
          addLog('System', 'Challenger agent stopped.');
        }

        // Wait for Primary to finish speaking by polling volume levels
        addLog('System', 'Waiting for primary interviewer to finish speaking...');
        await waitForAgentSilence(9991, 6000);

        // Now stop the Primary agent
        const primaryAgentId = activePanelAgents.find(a => a.isPrimary)?.agentId;
        if (primaryAgentId) {
          await fetch('/api/agora-mllm/stop-mllm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionInfo.sessionId, agent_id: primaryAgentId })
          });
          addLog('System', 'Primary agent stopped.');
        }
      } else {
        // Single agent round (HR): wait for agent to finish speaking, then stop
        addLog('System', 'Waiting for interviewer to finish speaking...');
        const soloUid = activePanelAgents[0]?.agentUid || 9993;
        await waitForAgentSilence(soloUid, 6000);

        if (sessionInfo?.agentIds && sessionInfo.agentIds.length > 0) {
          await fetch('/api/agora-mllm/stop-mllm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionInfo.sessionId, agent_ids: sessionInfo.agentIds })
          });
          addLog('System', `Stopped ${sessionInfo.agentIds.length} agent(s).`);
        }
      }

      // ── Phase 3: RTC Cleanup (preserve transcript) ─────────────────────
      setTestState('STOPPING');
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
      if (localAudioTrackRef.current) {
        try { localAudioTrackRef.current.stop(); localAudioTrackRef.current.close(); } catch (e) {}
        localAudioTrackRef.current = null;
      }
      if (clientRef.current) {
        try { await clientRef.current.leave(); } catch (e) {}
      }
      remoteAudioTracksRef.current.clear();
      setSessionInfo(null);
      setActivePanelAgents([]);

      // ── Phase 4: Decision Gate (Evaluate Round) ────────────────────────
      setTestState('EVALUATING');
      addLog('Arbiter', 'Evaluating round evidence via Decision Gate...');
      
      const roundName = round.round_name;
      const roundTranscript = transcript.filter(t => (t as any).round === roundName);
      
      const evalRes = await fetch(`/api/interviews/${interviewId}/evaluate-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundName, transcript: roundTranscript, rubric: blueprint.rubric })
      });
      
      const evalData = await evalRes.json();
      if (!evalRes.ok) throw new Error(evalData.error || 'Evaluation failed');
      
      addLog('Arbiter', `Decision Gate: ${evalData.evaluation.decision} (Score: ${evalData.evaluation.score}/100)`);
      setTestState('DECISION_GATE');

      // ── Phase 5: Transition Logic (Supports Round 1 -> Round 2 -> Round 3) ──
      if (!isLastRound) {
        if (evalData.evaluation.decision === 'PASS' || currentRound === 0) {
          addLog('System', `Round ${currentRound + 1} Passed (Score: ${evalData.evaluation.score}/100). Transitioning to Round ${currentRound + 2} (${blueprint.interview_rounds[currentRound + 1]?.round_name})...`);

          // Transition state backend
          await fetch(`/api/interviews/${interviewId}/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: currentRound === 0 ? 'TRANSITION_TECHNICAL' : 'TRANSITION_HR',
              score: evalData.evaluation.score,
              decisionReason: evalData.evaluation.reason
            })
          }).catch(err => console.error('State transition error:', err));

          setTestState('ROUND_TRANSITION');
          setCurrentRound(prev => prev + 1);
        } else {
          // Round FAILED -> End process
          addLog('Decision Gate', `Round ${currentRound + 1} FAILED (Score: ${evalData.evaluation.score}/100). Ending interview process.`);
          setTestState('INTERVIEW_COMPLETE');
          
          try {
            await fetch(`/api/interviews/${interviewId}/evaluate-final`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transcript })
            });
          } catch (e) {
            console.error('Final evaluation post error:', e);
          }
          
          setTestState('ENDED');
        }
      } else {
        // Final round (HR or sole round) completed — synthesize final composite scorecard
        setTestState('INTERVIEW_COMPLETE');
        addLog('System', 'Interview panel concluded. Synthesizing final composite scorecard across all rounds...');
        
        try {
          await fetch(`/api/interviews/${interviewId}/evaluate-final`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript })
          });
        } catch (e) {
          console.error('Final evaluation post error:', e);
        }
        
        setTestState('ENDED');
      }

    } catch (e: any) {
      setTestState('ERROR');
      addLog('Error', `Round completion failed: ${e.message}`);
    }
  };

  /**
   * Polls the Agora volume-indicator to detect when a specific agent UID has stopped speaking.
   * Resolves when the agent's audio level stays below threshold for 3 consecutive checks,
   * or after maxWaitMs elapses (whichever comes first).
   */
  const waitForAgentSilence = (agentUid: number, maxWaitMs: number): Promise<void> => {
    return new Promise((resolve) => {
      let silentChecks = 0;
      const requiredSilentChecks = 3;
      const pollInterval = 500;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += pollInterval;
        
        // Check if the agent's remote audio track has low volume
        const track = remoteAudioTracksRef.current.get(agentUid);
        if (!track) {
          // Agent track already gone — treat as silent
          clearInterval(timer);
          resolve();
          return;
        }

        // Use the volume indicator state — if floorOwner is not this agent, they're silent
        const agentFloorMap: Record<number, string> = { 9991: 'PRIMARY_AI', 9992: 'CHALLENGER_AI', 9993: 'HR_AI', 9999: 'PRIMARY_AI' };
        const agentFloor = agentFloorMap[agentUid];
        
        if (floorOwner !== agentFloor) {
          silentChecks++;
        } else {
          silentChecks = 0; // Reset — agent is still speaking
        }

        if (silentChecks >= requiredSilentChecks || elapsed >= maxWaitMs) {
          clearInterval(timer);
          resolve();
        }
      }, pollInterval);
    });
  };

  const primaryAgent = activePanelAgents.find(a => a.isPrimary) || activePanelAgents[0];
  const challengerAgent = activePanelAgents.find(a => !a.isPrimary);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#202124] flex flex-col overflow-hidden text-white font-sans">
      <ProctorEngine 
        interviewId={interviewId} 
        isRunning={testState === 'RUNNING'} 
        candidateName={candidateName}
      />
      
      {/* Middle Section (Grid + Telemetry) */}
      <div className="flex-1 flex overflow-hidden relative p-4">
        
        {/* Main Content Area (Video Grid) */}
        <div className="flex-1 flex flex-col relative bg-transparent rounded-2xl overflow-hidden">
          
          {/* Top Panel Bar: Round Info (floating overlay - hidden during active workspace to prevent overlap) */}
          {!isRound1WorkspaceActive && (
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-none">
              <div className="flex items-center gap-2.5 flex-wrap pointer-events-auto">
                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Round {currentRound + 1}: {blueprint.interview_rounds[currentRound]?.round_name}</span>
                </div>

                {testState === 'RUNNING' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800/90 text-gray-300 font-mono text-xs border border-gray-700 shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    <span className="font-bold text-white">
                      {Math.floor(roundElapsedSeconds / 60)}:{String(roundElapsedSeconds % 60).padStart(2, '0')}
                    </span>
                    <span className="text-gray-500">/</span>
                    <span className="text-gray-400">
                      {Math.floor(ROUND_TARGET_SECONDS / 60)}:00
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium hidden sm:inline">Panel:</span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                  {currentRound === 0 ? '1 Coding Agent' : currentRound === 1 ? '2 Technical Agents' : '1 HR Agent'}
                </span>
              </div>
            </div>
          )}

          {/* Developer / Sandbox Testing Fast-Forward Toolbar */}
          {(interviewId.includes('demo') || (typeof window !== 'undefined' && window.location.pathname.includes('demo'))) && (
            <div className="absolute top-16 left-4 right-4 z-20 mt-3 mb-2 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in fade-in pointer-events-auto">
              <div className="flex items-center gap-2 text-purple-300">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                <span className="font-bold">DEV TEST CONTROLS // ISOLATED SANDBOX</span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {testState === 'RUNNING' && (
                  <>
                    <button
                      onClick={() => {
                        setRoundElapsedSeconds(ROUND_TARGET_SECONDS - 10);
                        setWrapUpWarning(true);
                        addLog('DevControl', '⏱️ Fast-forwarded timer to 4:50 wrap-up alert mark');
                      }}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                    >
                      ⏱️ Jump to 4:50 (Wrap-Up Notice)
                    </button>

                    <button
                      onClick={() => {
                        addLog('DevControl', '⏭️ Triggered immediate round conclusion & handoff');
                        finishRound('DEV_FAST_FORWARD');
                      }}
                      className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition cursor-pointer"
                    >
                      ⏭️ Advance Round Handoff
                    </button>
                  </>
                )}

                <Link
                  href="/admin/applications/demo-app-test"
                  target="_blank"
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex items-center gap-1"
                >
                  <span>📊 Admin Scorecard</span>
                  <span className="text-[10px]">↗</span>
                </Link>
              </div>
            </div>
          )}

          {isRound1WorkspaceActive && (testState === 'RUNNING' || testState === 'STARTING') ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-2 overflow-hidden h-full">
              {/* Workspace Column (Left 65%) */}
              <div className="flex-1 lg:w-[65%] h-full flex flex-col min-h-0">
                {/* Workspace Mode Switcher Header */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border border-gray-800 rounded-t-xl text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWorkspaceMode('coding')}
                      className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                        workspaceMode === 'coding' ? 'bg-blue-600 text-white' : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Coding / DSA (Monaco)</span>
                    </button>
                    <button
                      onClick={() => setWorkspaceMode('excalidraw')}
                      className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                        workspaceMode === 'excalidraw' ? 'bg-blue-600 text-white' : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>System Design (Excalidraw)</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded hidden sm:inline flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      AI Workspace Sync Active
                    </span>
                    <div className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>Round 1: Coding & System Design</span>
                    </div>
                    {testState === 'RUNNING' && (
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono text-xs border border-gray-700">
                        <Clock className="w-3 h-3 text-blue-400 animate-pulse" />
                        <span className="font-bold text-white">
                          {Math.floor(roundElapsedSeconds / 60)}:{String(roundElapsedSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Workspace */}
                <div className="flex-1 min-h-0">
                  {workspaceMode === 'coding' ? (
                    <CodingWorkspace
                      code={code}
                      setCode={setCode}
                      language={language}
                      setLanguage={setLanguage}
                      onRunCode={handleCodeExecution}
                      onSubmit={() => finishRound('CANDIDATE_SUBMITTED_ROUND_1')}
                      problem={blueprint.interview_rounds[0]?.coding_problem || {
                        title: "1. High-Throughput Rate Limiter & Event Throttler",
                        difficulty: "Medium",
                        description: "Implement a sliding window rate limiter class that tracks incoming user requests and enforces a maximum threshold of requests per sliding window in TypeScript or Python. The implementation must support high concurrency and handle edge cases where multiple requests arrive at identical millisecond timestamps.",
                        constraints: [
                          "allowRequest(userId, timestampMs) should run in O(1) or O(log N) average time complexity.",
                          "Space complexity should scale with the number of unique active user IDs.",
                          "Handle concurrent burst traffic and sliding window cleanup cleanly."
                        ]
                      }}
                    />
                  ) : (
                    <SystemDesignWorkspace
                      diagramElements={diagramElements}
                      setDiagramElements={setDiagramElements}
                      onSubmit={() => finishRound('CANDIDATE_SUBMITTED_ROUND_1')}
                    />
                  )}
                </div>
              </div>

              {/* Video Grid Column (Right 35%) */}
              <div className="w-full lg:w-[35%] h-full flex flex-col min-h-0">
                <AgentPanel
                  testState={testState}
                  wrapUpWarning={wrapUpWarning}
                  activePanelAgents={activePanelAgents}
                  floorOwner={floorOwner}
                  primaryAgent={primaryAgent}
                  challengerAgent={challengerAgent}
                  currentRound={currentRound}
                  blueprint={blueprint}
                  pendingFloorNotice={pendingFloorNotice}
                  interviewId={interviewId}
                  micVolume={micVolume}
                  finishRound={finishRound}
                  localVideoRef={localVideoRef}
                  candidateName={candidateName}
                  localStream={localStream}
                  isVideoOff={isVideoOff}
                  toggleCamera={toggleCamera}
                  isMuted={isMuted}
                  toggleMute={toggleMute}
                  isDeafened={isDeafened}
                  toggleDeafen={toggleDeafen}
                />
              </div>
            </div>
          ) : (
            <AgentPanel
              testState={testState}
              wrapUpWarning={wrapUpWarning}
              activePanelAgents={activePanelAgents}
              floorOwner={floorOwner}
              primaryAgent={primaryAgent}
              challengerAgent={challengerAgent}
              currentRound={currentRound}
              blueprint={blueprint}
              pendingFloorNotice={pendingFloorNotice}
              interviewId={interviewId}
              micVolume={micVolume}
              finishRound={finishRound}
              localVideoRef={localVideoRef}
              candidateName={candidateName}
              localStream={localStream}
              isVideoOff={isVideoOff}
              toggleCamera={toggleCamera}
              isMuted={isMuted}
              toggleMute={toggleMute}
              isDeafened={isDeafened}
              toggleDeafen={toggleDeafen}
            />
          )}
        </div>

        {/* Pre-start Round Banner with Mandatory Hardware Verification */}
        {testState === 'IDLE' && (
          <div className="absolute inset-0 bg-[#202124]/95 backdrop-blur-md z-30 flex items-center justify-center p-6">
            <div className="bg-[#2b2d31] p-6 sm:p-8 rounded-3xl text-center shadow-2xl max-w-md w-full border border-gray-700/50">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-medium text-xs mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Round {currentRound + 1} of {blueprint.interview_rounds.length} • Readiness Check</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-normal text-white mb-1">{blueprint.interview_rounds[currentRound]?.round_name}</h3>
              <p className="text-gray-400 text-xs mb-6 leading-relaxed">{blueprint.interview_rounds[currentRound]?.purpose}</p>

              {/* Hardware Device Checklist */}
              <div className="bg-[#1e2023] rounded-2xl p-4 mb-6 border border-gray-800 text-left space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1">Hardware & Permission Verification</span>
                
                {/* Camera Check */}
                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#2b2d31] border border-gray-700/40">
                  <div className="flex items-center gap-2.5 text-white">
                    <Video className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Camera</span>
                  </div>
                  {deviceCheckStatus.camera === 'checking' && <span className="text-amber-400 animate-pulse font-mono text-[11px]">Checking...</span>}
                  {deviceCheckStatus.camera === 'active' && <span className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Ready</span>}
                  {deviceCheckStatus.camera === 'blocked' && <span className="text-rose-400 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Blocked / Off</span>}
                </div>

                {/* Mic Check */}
                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#2b2d31] border border-gray-700/40">
                  <div className="flex items-center gap-2.5 text-white">
                    <Mic className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Microphone</span>
                  </div>
                  {deviceCheckStatus.mic === 'checking' && <span className="text-amber-400 animate-pulse font-mono text-[11px]">Checking...</span>}
                  {deviceCheckStatus.mic === 'active' && <span className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Ready</span>}
                  {deviceCheckStatus.mic === 'blocked' && <span className="text-rose-400 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Blocked / Off</span>}
                </div>

                {/* Error Banner if blocked */}
                {(deviceCheckStatus.camera === 'blocked' || deviceCheckStatus.mic === 'blocked') && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-300 text-xs text-left space-y-2">
                    <p className="leading-normal">{deviceCheckStatus.errorMsg || 'Camera and Microphone permissions are required to join the meeting.'}</p>
                    <button 
                      onClick={checkDevices}
                      className="text-[11px] font-medium text-rose-200 underline hover:text-white transition cursor-pointer"
                    >
                      ↻ Retry Device Check
                    </button>
                  </div>
                )}
              </div>

              {/* Join Button (Gated by hardware verification) */}
              <button 
                onClick={() => startTest()} 
                disabled={deviceCheckStatus.camera !== 'active' || deviceCheckStatus.mic !== 'active'}
                className={`w-full py-3.5 font-medium text-sm rounded-full shadow-lg transition-all flex items-center justify-center gap-2 ${
                  deviceCheckStatus.camera === 'active' && deviceCheckStatus.mic === 'active'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                {deviceCheckStatus.camera === 'active' && deviceCheckStatus.mic === 'active' ? (
                  <>
                    <span>Join meeting now</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                ) : (
                  <span>Camera & Mic required to join</span>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Drawer: Collapsible SystemTelemetry */}
      <div className={`transition-all duration-300 ease-in-out bg-[#1e1e1e] border-t border-gray-800 ${isTelemetryOpen ? 'h-64 opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
        <SystemTelemetry logs={logs} />
      </div>

      {/* Bottom Control Bar */}
      <div className="h-[80px] bg-[#202124] border-t border-gray-800 flex items-center justify-between px-6 shrink-0 relative z-40">
         <div className="text-white text-base font-medium flex items-center gap-4 w-1/3">
            {testState === 'RUNNING' && (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                {Math.floor(roundElapsedSeconds / 60)}:{String(roundElapsedSeconds % 60).padStart(2, '0')}
              </span>
            )}
            <span className="text-gray-400 border-l border-gray-700 pl-4 hidden sm:block">Nexora Interview Panel</span>
         </div>
         
         <div className="flex items-center justify-center gap-3 w-1/3">
            <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isMuted ? 'bg-[#ea4335] hover:bg-[#d93025] text-white shadow-[0_0_15px_rgba(234,67,53,0.4)]' : 'bg-[#3c4043] hover:bg-[#4d5156] text-white'}`}>
               {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button onClick={toggleDeafen} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isDeafened ? 'bg-[#ea4335] hover:bg-[#d93025] text-white shadow-[0_0_15px_rgba(234,67,53,0.4)]' : 'bg-[#3c4043] hover:bg-[#4d5156] text-white'}`}>
               {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button onClick={() => finishRound('USER_ENDED')} className="px-6 h-12 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-[0_0_15px_rgba(234,67,53,0.4)]">
               End meeting
            </button>
         </div>

         <div className="flex items-center justify-end gap-3 w-1/3">
            <button onClick={() => setIsTelemetryOpen(!isTelemetryOpen)} className={`px-4 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer gap-2 ${isTelemetryOpen ? 'bg-blue-200 text-blue-900' : 'bg-transparent hover:bg-gray-800 text-white'}`} title="Show system logs">
               {isTelemetryOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
               <span className="text-sm font-medium">Logs</span>
            </button>
         </div>
      </div>
    </div>
  );
}

