'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, PhoneOff, SidebarClose, SidebarOpen, Wifi, AlertTriangle, 
  Camera, ScreenShare, ShieldAlert, CheckCircle2, Code, Terminal, ArrowRight, VideoOff
} from 'lucide-react';
import dynamic from 'next/dynamic';

import AvatarCard from '@/components/room/AvatarCard';
import LiveTranscript from '@/components/room/LiveTranscript';
import VaguenessRadar from '@/components/room/VaguenessRadar';
import { getToken, startAgents, endSession } from '@/lib/api';
import type { TranscriptEntry, WSTelemetryEvent } from '@/lib/types';

const AudioVisualizer = dynamic(() => import('@/components/room/AudioVisualizer'), { ssr: false });

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? '';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function RoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  // ── Session State ─────────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [rttMs, setRttMs] = useState<number>(45);
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [thinkingPersona, setThinkingPersona] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [vaguenessScore, setVaguenessScore] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState(2);
  const [coveredPillars, setCoveredPillars] = useState<string[]>([]);
  const [buzzwordsDetected, setBuzzwordsDetected] = useState<string[]>([]);
  
  // ── Round Control ──────────────────────────────────────────────────────────
  // OA Round is disconnected for now; starting directly at Round 2 (Voice Round)
  const [currentRound, setCurrentRound] = useState<1 | 2 | 3>(2); // 1: Assessment (Bypassed), 2: Technical, 3: HR
  const [dynamicPersonas, setDynamicPersonas] = useState<any[]>([]);
  const dynamicPersonasRef = useRef<any[]>([]);
  
  // ── Proctoring & Media State ──────────────────────────────────────────────
  const [proctorStatus, setProctorStatus] = useState<'initializing' | 'active' | 'warning' | 'degraded'>('initializing');
  const [cheatAlerts, setCheatAlerts] = useState<string[]>([]);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isScreenShared, setIsScreenShared] = useState(false);
  const [roomScanProgress, setRoomScanProgress] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [roomScanTimer, setRoomScanTimer] = useState(0);

  // ── Assessment Round Code State ───────────────────────────────────────────
  const [codeContent, setCodeContent] = useState<string>(
    `// Implement an optimized LRU Cache\nclass LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.cache = new Map();\n  }\n\n  get(key) {\n    // Write your code here\n  }\n\n  put(key, value) {\n    // Write your code here\n  }\n}`
  );

  // ── UI States ──────────────────────────────────────────────────────────────
  const [sidebarTab, setSidebarTab] = useState<'transcript' | 'radar'>('transcript');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionStartTime] = useState(Date.now());
  const [sessionTimer, setSessionTimer] = useState('00:00');
  const [isEnding, setIsEnding] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const rtcRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const proctorIntervalRef = useRef<any>(null);

  // ── Timer Interval ─────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      setSessionTimer(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // ── WebSocket Connection ───────────────────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    const wsUrl = API_BASE.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws/telemetry/${sessionId}`);

    ws.onopen = () => {
      console.log('[WS] Telemetry connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSTelemetryEvent = JSON.parse(event.data);
        handleTelemetryEvent(msg);
      } catch (e) {
        console.warn('[WS] Event parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Telemetry closed — reconnecting in 2s...');
      setTimeout(connectWebSocket, 2000);
    };

    wsRef.current = ws;
  }, [sessionId]);

  const handleTelemetryEvent = (event: WSTelemetryEvent) => {
    const payload = event.payload as Record<string, any>;
    switch (event.type) {
      case 'speaker_change':
        setActiveSpeaker(payload.speaker);
        setThinkingPersona(null);
        break;
      case 'vagueness_alert':
        setVaguenessScore(payload.score ?? 0);
        if (payload.buzzwords) setBuzzwordsDetected(payload.buzzwords);
        if (payload.covered_pillars) setCoveredPillars(payload.covered_pillars);
        break;
      case 'transcript_line':
        setTranscript((prev) => [
          ...prev,
          {
            id: payload.id ?? `${Date.now()}`,
            speaker: payload.speaker ?? 'unknown',
            text: payload.text ?? '',
            timestamp: payload.timestamp ?? Date.now() / 1000,
            vaguenessScore: payload.vagueness_score,
          },
        ]);
        break;
      case 'difficulty_change':
        setDifficultyLevel(payload.level ?? 2);
        break;
    }
  };

  const triggerCheatingAlert = useCallback((type: string, detail: string) => {
    setProctorStatus('warning');
    const alertMsg = `${type}: ${detail}`;
    setCheatAlerts((prev) => {
      if (prev.includes(alertMsg)) return prev;
      return [...prev.slice(-3), alertMsg];
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cheating_alert',
        alert_type: type,
        detail: detail
      }));
    }
  }, []);

  // ── Eye Gaze Tracker Heuristic ────────────────────────────────────────────
  const startFaceTracking = useCallback((landmarker: any) => {
    if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
    
    proctorIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const results = landmarker.detectForVideo(video, performance.now());
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        if (results.faceLandmarks.length > 1) {
          triggerCheatingAlert('Multiple Faces Detected', 'More than one person is visible in front of the camera.');
        }

        const landmarks = results.faceLandmarks[0];
        
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1.5;
        
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseTip = landmarks[1];
        
        const midX = (leftEye.x + rightEye.x) / 2;
        const midY = (leftEye.y + rightEye.y) / 2;
        const gazeOffsetX = noseTip.x - midX;
        
        ctx.beginPath();
        ctx.arc(noseTip.x * canvas.width, noseTip.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#10B981';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(noseTip.x * canvas.width, noseTip.y * canvas.height);
        ctx.lineTo(
          (noseTip.x + (gazeOffsetX * 10)) * canvas.width,
          (noseTip.y) * canvas.height
        );
        ctx.strokeStyle = Math.abs(gazeOffsetX) > 0.05 ? '#EF4444' : '#10B981';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (Math.abs(gazeOffsetX) > 0.06) {
          triggerCheatingAlert('Gaze Out-of-Bounds', 'Candidate is looking away from the screen.');
        }
      } else {
        triggerCheatingAlert('No Face Detected', 'Please sit in front of the camera.');
      }
    }, 150);
  }, [triggerCheatingAlert]);

  const startFallbackTracking = useCallback(() => {
    proctorIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.2, canvas.width * 0.5, canvas.height * 0.6);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.fillText("HEURISTIC EYE TRACKING ACTIVE", 10, 20);
    }, 200);
  }, []);

  // ── MediaPipe Proctoring Integration ───────────────────────────────────────
  const loadMediaPipe = useCallback(async () => {
    try {
      setProctorStatus('initializing');
      
      const loadScript = (src: string) => {
        return new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) return resolve();
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
      };

      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.js');
      
      const { FilesetResolver, FaceLandmarker } = (window as any);
      if (!FilesetResolver || !FaceLandmarker) {
        throw new Error('MediaPipe script failed to bind to window');
      }

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.js"
      );
      
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 2
      });

      setProctorStatus('active');
      startFaceTracking(landmarker);
    } catch (err) {
      console.warn('[MediaPipe] Using fallback canvas tracking:', err);
      setProctorStatus('degraded');
      startFallbackTracking();
    }
  }, [startFaceTracking, startFallbackTracking]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsWebcamActive(true);
      }
      loadMediaPipe();
    } catch (err) {
      console.error('Camera access error:', err);
    }
  }, [loadMediaPipe]);

  const startScreenRecording = useCallback((stream: MediaStream) => {
    try {
      recordedChunksRef.current = [];
      const options = { mimeType: 'video/webm; codecs=vp9' };
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        console.log('[Recorder] Saved stream segment, size:', blob.size);
      };

      recorder.start(3000);
      mediaRecorderRef.current = recorder;
      console.log('[Recorder] Screen recording started automatically');
    } catch (err) {
      console.warn('[Recorder] Failed to start media recorder:', err);
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (screenRef.current) {
        screenRef.current.srcObject = stream;
        setIsScreenShared(true);
        startScreenRecording(stream);
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, [startScreenRecording]);

  // ── Agora Init ─────────────────────────────────────────────────────────────
  const initAgora = useCallback(async () => {
    try {
      const candidateUid = Math.floor(Math.random() * 100000) + 1000;
      const tokenRes = await getToken({ channel_name: sessionId, uid: candidateUid });

      const { initRTC } = await import('@/lib/agora');
      const client = await initRTC(
        APP_ID,
        sessionId,
        candidateUid,
        tokenRes.rtc_token,
        (user, mediaType) => {
          const uid = user.uid as number;
          const persona = dynamicPersonasRef.current?.find(p => p.agent_uid === uid)?.agent_id;
          if (persona && mediaType === 'audio') {
            setActiveSpeaker(persona);
            setThinkingPersona(null);
          }
        },
        (user) => {
          const uid = user.uid as number;
          const persona = dynamicPersonasRef.current?.find(p => p.agent_uid === uid)?.agent_id;
          if (persona) {
            setActiveSpeaker((prev) => (prev === persona ? null : prev));
          }
        },
        (uid, level) => {
          setAudioLevels((prev) => ({ ...prev, [uid]: level }));
        },
      );

      rtcRef.current = client;
    } catch (err) {
      console.warn('[Agora] Failed to init Voice Agent channel:', err);
    }
  }, [sessionId]);

  // ── Mount Logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    connectWebSocket();
    initAgora();
    startCamera();
    
    // Automatically trigger the voice round initialization since OA is bypassed
    switchRound(2);

    return () => {
      wsRef.current?.close();
      if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
      mediaRecorderRef.current?.stop();
      import('@/lib/agora').then(({ teardownRTC }) => teardownRTC());
    };
  }, [connectWebSocket, initAgora, startCamera, sessionId]);

  // ── Round Transition Operations ────────────────────────────────────────────
  const switchRound = async (roundNum: number) => {
    setCurrentRound(roundNum);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'change_round',
        round_index: roundNum
      }));
    }

    try {
      // Fetch dynamic round info from backend session status
      const { getSessionStatus } = await import('@/lib/api');
      const status = await getSessionStatus(sessionId);
      
      // Map frontend roundNum (2+) to backend rounds array (0-indexed)
      // Since frontend round 1 is the bypassed OA, frontend round 2 is backend round 0.
      const backendRoundIndex = roundNum - 2;
      
      if (status.rounds && status.rounds.length > backendRoundIndex && backendRoundIndex >= 0) {
        const agents = status.rounds[backendRoundIndex].agents || [];
        setDynamicPersonas(agents);
        dynamicPersonasRef.current = agents;
        
        // Start the agents for this round
        const agentNames = agents.map((a: any) => a.name.toLowerCase());
        const { startAgents } = await import('@/lib/api');
        await startAgents({
          session_id: sessionId,
          channel_name: sessionId,
          personas: agentNames
        });
      } else {
        console.warn(`Backend round ${backendRoundIndex} not found in session blueprint.`);
      }
    } catch(err) {
      console.warn("Failed to fetch session rounds or start agents", err);
    }
  };

  // ── Room Scan Simulation ───────────────────────────────────────────────────
  const startRoomScan = () => {
    setRoomScanProgress('scanning');
    setRoomScanTimer(5);
    
    const interval = setInterval(() => {
      setRoomScanTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setRoomScanProgress('done');
          startScreenShare();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  // ── Controls ───────────────────────────────────────────────────────────────
  const handleMicToggle = async () => {
    const { toggleMic } = await import('@/lib/agora');
    const nowMuted = await toggleMic();
    setIsMicMuted(nowMuted);
  };

  const handleEndInterview = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      wsRef.current?.close();
      const { teardownRTC } = await import('@/lib/agora');
      await teardownRTC();
      await endSession(sessionId);
    } catch (e) {
      console.error('End session error:', e);
    }
    router.push(`/report/${sessionId}`);
  };

  const rttColor = rttMs < 60 ? 'text-emerald-500' : rttMs < 120 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-[#050B14] overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      <header className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B121F] backdrop-blur flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-[#00AEEF]/10 text-[#00AEEF] border border-[#00AEEF]/25 text-xs font-bold font-mono uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-[#00AEEF] animate-pulse" />
            ROUND {currentRound}: {currentRound === 1 ? 'ASSESSMENT' : currentRound === 2 ? 'TECHNICAL ROUND' : 'HR ROUND'}
          </span>
          <span className="text-sm font-mono text-slate-500">{sessionTimer}</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {proctorStatus === 'active' && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              🛡️ AI PROCTOR ACTIVE
            </span>
          )}
          {proctorStatus === 'warning' && (
            <span className="flex items-center gap-1 text-red-400 text-xs bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 animate-pulse">
              ⚠️ PROCTOR ALERT
            </span>
          )}

          <span className="flex items-center gap-1 font-mono text-xs text-slate-600 dark:text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span className={rttColor}>{Math.round(rttMs)}ms</span>
          </span>

          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-slate-100 dark:bg-[#0B121F] rounded transition-colors text-slate-600 dark:text-slate-400">
            {sidebarOpen ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto min-w-0">
          {currentRound === 1 && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <div className="meet-card relative flex-1 flex flex-col items-center justify-center border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B121F]">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl" />
                  
                  {roomScanProgress === 'idle' && (
                    <div className="relative z-10 text-center p-6 bg-slate-100 dark:bg-[#0B121F]/80 backdrop-blur border border-[#00AEEF]/20 max-w-sm">
                      <ShieldAlert className="w-12 h-12 text-[#00AEEF] mx-auto mb-4 animate-bounce" />
                      <h3 className="font-bold text-lg mb-2">Complete Security Scan</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">You must scan your surroundings and share your screen before starting.</p>
                      <button onClick={startRoomScan} className="w-full py-2.5 bg-[#00AEEF] hover:bg-[#008fca] font-bold flex items-center justify-center gap-2 text-sm transition-colors shadow-lg">
                        <Camera className="w-4 h-4" /> Start Room Scan
                      </button>
                    </div>
                  )}

                  {roomScanProgress === 'scanning' && (
                    <div className="relative z-10 text-center p-6 bg-slate-100 dark:bg-[#0B121F]/80 backdrop-blur border border-[#00AEEF]/20">
                      <div className="w-16 h-16 rounded-full border-4 border-[#00AEEF] border-t-transparent animate-spin mx-auto mb-4" />
                      <h3 className="font-bold text-lg mb-1">Scanning Room</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Please pan your camera slowly 360 degrees...</p>
                      <span className="text-xl font-mono text-[#00AEEF] font-bold">{roomScanTimer}s</span>
                    </div>
                  )}

                  {roomScanProgress === 'done' && !isScreenShared && (
                    <div className="relative z-10 text-center p-6 bg-slate-100 dark:bg-[#0B121F]/80 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                      <h3 className="font-bold text-lg mb-2">Scan Finished</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">Webcam proctor active. Now share your screen to load the assessment.</p>
                      <button onClick={startScreenShare} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors shadow-lg">
                        <ScreenShare className="w-4 h-4" /> Share Screen
                      </button>
                    </div>
                  )}

                  {isWebcamActive && roomScanProgress === 'done' && isScreenShared && (
                    <div className="absolute top-4 left-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider">
                      🔴 AI PROCTORING WEBCAM FEED
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B121F] p-5 flex flex-col gap-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Terminal className="w-5 h-5 text-[#00AEEF]" /> Coding Assessment Challenge</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Write an implementation of an LRU Cache with O(1) query and insertion performance.
                    Constraints: Must handle capacity evictions correctly.
                  </p>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-[#0B121F] text-slate-600 dark:text-slate-400">Time limit: 15 mins</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-[#0B121F] text-slate-600 dark:text-slate-400">Complexity: Hard</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B121F] overflow-hidden shadow-xl">
                <div className="h-11 border-b border-slate-200 dark:border-slate-800/80 px-4 bg-slate-100 dark:bg-[#0B121F]/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Code className="w-4 h-4 text-[#00AEEF]" />
                    lru_cache.js
                  </div>
                  <button 
                    disabled={!isScreenShared}
                    onClick={() => switchRound(2)} 
                    className="px-4 py-1 bg-[#00AEEF] hover:bg-[#008fca] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    Submit & Next Round <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  disabled={!isScreenShared}
                  className="flex-1 w-full p-4 bg-[#060B13] text-[#00AEEF] font-mono text-sm outline-none resize-none disabled:opacity-50"
                  spellCheck="false"
                />
              </div>
            </div>
          )}

          {currentRound >= 2 && (
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {dynamicPersonas && dynamicPersonas.length > 0 ? (
                  dynamicPersonas.map((persona: any) => (
                    <div key={persona.agent_id} className="col-span-1 relative">
                      <AvatarCard
                        persona={persona}
                        isActive={activeSpeaker === persona.agent_id}
                        isThinking={thinkingPersona === persona.agent_id}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 flex items-center justify-center text-slate-500 font-mono text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl min-h-[300px]">
                    Waiting for dynamic agents...
                  </div>
                )}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B121F] backdrop-blur p-1 h-20 flex-shrink-0">
                <AudioVisualizer activeSpeaker={activeSpeaker} audioLevels={audioLevels} />
              </div>

              <div className="flex justify-between items-center bg-white dark:bg-[#0B121F] border border-slate-200 dark:border-slate-800/60 p-3 flex-shrink-0">
                <p className="text-xs text-slate-500 font-mono">Dynamic multi-persona voice round active</p>
                {currentRound === 2 ? (
                  <button 
                    onClick={() => switchRound(3)}
                    className="px-4 py-1.5 bg-[#00AEEF]/10 text-[#00AEEF] hover:bg-[#00AEEF]/20 border border-[#00AEEF]/25 text-xs font-bold transition-all flex items-center gap-1"
                  >
                    Proceed to Behavioral/HR Round <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-[#00AEEF] font-semibold">Final behavioral round</span>
                )}
              </div>
            </div>
          )}

          {cheatAlerts.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">AI Proctoring Alerts</p>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 mt-1">
                  {cheatAlerts.map((alert, idx) => (
                    <p key={idx}>• {alert}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 330, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B121F] backdrop-blur flex flex-col overflow-hidden flex-shrink-0"
            >
              <div className="flex w-full">
                {(['transcript', 'radar'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSidebarTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 pt-4 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 focus:outline-none ${
                      sidebarTab === tab
                        ? 'border-[#00AEEF] text-[#00AEEF] bg-[#00AEEF]/5'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <span className="text-base">{tab === 'transcript' ? '📝' : '🎯'}</span>
                    <span>{tab === 'transcript' ? 'Transcript' : 'AI Radar'}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {sidebarTab === 'transcript' ? (
                  <LiveTranscript entries={transcript} />
                ) : (
                  <div className="flex-1 overflow-y-auto p-4">
                    <VaguenessRadar
                      vaguenessScore={vaguenessScore}
                      difficultyLevel={difficultyLevel}
                      coveredPillars={coveredPillars}
                      buzzwordsDetected={buzzwordsDetected}
                    />
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <footer className="h-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B121F] backdrop-blur-md flex items-center justify-between px-8 flex-shrink-0">
        <button
          onClick={handleMicToggle}
          className={`w-12 h-12 flex items-center justify-center transition-all shadow-lg ${
            isMicMuted
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[#00AEEF]/15 text-[#00AEEF] border border-[#00AEEF]/30 hover:bg-[#00AEEF]/25'
          }`}
          title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <div className="text-center">
          <p className="text-xs text-slate-500 font-mono">
            {activeSpeaker
              ? `${activeSpeaker.charAt(0).toUpperCase() + activeSpeaker.slice(1)} is speaking`
              : 'Room active — speak to panel'}
          </p>
        </div>

        <button
          onClick={handleEndInterview}
          disabled={isEnding}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold transition-all shadow-lg text-sm"
        >
          <PhoneOff className="w-4 h-4" />
          {isEnding ? 'Terminating...' : 'End Interview'}
        </button>
      </footer>
    </div>
  );
}
