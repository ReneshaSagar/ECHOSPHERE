"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProctorEngine from './ProctorEngine';
import { injectKnowledgeBaseIntoAgentInstructions } from '@/lib/enrichment/knowledgeBase';
import { isClosingUtterance } from '@/lib/interview/interviewState';
import { getGenderAwareVoice } from '@/lib/interview/interviewerPool';
import { Users, Shield, Zap, Sparkles, Mic, MicOff, Volume2, VolumeX, UserCheck, AlertCircle, Clock, ChevronUp, ChevronDown, Video, VideoOff, ArrowRight, CheckCircle, Code2, Layers, PhoneOff } from 'lucide-react';
import ParticleTalkingOrb from '@/components/room/ParticleTalkingOrb';
import AgentPanel from './components/AgentPanel';
import SystemTelemetry from './components/SystemTelemetry';
import CodingWorkspace from '@/components/workspace/CodingWorkspace';
import SystemDesignWorkspace from '@/components/workspace/SystemDesignWorkspace';
import { useWorkStateInterpreter } from '@/hooks/useWorkStateInterpreter';
import { WorkStateEvent, serializeDiagramElements } from '@/lib/interview/workStateInterpreter';

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
  const currentRoundRef = useRef(0);
  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);
  const isFinishingRoundRef = useRef<boolean>(false);
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
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const isDeafenedRef = useRef(false);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  // Round 1 Interactive Workspace State & Interpreter
  const [workspaceMode, setWorkspaceMode] = useState<'coding' | 'excalidraw'>('coding');

  const currentRoundData = blueprint.interview_rounds[currentRound];
  const isRound1WorkspaceActive = currentRoundData?.round_type === 'coding' || currentRoundData?.round_type === 'system_design';

  const dataStreamIdRef = useRef<number | null>(null);
  const codeRef = useRef<string>('');
  const languageRef = useRef<string>('typescript');
  const diagramElementsRef = useRef<any[]>([]);

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
    const currentDiagramElements = event.metadata?.elements || diagramElementsRef.current || [];
    const diagramSummary = serializeDiagramElements(currentDiagramElements);

    // 1. Broadcast Workspace Event to AI Agent via Agora RTC Data Stream
    if (clientRef.current && (clientRef.current as any).connectionState === 'CONNECTED') {
      try {
        let formattedText = '';
        if (event.source === 'excalidraw') {
          formattedText = `[SILENT CONTEXT ONLY - DO NOT READ ALOUD - INTERVIEWER OBSERVATION: Candidate workspace activity (whiteboard): ${event.summary}\n\nCandidate Current Whiteboard Architecture Diagram:\n${diagramSummary}]`;
        } else {
          const fullCode = currentCode ? currentCode.slice(0, 1200) : (event.metadata?.code || '');
          formattedText = `[SILENT CONTEXT ONLY - DO NOT READ ALOUD - INTERVIEWER OBSERVATION: Candidate workspace activity (coding): ${event.summary}${fullCode ? `\n\nCandidate Current IDE Source Code (${currentLang}):\n\`\`\`${currentLang}\n${fullCode}\n\`\`\`` : ''}]`;
        }

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
        metadata: {
          ...(event.metadata || {}),
          code: event.source === 'coding' ? (currentCode ? currentCode.slice(0, 1200) : '') : '',
          language: currentLang,
          diagramSummary: event.source === 'excalidraw' ? diagramSummary : ''
        },
        timestamp: Date.now()
      })
    }).catch(err => console.warn('[WorkspaceSync] Backend sync error:', err));
  };

  const lastExecutionResultRef = useRef<{ success: boolean; output: string } | null>(null);

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

  const onWorkspaceCodeRun = (success: boolean, output: string) => {
    lastExecutionResultRef.current = { success, output };
    handleCodeExecution(success, output);
  };

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    diagramElementsRef.current = diagramElements;
  }, [diagramElements]);

  // Switch Workspace View & Notify AI Agent with Current Workspace State
  const switchWorkspaceMode = (newMode: 'coding' | 'excalidraw') => {
    if (newMode === workspaceMode) return;
    setWorkspaceMode(newMode);
    addLog('Workspace', `Switched active workspace to ${newMode === 'coding' ? 'Coding IDE (Monaco)' : 'System Design Whiteboard (Excalidraw)'}`);

    const activeAgent = activePanelAgentsRef.current[0];
    const modeLabel = newMode === 'coding' ? 'Coding / DSA (Monaco Code Editor)' : 'System Design (Excalidraw Whiteboard)';
    const snapshotDetails = newMode === 'coding'
      ? (codeRef.current ? `Current Code (${languageRef.current}):\n\`\`\`${languageRef.current}\n${codeRef.current.slice(0, 800)}\n\`\`\`` : 'Editor is currently empty.')
      : serializeDiagramElements(diagramElementsRef.current);

    const broadcastText = `[SYSTEM WORKSPACE NOTICE] Candidate has switched their active view to: ${modeLabel}.\n\nLive Snapshot:\n${snapshotDetails}`;

    if (clientRef.current && (clientRef.current as any).connectionState === 'CONNECTED') {
      try {
        const payload = new TextEncoder().encode(JSON.stringify({
          text: broadcastText,
          is_final: true,
          uid: candidateUidRef.current
        }));
        if (dataStreamIdRef.current !== null) {
          (clientRef.current as any).sendStreamMessage(dataStreamIdRef.current, payload);
        }
      } catch (e) {}
    }

    fetch('/api/agora-mllm/workspace-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: interviewId,
        candidate_uid: candidateUidRef.current,
        agent_uid: activeAgent?.agentUid || 9993,
        agent_id: activeAgent?.agentId || '',
        event_type: 'WORKSPACE_MODE_SWITCH',
        summary: `Switched view to ${modeLabel}`,
        source: newMode,
        metadata: {
          code: newMode === 'coding' ? (codeRef.current ? codeRef.current.slice(0, 1200) : '') : '',
          language: languageRef.current,
          diagramSummary: newMode === 'excalidraw' ? serializeDiagramElements(diagramElementsRef.current) : ''
        },
        timestamp: Date.now()
      })
    }).catch(err => console.warn('[WorkspaceSync] Mode switch sync error:', err));
  };

  // Periodic Live Stream Sync to Gemini Agent (Both Code and Whiteboard)
  const lastSyncedCodeRef = useRef<string>('');
  const lastSyncedDiagramRef = useRef<string>('');
  useEffect(() => {
    if (testState !== 'RUNNING' || !isRound1WorkspaceActive) return;

    const syncInterval = setInterval(() => {
      const activeAgent = activePanelAgentsRef.current[0];

      if (workspaceMode === 'coding' && code) {
        if (code === lastSyncedCodeRef.current) return;
        lastSyncedCodeRef.current = code;

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
              source: 'coding',
              metadata: { code: code.slice(0, 1200), language },
              timestamp: Date.now()
            })
          }).catch(err => console.warn('[WorkspaceSync] Code snapshot sync error:', err));
        }
      } else if (workspaceMode === 'excalidraw' && diagramElements && diagramElements.length > 0) {
        const currentDiagramSummary = serializeDiagramElements(diagramElements);
        if (currentDiagramSummary === lastSyncedDiagramRef.current) return;
        lastSyncedDiagramRef.current = currentDiagramSummary;

        // 1. Broadcast via Agora RTC Data Stream
        if (clientRef.current && (clientRef.current as any).connectionState === 'CONNECTED') {
          try {
            const payloadText = `[SYSTEM LIVE WHITEBOARD SNAPSHOT] Candidate current whiteboard architecture diagram:\n${currentDiagramSummary}`;
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
              summary: 'Live Whiteboard snapshot update',
              source: 'excalidraw',
              metadata: { diagramSummary: currentDiagramSummary },
              timestamp: Date.now()
            })
          }).catch(err => console.warn('[WorkspaceSync] Diagram snapshot sync error:', err));
        }
      }
    }, 3500);

    return () => clearInterval(syncInterval);
  }, [testState, isRound1WorkspaceActive, workspaceMode, code, language, diagramElements, interviewId]);

  const [deviceCheckStatus, setDeviceCheckStatus] = useState<{
    camera: 'checking' | 'active' | 'blocked';
    mic: 'checking' | 'active' | 'blocked';
    errorMsg?: string;
  }>({
    camera: 'checking',
    mic: 'checking'
  });

  const stopAllMediaTracks = useCallback(() => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
        localStreamRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
      }
      setLocalStream(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn('[InterviewRoom] Error stopping media tracks:', e);
    }
  }, [localStream]);

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
        localStreamRef.current = stream;
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

    const handleBeforeUnload = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch (e) {}
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch (e) {}
        });
        localStreamRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronize localStream with localVideoRef whenever either changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, testState]);

  // Live Audio Level Analyzer for Pre-Flight / Green Room
  useEffect(() => {
    if (!localStream || testState === 'RUNNING') return;

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let audioContext: AudioContext | null = null;
    let rafId: number | null = null;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(localStream);
      microphone.connect(analyser);

      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let smoothedVolume = 0;

      const checkVolume = () => {
        if (isMuted) {
          setMicVolume(0);
          rafId = requestAnimationFrame(checkVolume);
          return;
        }

        analyser.getByteTimeDomainData(dataArray);
        let max = 0;
        for (let i = 0; i < analyser.frequencyBinCount; i++) {
          const val = Math.abs(dataArray[i] - 128);
          if (val > max) max = val;
        }

        // Scale so normal speaking registers nicely (0-100)
        const currentVol = Math.min(100, (max / 45) * 100);
        if (currentVol > smoothedVolume) {
          smoothedVolume = currentVol;
        } else {
          smoothedVolume = smoothedVolume * 0.82 + currentVol * 0.18;
        }

        setMicVolume(Math.round(smoothedVolume));
        rafId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('[AudioContext] Green room mic analyzer initialization warning:', err);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [localStream, testState, isMuted]);

  const [isVideoOff, setIsVideoOff] = useState(false);

  const toggleCamera = () => {
    const nextState = !isVideoOff;
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !nextState;
      });
    }
    setIsVideoOff(nextState);
    if (!nextState && localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    // Standard stream
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
    // Agora track - use setEnabled consistently to prevent setEnabled/setMuted collisions
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.setEnabled(!nextMuted);
      } catch (e) {}
    }
    setIsMuted(nextMuted);
    if (nextMuted) setMicVolume(0);
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

  // Round Timer & Criteria Progression (5 mins for coding/tech, 3 mins for HR)
  const currentRoundType = blueprint.interview_rounds[currentRound]?.round_type;
  const ROUND_TARGET_SECONDS = currentRoundType === 'hr' ? 180 : 300;

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
        if (interviewId === 'demo-interview-test' || (typeof window !== 'undefined' && window.location.pathname.includes('interview-test'))) {
          router.push('/interview-test-result');
        } else {
          router.push(`/interview/${interviewId}/completed`);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [testState, interviewId, router]);

  // Auto-start next round after ROUND_TRANSITION
  useEffect(() => {
    if (testState === 'ROUND_TRANSITION') {
      const nextRoundIdx = currentRound;
      const totalRounds = blueprint.interview_rounds.length;

      if (nextRoundIdx >= totalRounds) {
        // Out of bounds - finalize interview immediately
        setTestState('INTERVIEW_COMPLETE');
        fetch(`/api/interviews/${interviewId}/evaluate-final`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        }).finally(() => {
          setTestState('ENDED');
        });
        return;
      }

      const nextRoundObj = blueprint.interview_rounds[nextRoundIdx];
      const timer = setTimeout(() => {
        addLog('System', `Auto-starting Round ${nextRoundIdx + 1} of ${totalRounds} (${nextRoundObj?.round_name || 'Technical Round'})...`);
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
  const introPhaseRef = useRef<'SOLO_GREETING' | 'PRIMARY_GREETING' | 'CHALLENGER_GREETING' | 'INTERVIEW_RUNNING'>('SOLO_GREETING');
  const challengerSpawnedRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const isAiSpeakingRef = useRef<boolean>(false);
  const challengerIntroTextRef = useRef<string>('');
  const primaryIntroTextRef = useRef<string>('');
  const introTimerRef = useRef<any>(null);
  const primaryIntroFinishedRef = useRef<boolean>(false);
  const challengerIntroFinishedRef = useRef<boolean>(false);
  const soloHasSpokenRef = useRef<boolean>(false);
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
    if (!utterance || utterance.length < 6 || isProcessingUtteranceRef.current || introPhaseRef.current !== 'INTERVIEW_RUNNING') return;
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
    if (isStartingRef.current || testStateRef.current === 'RUNNING' || testStateRef.current === 'STARTING') return;
    
    const totalRounds = blueprint.interview_rounds.length;
    const targetRound = roundIdx !== undefined ? roundIdx : currentRoundRef.current;
    
    if (targetRound >= totalRounds) {
      // Out of bounds - interview is fully concluded
      setTestState('INTERVIEW_COMPLETE');
      try {
        await fetch(`/api/interviews/${interviewId}/evaluate-final`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        });
      } catch (e) {}
      setTestState('ENDED');
      return;
    }

    isStartingRef.current = true;
    isFinishingRoundRef.current = false;
    setTestState('STARTING');
    setLogs([]);
    autoFinishTriggeredRef.current = false;
    currentFloorRef.current = 'PRIMARY_AI';
    
    const round = blueprint.interview_rounds[targetRound];
    const isTechnicalRound = round.round_type === 'technical';
    const roundInterviewers: InterviewerInfo[] = round.interviewers && round.interviewers.length > 0
      ? round.interviewers
      : [round.interviewer];
    const isMultiAgentPanel = isTechnicalRound && roundInterviewers.length >= 2;

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

      if (isMultiAgentPanel) {
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

        // 1. Spawn Primary Agent (UID 9991)
        const primaryVoice = getGenderAwareVoice(primary.name, primary.voice);
        addLog('Backend', `Spawning Primary Interviewer (${primary.name}, Voice: ${primaryVoice})...`);
        const primaryRes = await fetch(`/api/agora-mllm/start-dynamic-mllm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            session_id: sessionId, 
            candidate_uid: candidateUid,
            agent_uid: primary.agent_uid || 9991,
            voice: primaryVoice,
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
          voice: primaryVoice,
          color: primary.color || '#3B82F6',
          isPrimary: true,
          hasFloor: true,
          intervening: false
        });

        // 2. Register Challenger Agent (UID 9992) into active panel
        const challengerVoice = getGenderAwareVoice(challenger.name, challenger.voice);
        runningAgents.push({
          agentId: 'pending_mllm_init',
          agentUid: challenger.agent_uid || 9992,
          name: challenger.name,
          role: challenger.role,
          voice: challengerVoice,
          color: challenger.color || '#8B5CF6',
          isPrimary: false,
          hasFloor: false,
          intervening: false
        });

      } else {
        // Single Agent Round (Round 1 Coding/System Design OR Round 3 HR)
        const solo = roundInterviewers[0];
        const isHrRound = round.round_type === 'hr' || 
          Boolean(round.round_name && (round.round_name.toLowerCase().includes('hr') || round.round_name.toLowerCase().includes('culture') || round.round_name.toLowerCase().includes('leadership') || round.round_name.toLowerCase().includes('behavioral'))) ||
          targetRound === 2;

        addLog('Orchestrator', `Starting Single Agent Round: ${solo.name} (${isHrRound ? 'HR & Culture' : 'Coding Workspace'})`);

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
- YOU HAVE DIRECT REAL-TIME VISIBILITY INTO BOTH THE CANDIDATE'S IDE (CODE EDITOR) AND WHITEBOARD (EXCALIDRAW SYSTEM DESIGN CANVAS). You continuously receive live telemetry containing the exact code typed and the architecture diagram elements drawn by ${candidateName}.
- When ${candidateName} asks "what do you see on my screen?", "read my code", "can you see my diagram?", or "what have I drawn so far?", YOU MUST DIRECTLY QUOTE AND EXPLAIN:
  * If they are on the Code Editor: Quote and discuss their exact source code constructs, algorithms, and line logic from the latest code snapshot.
  * If they are on the System Design Whiteboard: Quote their exact whiteboard components (e.g. API Gateway, Message Queue, Cache, Database, Worker services) and discuss their data flows, scaling, and architectural trade-offs.
  * NEVER claim you cannot see their screen or canvas. You have full real-time visual telemetry.
- CRITICAL INVARIANT: NEVER read system observations, bracketed cues, stuck signals, or "[SYSTEM WORKSPACE OBSERVATION]" out loud. System observations are silent background telemetry for your awareness only. If ${candidateName} has paused typing or drawing, ask naturally in your own human voice: "${candidateName}, how is your approach shaping up? Feel free to talk through your initial thoughts." NEVER say "the candidate hasn't written anything in 20 seconds" or quote system instructions.
- DO NOT ask general conceptual technical interview questions (e.g. "What is binary search?", "What is garbage collection?", "Explain dependency injection"). Conceptual technical interview questions will be covered separately in Round 2 (Technical Panel).
- Your 100% EXCLUSIVE focus in Round 1 is presenting, observing, and evaluating ${candidateName}'s progress on the assigned workspace problems ("${codingProb.title}" and "${systemProb.title}").
- Keep all spoken responses concise (1-3 sentences maximum) so the candidate can focus on coding, designing, and explaining their work.
================================================================================
`;
          if (!greetingMsg || greetingMsg.length < 10) {
            greetingMsg = `Hello ${candidateName}, welcome! I'm ${solo.name}, ${solo.role}. In this first round, we will focus on practical problem solving in your workspace. You have access to both a Coding IDE and a System Design whiteboard. Your assigned coding problem is '${codingProb.title}'. Take a look at the workspace, and walk me through your initial thoughts when you're ready!`;
          }
        } else if (isHrRound) {
          const ts = technicalSummaryRef.current;
          const techNotes = ts ? ` Technical Panel Score: ${ts.score}/100. Notes: "${ts.reason}".` : '';

          contextPreamble = `
================================================================================
ROUND 3: HR, CULTURE & ENGINEERING LEADERSHIP PROTOCOL (STRICTLY NON-TECHNICAL)
================================================================================
You are "${solo.name}" (${solo.role}) at Plantra Labs, conducting Round 3 (HR, Culture & Engineering Leadership) with "${candidateName}" for the position of ${jobTitle || 'Engineer'}.${techNotes}

CRITICAL RULES & SCOPE:
1. STRICT NON-TECHNICAL INVARIANT:
   - This is strictly an HR and behavioral evaluation. All technical coding and architecture rounds are ALREADY FINISHED and graded.
   - DO NOT ask technical coding, system design, algorithm, concurrency, database indexing, or syntax questions.
   - DO NOT test technical trivia or quiz the candidate on technical concepts.
   - If ${candidateName} brings up a past engineering project, focus ONLY on the team dynamics, personal ownership, managing deadlines, handling trade-offs, and communication with stakeholders—NOT the low-level code implementation.

2. CORE EVALUATION PILLARS (Use the STAR Method: Situation, Task, Action, Result):
   - Engineering Ownership & Accountability: Taking responsibility when production bugs or outages occur, delivering under pressure, learning from mistakes.
   - Constructive Conflict & Collaboration: Navigating disagreements on architecture or priorities with peers, product managers, or tech leads.
   - Mentorship & Knowledge Sharing: Helping teammates grow, conducting constructive code reviews.
   - Adaptability & Work Values: Dealing with shifting requirements, ambiguity, and why they want to join Plantra Labs.

3. CONVERSATIONAL STYLE:
   - Warm, welcoming, insightful, and professional.
   - Ask ONE question at a time and listen patiently to the candidate's answer.
   - Keep your turns concise (1-3 sentences).
================================================================================
`;
          if (!greetingMsg || greetingMsg.length < 10) {
            greetingMsg = `Hello ${candidateName}, welcome to Round 3! I'm ${solo.name}, ${solo.role} at Plantra Labs. The team shared great notes from the technical rounds. In this final section, we'll focus on your engineering ownership, how you collaborate with teammates, and your career goals. To start off: could you share a time when you had to take ownership of a tough engineering challenge or production issue and how you handled it?`;
          }
        }

        const soloVoice = getGenderAwareVoice(solo.name, solo.voice);
        const soloInstructions = injectKnowledgeBaseIntoAgentInstructions(
          (solo.instructions || '') + contextPreamble,
          candidateContext,
          candidateName,
          jobTitle || 'Engineering Role',
          resumeText,
          isHrRound
        );

        const soloRes = await fetch(`/api/agora-mllm/start-dynamic-mllm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            session_id: sessionId, 
            candidate_uid: candidateUid,
            agent_uid: solo.agent_uid || 9993,
            voice: soloVoice,
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
          voice: soloVoice,
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
      const activateCandidateFloor = (reason: string) => {
        if (introPhaseRef.current === 'INTERVIEW_RUNNING' || testStateRef.current !== 'RUNNING') return;
        introPhaseRef.current = 'INTERVIEW_RUNNING';
        if (introTimerRef.current) {
          clearTimeout(introTimerRef.current);
          introTimerRef.current = null;
        }

        const primaryInfo = runningAgents.find(a => a.isPrimary) || runningAgents[0];
        
        // Floor awarded strictly to Primary Lead / Solo Interviewer
        if (runningAgents.length >= 2) {
          remoteAudioTracksRef.current.get(9991)?.setVolume(100);
          remoteAudioTracksRef.current.get(9992)?.setVolume(0);
        } else {
          remoteAudioTracksRef.current.get(primaryInfo?.agentUid || 9991)?.setVolume(100);
        }

        setFloorOwner('PRIMARY_AI');
        currentFloorRef.current = 'PRIMARY_AI';

        setActivePanelAgents(prev => prev.map(a => ({
          ...a,
          hasFloor: a.isPrimary,
          intervening: false
        })));

        // Unmute candidate local audio track so candidate can speak
        if (localAudioTrackRef.current) {
          try { localAudioTrackRef.current.setEnabled(!isMuted); } catch (e) {}
        }

        // Activate echo-gated candidate speech recognition
        setupSpeechRecognition();
        addLog('Turn Arbiter', `Introduction concluded (${reason}). Floor active for candidate.`);
      };

      const triggerChallengerIntro = async () => {
        if (challengerSpawnedRef.current || introPhaseRef.current !== 'PRIMARY_GREETING' || testStateRef.current !== 'RUNNING') return;
        challengerSpawnedRef.current = true;
        introPhaseRef.current = 'CHALLENGER_GREETING';
        challengerIntroTextRef.current = '';

        const challengerInfo = runningAgents.find(a => !a.isPrimary) || runningAgents[1];
        const primaryInfo = runningAgents.find(a => a.isPrimary) || runningAgents[0];
        const challengerGreetingText = (roundInterviewers[1] as any)?.greeting_message || 
          `Hi ${candidateName}, great to meet you! As ${primaryInfo?.name || 'Priya'} mentioned, I focus on distributed architecture, failure resilience, and scaling limits here at Plantra. Back to you ${primaryInfo?.name || 'Priya'}, let's dive into the questions!`;

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

            // Safety timeout: if Challenger greeting is not marked is_final in 12 seconds, yield floor
            setTimeout(() => {
              if (introPhaseRef.current === 'CHALLENGER_GREETING' && testStateRef.current === 'RUNNING') {
                activateCandidateFloor('Challenger intro window elapsed');
              }
            }, 12000);
          } else {
            activateCandidateFloor('Challenger spawn fallback');
          }
        } catch (err: any) {
          console.warn('Error starting challenger agent for intro:', err);
          activateCandidateFloor('Challenger spawn error fallback');
        }
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
        const candEntry = volumes.find(v => v.uid === candidateUid || v.uid === 0 || Number(v.uid) === candidateUidRef.current);
        const candVol = candEntry?.level || 0;
        setMicVolume(candVol);

        let primarySpeaking = false;
        let challengerSpeaking = false;
        let hrSpeaking = false;
        let candidateSpeaking = candVol > 12;

        volumes.forEach((vol) => {
          const numUid = Number(vol.uid);
          if (numUid === candidateUid || numUid === 0 || numUid === candidateUidRef.current) return;
          if ((numUid === 9991 || numUid === 9999) && vol.level > 10) primarySpeaking = true;
          if (numUid === 9992 && vol.level > 10) challengerSpeaking = true;
          if (numUid === 9993 && vol.level > 10) hrSpeaking = true;
          // Also check any registered active panel agent
          const isAgent = runningAgentsRef.current.some(a => a.agentUid === numUid);
          if (isAgent && vol.level > 10) {
            primarySpeaking = true;
          }
        });

        primarySpeakingRef.current = primarySpeaking;
        challengerSpeakingRef.current = challengerSpeaking;
        isAiSpeakingRef.current = primarySpeaking || challengerSpeaking || hrSpeaking;

        // Intro Phase 0: Solo Greeting (Round 1 Coding or Round 3 HR)
        if (introPhaseRef.current === 'SOLO_GREETING') {
          const soloSpeaking = primarySpeaking || hrSpeaking;
          if (soloSpeaking) {
            soloHasSpokenRef.current = true;
          }
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : (soloSpeaking ? 'PRIMARY_AI' : 'NONE'));

          // Only advance when solo interviewer has spoken and then paused for 1.8s
          if (soloHasSpokenRef.current && !soloSpeaking) {
            if (!introTimerRef.current) {
              introTimerRef.current = setTimeout(() => {
                activateCandidateFloor('Solo interviewer greeting finished');
              }, 1800);
            }
          } else if (soloSpeaking && introTimerRef.current) {
            clearTimeout(introTimerRef.current);
            introTimerRef.current = null;
          }
          return;
        }

        // Intro Phase 1: Primary Greeting (Round 2 Multi-Agent)
        if (introPhaseRef.current === 'PRIMARY_GREETING') {
          remoteAudioTracksRef.current.get(9991)?.setVolume(100);
          remoteAudioTracksRef.current.get(9992)?.setVolume(0);
          if (primarySpeaking) {
            soloHasSpokenRef.current = true;
          }
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : (primarySpeaking ? 'PRIMARY_AI' : 'NONE'));

          // Only advance when Primary's greeting is finished AND Primary has stopped speaking (1800ms silence verification)
          if ((primaryIntroFinishedRef.current || soloHasSpokenRef.current) && !primarySpeaking && !challengerSpawnedRef.current) {
            if (!introTimerRef.current) {
              introTimerRef.current = setTimeout(() => {
                triggerChallengerIntro();
              }, 1800);
            }
          } else if (primarySpeaking && introTimerRef.current) {
            // Primary is still speaking or continuing her thought — cancel timer!
            clearTimeout(introTimerRef.current);
            introTimerRef.current = null;
          }
          return;
        }

        // Intro Phase 2: Challenger Greeting (Round 2 Multi-Agent)
        if (introPhaseRef.current === 'CHALLENGER_GREETING') {
          remoteAudioTracksRef.current.get(9992)?.setVolume(100);
          remoteAudioTracksRef.current.get(9991)?.setVolume(0);
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : (challengerSpeaking ? 'CHALLENGER_AI' : 'NONE'));

          // Only yield floor when Challenger greeting text is finished AND Challenger has stopped speaking
          if ((challengerIntroFinishedRef.current || challengerSpeakingRef.current) && !challengerSpeaking) {
            if (!introTimerRef.current) {
              introTimerRef.current = setTimeout(() => {
                activateCandidateFloor('Specialist introduction complete');
              }, 1800);
            }
          } else if (challengerSpeaking && introTimerRef.current) {
            clearTimeout(introTimerRef.current);
            introTimerRef.current = null;
          }
          return;
        }

        // INTERVIEW_RUNNING Phase: Single-Agent vs Peer Multi-Agent Turn Arbitration
        const isMultiAgent = runningAgentsRef.current.length >= 2;
        if (!isMultiAgent) {
          // Single-Agent Round (Round 1 Workspace or Round 3 HR): Solo interviewer is ALWAYS 100% audible
          const soloAgent = runningAgentsRef.current[0];
          if (soloAgent) {
            remoteAudioTracksRef.current.get(soloAgent.agentUid)?.setVolume(100);
          }
          const soloSpeaking = primarySpeaking || hrSpeaking;
          setFloorOwner(candidateSpeaking ? 'CANDIDATE' : (soloSpeaking ? 'PRIMARY_AI' : 'NONE'));
          return; // Strict early return for single-agent rounds — Round 2 multi-agent code below is untouched!
        }

        // ── STRICT FLOOR GATING (One-Speaker Invariant for Round 2 Multi-Agent) ──────────────────────────
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
      if (isMultiAgentPanel) {
        // During initial greeting phase in Multi-Agent panel (Round 2), keep local audio muted to eliminate speaker-to-mic bleed
        localAudioTrackRef.current.setEnabled(false);
        await clientRef.current.publish([localAudioTrackRef.current]);
        addLog('RTC', 'Local microphone published (Echo-gated during panel introduction).');
      } else {
        // Single-Agent (Round 1 Workspace & Round 3 HR): Enable mic immediately so candidate can speak freely
        await localAudioTrackRef.current.setEnabled(!isMuted);
        await clientRef.current.publish([localAudioTrackRef.current]);
        addLog('RTC', 'Local microphone published & active for candidate.');
      }

      setTestState('RUNNING');
      addLog('System', `Round ${currentRound + 1} is running with active panel.`);

      // Introduction Handshake fallbacks
      if (isMultiAgentPanel) {
        setTimeout(() => {
          if (introPhaseRef.current === 'PRIMARY_GREETING' && testStateRef.current === 'RUNNING') {
            addLog('Turn Arbiter', `Lead Interviewer intro window elapsed (~16s). Advancing to Specialist introduction...`);
            triggerChallengerIntro();
          }
        }, 16000);
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
    // 0. Concurrency Mutex Guard: Prevent multi-click spam & re-entrancy race conditions
    if (isFinishingRoundRef.current || (testStateRef.current !== 'RUNNING' && testStateRef.current !== 'STARTING')) {
      console.warn(`[InterviewRoom] finishRound ignored — already finishing or invalid testState (${testStateRef.current}) [Trigger: ${triggerReason}]`);
      return;
    }
    isFinishingRoundRef.current = true;

    const totalRounds = blueprint.interview_rounds.length;
    const activeRoundIdx = Math.min(Math.max(currentRoundRef.current, 0), totalRounds - 1);
    const round = blueprint.interview_rounds[activeRoundIdx];
    const isRound1 = round?.round_type === 'coding' || round?.round_type === 'system_design';
    const isTechnicalRound = round?.round_type === 'technical';
    
    // Explicit user end actions (End meeting button or manual end) immediately finalize the entire interview
    const isExplicitInterviewEnd = triggerReason === 'USER_ENDED' || triggerReason === 'MANUAL_END';
    const isLastRound = isExplicitInterviewEnd || (activeRoundIdx + 1 >= totalRounds);

    if (isExplicitInterviewEnd) {
      stopAllMediaTracks();
    }

    addLog('Orchestrator', `Concluding ${isRound1 ? 'Round 1 (Workspace Assessment)' : isTechnicalRound ? 'Technical' : 'HR'} round [Trigger: ${triggerReason}] (Round ${activeRoundIdx + 1} of ${totalRounds})...`);

    // ── Phase 1: Closing State ─────────────────────────────────────────────
    if (isRound1) {
      setTestState('TECHNICAL_CLOSING');
      addLog('Orchestrator', 'Round 1 assessment concluding — primary interviewer wrapping up and snapshotting workspace...');
    } else if (isTechnicalRound) {
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
          }).catch(err => console.warn('Stop challenger error:', err));
          addLog('System', 'Challenger agent stopped.');
        }

        // Wait for Primary to finish speaking by polling volume levels
        addLog('System', 'Waiting for primary interviewer to finish speaking...');
        await waitForAgentSilence(9991, 4000);

        // Now stop the Primary agent
        const primaryAgentId = activePanelAgents.find(a => a.isPrimary)?.agentId;
        if (primaryAgentId) {
          await fetch('/api/agora-mllm/stop-mllm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionInfo.sessionId, agent_id: primaryAgentId })
          }).catch(err => console.warn('Stop primary error:', err));
          addLog('System', 'Primary agent stopped.');
        }
      } else {
        // Single agent round (Round 1 Coding or Round 3 HR): wait for agent to finish speaking, then stop
        addLog('System', 'Waiting for interviewer to finish speaking...');
        const soloUid = activePanelAgents[0]?.agentUid || 9993;
        await waitForAgentSilence(soloUid, 4000);

        if (sessionInfo?.agentIds && sessionInfo.agentIds.length > 0) {
          await fetch('/api/agora-mllm/stop-mllm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionInfo.sessionId, agent_ids: sessionInfo.agentIds })
          }).catch(err => console.warn('Stop agents error:', err));
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
      if (isLastRound || isExplicitInterviewEnd) {
        stopAllMediaTracks();
      }

      // ── Phase 4: Decision Gate (Evaluate Round) ────────────────────────
      setTestState('EVALUATING');
      addLog('Arbiter', `Evaluating ${isRound1 ? 'Round 1 workspace & code' : 'round'} evidence via Decision Gate...`);
      
      const roundName = round?.round_name || `Round ${activeRoundIdx + 1}`;
      const roundTranscript = transcript.filter(t => (t as any).round === roundName);

      const wsEvidence = isRound1 ? {
        code: codeRef.current,
        language: languageRef.current,
        codeExecutionResults: {
          compileSuccess: lastExecutionResultRef.current ? lastExecutionResultRef.current.success : (codeRef.current.length > 40),
          passedTests: lastExecutionResultRef.current?.success ? 2 : (codeRef.current.length > 80 ? 1 : 0),
          failedTests: lastExecutionResultRef.current?.success === false ? 1 : 0,
          rawOutput: lastExecutionResultRef.current?.output || 'Workspace snapshot captured'
        },
        diagramElementCount: diagramElements.length,
        diagramSummary: diagramElements.length > 0 ? `Excalidraw diagram with ${diagramElements.length} elements` : undefined
      } : undefined;
      
      let evalData: any = null;
      try {
        const evalRes = await fetch(`/api/interviews/${interviewId}/evaluate-round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roundName, 
            roundType: round?.round_type || (activeRoundIdx === 0 ? 'coding' : 'technical'),
            transcript: roundTranscript, 
            rubric: blueprint.rubric,
            workspaceEvidence: wsEvidence
          })
        });
        if (evalRes.ok) {
          evalData = await evalRes.json();
        } else {
          const errBody = await evalRes.json().catch(() => ({}));
          console.warn('[InterviewRoom] evaluate-round returned status', evalRes.status, errBody);
        }
      } catch (fetchErr) {
        console.warn('[InterviewRoom] evaluate-round network warning:', fetchErr);
      }
      
      // Fallback deterministic evaluation if backend LLM evaluation didn't respond
      if (!evalData?.evaluation) {
        const candidateUtts = transcript.filter(t => {
          const sp = ((t as any).speaker || '').toLowerCase();
          return !sp.includes('priya') && 
                 !sp.includes('arjun') && 
                 !sp.includes('sarah') && 
                 !sp.includes('vikram') && 
                 !sp.includes('marcus') && 
                 !sp.includes('elena') && 
                 !sp.includes('interviewer') && 
                 !sp.includes('ai') && 
                 !sp.includes('system') && 
                 !sp.includes('specialist') && 
                 !sp.includes('lead') && 
                 !sp.includes('hr') && 
                 !sp.includes('panel');
        });
        const candidateWords = candidateUtts.reduce((acc, t) => acc + ((t as any).text || '').split(/\s+/).filter(Boolean).length, 0);
        const hasCode = isRound1 && (codeRef.current.trim().length > 30);
        const isCandidateSilent = candidateWords === 0 && !hasCode;

        const fallbackScore = isCandidateSilent ? 0 : hasCode ? 80 : candidateWords >= 30 ? 65 : 25;
        const fallbackDecision = fallbackScore >= 60 ? 'PASS' : 'FAIL';

        evalData = {
          success: true,
          evaluation: {
            decision: fallbackDecision,
            score: fallbackScore,
            reason: isCandidateSilent
              ? 'Candidate was completely silent and provided zero answers or code.'
              : isRound1 
                ? 'Candidate completed practical workspace implementation with code snapshot captured.' 
                : 'Candidate completed discussion across core competencies.'
          }
        };
      }
      
      addLog('Arbiter', `Decision Gate: ${evalData.evaluation.decision} (Score: ${evalData.evaluation.score}/100)`);
      setTestState('DECISION_GATE');

      // ── Phase 5: Transition Logic (Supports Round 1 -> Round 2 -> Round 3) ──
      if (!isLastRound && (activeRoundIdx + 1 < totalRounds)) {
        const nextRoundIdx = activeRoundIdx + 1;
        const nextRoundObj = blueprint.interview_rounds[nextRoundIdx];
        addLog('System', `Round ${activeRoundIdx + 1} Concluded (Score: ${evalData.evaluation.score}/100). Transitioning to Round ${nextRoundIdx + 1} of ${totalRounds} (${nextRoundObj?.round_name || 'Next Round'})...`);

        // Transition state backend
        await fetch(`/api/interviews/${interviewId}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: isRound1 ? 'TRANSITION_TECHNICAL' : isTechnicalRound ? 'TRANSITION_HR' : 'TRANSITION_COMPLETE',
            score: evalData.evaluation.score,
            decisionReason: evalData.evaluation.reason
          })
        }).catch(err => console.error('State transition error:', err));

        // Update state safely
        setCurrentRound(nextRoundIdx);
        currentRoundRef.current = nextRoundIdx;
        setTestState('ROUND_TRANSITION');
        isFinishingRoundRef.current = false;
      } else {
        // Final round or explicitly ended by user — synthesize final composite scorecard
        setTestState('INTERVIEW_COMPLETE');
        addLog('System', isExplicitInterviewEnd
          ? 'Meeting ended by user. Synthesizing final composite scorecard across completed rounds...'
          : 'Interview panel concluded (all 3 rounds completed). Synthesizing final composite scorecard across all rounds...');
        
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
        stopAllMediaTracks();
        isFinishingRoundRef.current = false;
      }

    } catch (e: any) {
      setTestState('ERROR');
      addLog('Error', `Round completion failed: ${e.message}`);
      stopAllMediaTracks();
      isFinishingRoundRef.current = false;
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
    <div className="absolute inset-0 w-full h-full bg-[#030304] flex flex-col overflow-hidden text-white font-sans selection:bg-purple-500/30 selection:text-white">
      <ProctorEngine 
        interviewId={interviewId} 
        isRunning={testState === 'RUNNING'} 
        candidateName={candidateName}
      />

      {/* Background Atmosphere */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-b from-purple-900/10 via-pink-900/5 to-transparent blur-[160px] opacity-70" />
      <div className="pointer-events-none absolute inset-0 dot-grid-fine opacity-10" />

      {/* ── 1. PRE-START GREEN ROOM (MIC & CAMERA READINESS CHECK) ── */}
      {testState === 'IDLE' ? (
        <div className="relative z-20 flex-1 flex flex-col justify-center items-center p-6 sm:p-10 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
          
          {/* Top Session Breadcrumb */}
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>Plantra Meet · Pre-Flight Green Room</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-sans font-semibold text-white tracking-tight">
              Ready to meet the evaluation panel?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Verify your camera and audio input before entering the live session.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 w-full items-center">
            
            {/* Left Column: Live Camera Mirror Feed */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="relative aspect-video rounded-3xl bg-[#09090d]/90 border border-white/[0.08] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-center">
                {/* Persistent Video Element */}
                <video 
                  ref={(node) => {
                    localVideoRef.current = node;
                    if (node && localStream) {
                      if (node.srcObject !== localStream) {
                        node.srcObject = localStream;
                      }
                      node.play().catch(() => {});
                    }
                  }}
                  autoPlay 
                  playsInline 
                  muted 
                  className={isVideoOff ? 'hidden' : 'w-full h-full object-cover transform -scale-x-100'}
                />

                {/* Camera Off Placeholder */}
                {isVideoOff && (
                  <div className="flex flex-col items-center justify-center text-zinc-500 gap-3 p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                      <VideoOff className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-zinc-300 block">Camera Switched Off</span>
                      <span className="text-xs text-zinc-500 font-mono mt-0.5">Click camera button to enable video</span>
                    </div>
                  </div>
                )}

                {/* Candidate Name Tag */}
                <div className="absolute bottom-4 left-4 z-20 bg-[#030304]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/[0.08] text-white text-xs font-medium flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${deviceCheckStatus.camera === 'active' && !isVideoOff ? 'bg-emerald-400' : 'bg-zinc-500'}`}></div>
                  <span>{candidateName || 'You'}</span>
                  <span className="text-zinc-400 text-[10px] font-mono">(Candidate)</span>
                </div>

                {/* In-Tile Quick Controls */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`p-2 rounded-full transition-all backdrop-blur-md border cursor-pointer ${
                      isVideoOff 
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300' 
                        : 'bg-[#030304]/80 hover:bg-white/[0.1] border-white/[0.1] text-zinc-300 hover:text-white'
                    }`}
                    title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
                  
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`p-2 rounded-full transition-all backdrop-blur-md border cursor-pointer ${
                      isMuted 
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300' 
                        : 'bg-[#030304]/80 hover:bg-white/[0.1] border-white/[0.1] text-zinc-300 hover:text-white'
                    }`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Hardware Diagnostics & Join Action */}
            <div className="lg:col-span-5 bg-[#09090d]/90 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
              
              {/* Round Details */}
              <div className="space-y-1.5 pb-5 border-b border-white/[0.06]">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-purple-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Round {currentRound + 1} of {blueprint.interview_rounds.length}</span>
                </div>
                <h3 className="text-base sm:text-lg font-sans font-semibold text-white">
                  {blueprint.interview_rounds[currentRound]?.round_name}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans line-clamp-2">
                  {blueprint.interview_rounds[currentRound]?.purpose}
                </p>
              </div>

              {/* Hardware Device Diagnostics */}
              <div className="space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
                  Device Readiness
                </span>

                {/* Camera Status */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2.5 text-zinc-200">
                    <Video className="w-4 h-4 text-zinc-400" />
                    <span className="font-medium">Camera Feed</span>
                  </div>
                  {deviceCheckStatus.camera === 'checking' && <span className="text-amber-400 animate-pulse font-mono text-[11px]">Testing...</span>}
                  {deviceCheckStatus.camera === 'active' && <span className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Ready</span>}
                  {deviceCheckStatus.camera === 'blocked' && <span className="text-rose-400 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Blocked</span>}
                </div>

                {/* Microphone Status with Live Meter */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 text-zinc-200">
                      <Mic className="w-4 h-4 text-zinc-400" />
                      <span className="font-medium">Microphone</span>
                    </div>
                    {deviceCheckStatus.mic === 'checking' && <span className="text-amber-400 animate-pulse font-mono text-[11px]">Testing...</span>}
                    {deviceCheckStatus.mic === 'active' && <span className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Ready</span>}
                    {deviceCheckStatus.mic === 'blocked' && <span className="text-rose-400 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Blocked</span>}
                  </div>

                  {/* Audio Level Visualizer Bar */}
                  {deviceCheckStatus.mic === 'active' && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-mono text-zinc-500">Input:</span>
                      <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden p-0.5 border border-white/[0.06] flex items-center">
                        <div 
                          className={`h-full transition-all duration-75 rounded-full ${
                            isMuted 
                              ? 'w-0' 
                              : micVolume > 50 
                                ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500' 
                                : micVolume > 15 
                                  ? 'bg-gradient-to-r from-emerald-400 via-purple-400 to-cyan-400' 
                                  : 'bg-emerald-400/80'
                          }`} 
                          style={{ width: `${isMuted ? 0 : Math.min(100, Math.max(6, micVolume * 2.2))}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 w-10 text-right">
                        {isMuted ? 'Muted' : `${micVolume}%`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Diagnostic Alert if Blocked */}
                {(deviceCheckStatus.camera === 'blocked' || deviceCheckStatus.mic === 'blocked') && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-rose-300 text-xs space-y-2 font-sans">
                    <p className="leading-relaxed">{deviceCheckStatus.errorMsg || 'Camera and Microphone permissions are required to enter the evaluation.'}</p>
                    <button 
                      type="button"
                      onClick={checkDevices}
                      className="text-xs font-mono text-rose-200 hover:text-white underline transition cursor-pointer inline-flex items-center gap-1"
                    >
                      ↻ Re-test hardware permissions
                    </button>
                  </div>
                )}
              </div>

              {/* Enter Live Meeting CTA */}
              <div className="pt-2">
                <button 
                  type="button"
                  onClick={() => startTest()} 
                  disabled={deviceCheckStatus.camera !== 'active' || deviceCheckStatus.mic !== 'active'}
                  className={`w-full py-3.5 px-6 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                    deviceCheckStatus.camera === 'active' && deviceCheckStatus.mic === 'active'
                      ? 'bg-white hover:bg-zinc-200 text-black shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer'
                      : 'bg-white/[0.04] border border-white/[0.08] text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {deviceCheckStatus.camera === 'active' && deviceCheckStatus.mic === 'active' ? (
                    <>
                      <span>Join Round {currentRound + 1} Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <span>Camera & Mic Required to Join</span>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* ── 2. IN-MEETING STAGE & VIDEO GRID ── */
        <div className="flex-1 flex flex-col relative z-20 overflow-hidden">
          
          {/* Top Panel Bar: Round Info Header */}
          {!isRound1WorkspaceActive && (
            <div className="px-6 py-3 border-b border-white/[0.06] bg-[#030304]/80 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs font-medium flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Round {currentRound + 1}: {blueprint.interview_rounds[currentRound]?.round_name}</span>
                </div>

                {testState === 'RUNNING' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] text-zinc-300 font-mono text-xs border border-white/[0.06]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                    <span className="font-semibold text-white">
                      {Math.floor(roundElapsedSeconds / 60)}:{String(roundElapsedSeconds % 60).padStart(2, '0')}
                    </span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-zinc-400">
                      {Math.floor(ROUND_TARGET_SECONDS / 60)}:00
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-mono hidden sm:inline">Panel:</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-300 font-mono">
                  {blueprint.interview_rounds[currentRound]?.round_type === 'coding' ? '1 Coding Agent' : blueprint.interview_rounds[currentRound]?.round_type === 'technical' ? '2 Technical Agents' : '1 HR Evaluator'}
                </span>
              </div>
            </div>
          )}

          {/* Main Stage Grid Area */}
          <div className="flex-1 flex overflow-hidden p-3 sm:p-4">
            {isRound1WorkspaceActive && (testState === 'RUNNING' || testState === 'STARTING') ? (
              <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden h-full">
                
                {/* Workspace Column (Left 65%) */}
                <div className="flex-1 lg:w-[65%] h-full flex flex-col min-h-0">
                  {/* Workspace Mode Switcher Header */}
                  <div className="flex items-center justify-between px-3.5 py-2 bg-[#09090d] border border-white/[0.08] rounded-t-2xl text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => switchWorkspaceMode('coding')}
                        className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                          workspaceMode === 'coding' 
                            ? 'bg-white text-black font-semibold shadow-sm' 
                            : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Coding (Monaco)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchWorkspaceMode('excalidraw')}
                        className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                          workspaceMode === 'excalidraw' 
                            ? 'bg-white text-black font-semibold shadow-sm' 
                            : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>System Design (Canvas)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full hidden sm:inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        AI Real-Time Sync
                      </span>
                      {testState === 'RUNNING' && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.03] text-zinc-300 font-mono text-xs border border-white/[0.06]">
                          <Clock className="w-3 h-3 text-purple-400 animate-pulse" />
                          <span className="font-semibold text-white">
                            {Math.floor(roundElapsedSeconds / 60)}:{String(roundElapsedSeconds % 60).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Workspace Container */}
                  <div className="flex-1 min-h-0 rounded-b-2xl overflow-hidden border border-white/[0.08] bg-[#09090d]">
                    {workspaceMode === 'coding' ? (
                      <CodingWorkspace
                        code={code}
                        setCode={setCode}
                        language={language}
                        setLanguage={setLanguage}
                        onRunCode={onWorkspaceCodeRun}
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
                    isSidebar={true}
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
                isSidebar={false}
              />
            )}
          </div>

          {/* Bottom Drawer: Collapsible SystemTelemetry */}
          <div className={`transition-all duration-300 ease-in-out bg-[#09090d] border-t border-white/[0.08] ${isTelemetryOpen ? 'h-64 opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
            <SystemTelemetry logs={logs} />
          </div>

          {/* Master Bottom Control Bar */}
          <div className="h-[72px] bg-[#09090d]/90 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-between px-6 shrink-0 relative z-40">
            {/* Left: Meeting Metadata */}
            <div className="flex items-center gap-3 w-1/3">
              {testState === 'RUNNING' && (
                <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                  <span className="font-semibold text-white">
                    {Math.floor(roundElapsedSeconds / 60)}:{String(roundElapsedSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
              <span className="text-zinc-500 font-mono text-xs hidden md:inline border-l border-white/[0.08] pl-3">
                Plantra Meet · Live Panel
              </span>
            </div>
            
            {/* Center: Primary Media Controls */}
            <div className="flex items-center justify-center gap-3 w-1/3">
              <button 
                type="button"
                onClick={toggleMute} 
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                  isMuted 
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-white'
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button 
                type="button"
                onClick={toggleCamera} 
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                  isVideoOff 
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-white'
                }`}
                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              <button 
                type="button"
                onClick={toggleDeafen} 
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                  isDeafened 
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                    : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-white'
                }`}
                title={isDeafened ? "Turn Audio On" : "Mute Speaker Audio"}
              >
                {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button 
                type="button"
                onClick={() => finishRound('USER_ENDED')} 
                disabled={testState !== 'RUNNING' && testState !== 'STARTING'}
                className={`px-5 h-11 rounded-full font-semibold text-xs flex items-center gap-2 transition-all ${
                  testState !== 'RUNNING' && testState !== 'STARTING'
                    ? 'bg-white/[0.03] text-zinc-600 border border-white/[0.04] cursor-not-allowed'
                    : 'bg-rose-600/90 hover:bg-rose-600 text-white cursor-pointer shadow-[0_0_20px_rgba(225,29,72,0.3)]'
                }`}
                title="End Meeting"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End Call</span>
              </button>
            </div>

            {/* Right: Telemetry / System Drawer Toggle */}
            <div className="flex items-center justify-end gap-3 w-1/3">
              <button 
                type="button"
                onClick={() => setIsTelemetryOpen(!isTelemetryOpen)} 
                className={`px-3.5 py-1.5 rounded-full flex items-center justify-center transition-all cursor-pointer gap-2 border text-xs font-mono ${
                  isTelemetryOpen 
                    ? 'bg-white text-black font-semibold border-white' 
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-400 hover:text-white'
                }`} 
                title="Toggle System Telemetry"
              >
                {isTelemetryOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                <span>Logs</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

