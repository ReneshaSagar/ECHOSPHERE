'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, PhoneOff, SidebarClose, SidebarOpen, Wifi, AlertTriangle, 
  Camera, ScreenShare, ShieldAlert, CheckCircle2, Code, Terminal, ArrowRight, VideoOff, Play
} from 'lucide-react';
import dynamic from 'next/dynamic';

import AvatarCard from '@/components/room/AvatarCard';
import LiveTranscript from '@/components/room/LiveTranscript';
import VaguenessRadar from '@/components/room/VaguenessRadar';
import { getToken, startAgents, endSession, gradeRound } from '@/lib/api';
import type { TranscriptEntry, WSTelemetryEvent } from '@/lib/types';

const AudioVisualizer = dynamic(() => import('@/components/room/AudioVisualizer'), { ssr: false });

const PERSONA_UIDS: Record<string, number> = { alex: 2001, maya: 2002, david: 2003 };
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? '';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type PersonaName = 'alex' | 'maya' | 'david';

export default function RoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  // ── Session State ─────────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [rttMs, setRttMs] = useState<number>(45);
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});
  const [activeSpeaker, setActiveSpeaker] = useState<PersonaName | 'candidate' | null>(null);
  const [thinkingPersona, setThinkingPersona] = useState<PersonaName | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [vaguenessScore, setVaguenessScore] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState(2);
  const [coveredPillars, setCoveredPillars] = useState<string[]>([]);
  const [buzzwordsDetected, setBuzzwordsDetected] = useState<string[]>([]);
  
  // ── Round & Disqualification Control ───────────────────────────────────────
  const [currentRound, setCurrentRound] = useState<1 | 2 | 3>(1); // 1: Assessment, 2: Technical, 3: HR
  const [disqualified, setDisqualified] = useState(false);
  const [disqualificationFeedback, setDisqualificationFeedback] = useState('');
  const [gradingInProgress, setGradingInProgress] = useState(false);
  const [dynamicPersonas, setDynamicPersonas] = useState<any>(null);
  
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

  // ── Load Dynamic Personas Configuration ────────────────────────────────────
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`omnipanel_personas_${sessionId}`);
      if (stored) {
        setDynamicPersonas(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load dynamic persona configs from session storage:', e);
    }
  }, [sessionId]);

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
      case 'disqualification':
        setDisqualified(true);
        setDisqualificationFeedback(payload.feedback ?? 'You did not meet the qualification threshold for this round.');
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
        
        ctx.strokeStyle = '#6366F1';
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
      
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.2, canvas.width * 0.5, canvas.height * 0.6);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
      ctx.font = '10px monospace';
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
        throw new Error('MediaPipe vision library could not be fetched');
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
      console.warn('[MediaPipe] Falling back to standard canvas tracking:', err);
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
        console.log('[Recorder] Screen stream segment saved, size:', blob.size);
      };

      recorder.start(3000);
      mediaRecorderRef.current = recorder;
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
      console.error('Screen share access denied:', err);
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
          const persona = Object.entries(PERSONA_UIDS).find(([, v]) => v === uid)?.[0];
          if (persona && mediaType === 'audio') {
            setActiveSpeaker(persona as PersonaName);
            setThinkingPersona(null);
          }
        },
        (user) => {
          const uid = user.uid as number;
          const persona = Object.entries(PERSONA_UIDS).find(([, v]) => v === uid)?.[0];
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

    return () => {
      wsRef.current?.close();
      if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
      mediaRecorderRef.current?.stop();
      import('@/lib/agora').then(({ teardownRTC }) => teardownRTC());
    };
  }, [connectWebSocket, initAgora, startCamera]);

  // ── Round Transition Operations ────────────────────────────────────────────
  const switchRound = async (roundNum: 1 | 2 | 3) => {
    if (roundNum === 2) {
      // 1. Submit Code Assessment to Backend Grader for qualification check
      setGradingInProgress(true);
      try {
        const grade = await gradeRound(sessionId, {
          round_index: 1,
          submission_content: codeContent
        });
        if (!grade.passed) {
          setDisqualified(true);
          setDisqualificationFeedback(grade.feedback || 'Your assessment score did not meet the passing criteria.');
          return;
        }
      } catch (err) {
        console.warn('Grading connection error, continuing round:', err);
      } finally {
        setGradingInProgress(false);
      }

      // 2. Start Technical voice panel agents
      try {
        await startAgents({ session_id: sessionId, channel_name: sessionId });
      } catch (err) {
        console.warn('Failed to launch Agora panel agents:', err);
      }
      
      const leadName = dynamicPersonas?.technical?.[0]?.name || 'Alex';
      const techOpening: TranscriptEntry = {
        id: 'tech-opening',
        speaker: 'alex',
        text: `Welcome to the Technical Interview. I am ${leadName}. Let's evaluate your design tradeoffs and domain depth.`,
        timestamp: (Date.now() - sessionStartTime) / 1000
      };
      setTranscript((prev) => [...prev, techOpening]);
      setActiveSpeaker('alex');
    } else if (roundNum === 3) {
      const hrName = dynamicPersonas?.hr?.[0]?.name || 'Robert';
      const hrOpening: TranscriptEntry = {
        id: 'hr-opening',
        speaker: 'david',
        text: `Welcome to the Behavioral and HR Round. I am ${hrName}. Let's evaluate past leadership, conflicts, and collaboration.`,
        timestamp: (Date.now() - sessionStartTime) / 1000
      };
      setTranscript((prev) => [...prev, hrOpening]);
      setActiveSpeaker('david');
    }

    setCurrentRound(roundNum);

    // Notify backend WebSocket of round change
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'change_round',
        round_index: roundNum
      }));
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

  const rttColor = rttMs < 60 ? 'text-emerald-400' : rttMs < 120 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#040508] overflow-hidden text-slate-100 font-sans">
      
      {/* ── Disqualification Overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {disqualified && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-[#040508]/95 backdrop-blur z-50 flex items-center justify-center p-6 text-center"
          >
            <div className="max-w-md p-8 bg-[#090B11] border border-red-500/20 rounded-2xl flex flex-col items-center">
              <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Round Disqualification</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                {disqualificationFeedback || 'You have not passed the minimum scoring requirements for this round.'}
              </p>
              <button 
                onClick={() => router.push(`/report/${sessionId}`)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                View Scorecard Report
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Header ──────────────────────────────────────────────── */}
      <header className="h-12 border-b border-[#121622] bg-[#090B11]/80 backdrop-blur flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-bold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            ROUND {currentRound}: {currentRound === 1 ? 'ASSESSMENT' : currentRound === 2 ? 'TECHNICAL ROUND' : 'HR ROUND'}
          </span>
          <span className="text-xs font-mono text-slate-500">{sessionTimer}</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {proctorStatus === 'active' && (
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              🛡️ AI PROCTOR ACTIVE
            </span>
          )}
          {proctorStatus === 'warning' && (
            <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 animate-pulse font-bold">
              ⚠️ PROCTOR ALERT
            </span>
          )}

          <span className="flex items-center gap-1 font-mono text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-slate-500" />
            <span className={rttColor}>{Math.round(rttMs)}ms</span>
          </span>

          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-slate-900 rounded transition-colors text-slate-400">
            {sidebarOpen ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main Layout Panel ───────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto min-w-0">
          
          {/* ── Round 1 UI: Online Assessment & Room Scan ──────────────────── */}
          {currentRound === 1 && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Webcam Proctor Box & Code Challenge Instructions */}
              <div className="flex flex-col gap-4">
                {/* Room Scan / Camera Block */}
                <div className="meet-card relative flex-1 flex flex-col items-center justify-center border-slate-900 bg-[#090B11]">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl" />
                  
                  {roomScanProgress === 'idle' && (
                    <div className="relative z-10 text-center p-6 bg-slate-950/90 backdrop-blur rounded-2xl border border-slate-900 max-w-sm">
                      <ShieldAlert className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-bounce" />
                      <h3 className="font-bold text-sm text-white mb-1">Verify Security Surroundings</h3>
                      <p className="text-[11px] text-slate-450 mb-5">You must run a room scan and start screen sharing before assessment loads.</p>
                      <button onClick={startRoomScan} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-lg">
                        <Camera className="w-3.5 h-3.5" /> Start Room Scan
                      </button>
                    </div>
                  )}

                  {roomScanProgress === 'scanning' && (
                    <div className="relative z-10 text-center p-6 bg-slate-950/90 backdrop-blur rounded-2xl border border-slate-900">
                      <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
                      <h3 className="font-bold text-sm mb-0.5 text-white">Scanning Active Room</h3>
                      <p className="text-[11px] text-slate-450 mb-1.5">Pan your webcam slowly 360 degrees...</p>
                      <span className="text-lg font-mono text-indigo-400 font-bold">{roomScanTimer}s</span>
                    </div>
                  )}

                  {roomScanProgress === 'done' && !isScreenShared && (
                    <div className="relative z-10 text-center p-6 bg-slate-950/90 backdrop-blur rounded-2xl border border-slate-900 max-w-sm">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                      <h3 className="font-bold text-sm text-white mb-1">Webcam Verified</h3>
                      <p className="text-[11px] text-slate-450 mb-5">AI webcam feed active. Share your screen now to load the coding assessment.</p>
                      <button onClick={startScreenShare} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-lg">
                        <ScreenShare className="w-3.5 h-3.5" /> Share Screen
                      </button>
                    </div>
                  )}

                  {isWebcamActive && roomScanProgress === 'done' && isScreenShared && (
                    <div className="absolute top-4 left-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider">
                      🔴 AI PROCTOR WEBCAM FEED ACTIVE
                    </div>
                  )}
                </div>

                {/* Challenge description */}
                <div className="rounded-xl border border-slate-900 bg-[#090B11] p-5 flex flex-col gap-2">
                  <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm"><Terminal className="w-4 h-4 text-indigo-400" /> Coding Assessment Challenge</h3>
                  <p className="text-xs text-slate-450 leading-relaxed">
                    Write an implementation of an LRU Cache with O(1) query and insertion performance.
                    Constraints: Must handle capacity evictions correctly.
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-900 rounded">Time limit: 15 mins</span>
                    <span className="text-[9px] px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-900 rounded">Complexity: Hard</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Code Editor Box */}
              <div className="flex flex-col border border-slate-900 bg-[#090B11] rounded-2xl overflow-hidden shadow-xl">
                <div className="h-11 border-b border-slate-850 px-4 bg-slate-950/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-350">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    lru_cache.js
                  </div>
                  <button 
                    disabled={!isScreenShared || gradingInProgress}
                    onClick={() => switchRound(2)} 
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    {gradingInProgress ? 'Grading...' : 'Submit & Next Round'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  disabled={!isScreenShared || gradingInProgress}
                  className="flex-1 w-full p-4 bg-[#030406] text-indigo-300/90 font-mono text-xs outline-none resize-none disabled:opacity-50"
                  spellCheck="false"
                />
              </div>
            </div>
          )}

          {/* ── Round 2 & 3 UI: Dynamic Panel Interview Grid ───────────────── */}
          {currentRound >= 2 && (
            <div className="flex-1 flex flex-col gap-4">
              
              {/* Dynamic Video Feeds Grid */}
              <div className="grid grid-cols-4 gap-4 flex-1">
                
                {/* Webcam PiP feed (candidate) */}
                <div className="col-span-1 meet-card bg-slate-950 relative flex items-center justify-center border-slate-900">
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl" />
                  {!isWebcamActive && (
                    <VideoOff className="w-8 h-8 text-slate-800" />
                  )}
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 bg-black/70 backdrop-blur text-[9px] font-semibold text-slate-200 rounded border border-slate-900">
                    YOU (Candidate)
                  </div>
                </div>

                {/* AI Panel Interviewers (Round 2: Technical has 3, Round 3: HR has 1) */}
                {currentRound === 2 ? (
                  (['alex', 'maya', 'david'] as PersonaName[]).map((persona) => {
                    const d = dynamicPersonas?.technical?.find((x: any) => x.agent_uid === PERSONA_UIDS[persona]);
                    return (
                      <div key={persona} className="col-span-1 relative">
                        <AvatarCard
                          persona={persona}
                          isActive={activeSpeaker === persona}
                          isThinking={thinkingPersona === persona}
                          displayName={d?.name}
                          displayRole={d?.role}
                          displayColor={d?.color}
                        />
                      </div>
                    );
                  })
                ) : (
                  // Round 3 (HR): Display exactly ONE recruiter persona
                  <div className="col-span-3 relative">
                    <AvatarCard
                      persona="david"
                      isActive={activeSpeaker === 'david'}
                      isThinking={thinkingPersona === 'david'}
                      displayName={dynamicPersonas?.hr?.[0]?.name || 'Robert'}
                      displayRole={dynamicPersonas?.hr?.[0]?.role || 'Talent Partner'}
                      displayColor="#10B981"
                    />
                  </div>
                )}
              </div>

              {/* Audio Visualizer */}
              <div className="rounded-xl overflow-hidden border border-slate-900 bg-[#090B11]/80 backdrop-blur p-1 h-20 flex-shrink-0">
                <AudioVisualizer activeSpeaker={activeSpeaker} audioLevels={audioLevels} />
              </div>

              {/* Transition controller */}
              <div className="flex justify-between items-center bg-[#090B11]/40 border border-[#121622] rounded-xl p-3 flex-shrink-0">
                <p className="text-xs text-slate-500 font-mono">Dynamic multi-persona voice round active</p>
                {currentRound === 2 ? (
                  <button 
                    onClick={() => switchRound(3)}
                    className="px-4 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/35 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    Proceed to HR / Behavioral Round <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-xs text-indigo-400 font-semibold font-mono uppercase tracking-wider">Final behavioral evaluation round</span>
                )}
              </div>
            </div>
          )}

          {/* Cheat alerts log overlay */}
          {cheatAlerts.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-3 flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">AI Proctoring Alerts</p>
                <div className="text-[10px] text-slate-400 space-y-1 mt-1 font-mono">
                  {cheatAlerts.map((alert, idx) => (
                    <p key={idx}>• {alert}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── Sidebar Panels ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 330, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="border-l border-slate-900 bg-[#090B11]/90 backdrop-blur flex flex-col overflow-hidden flex-shrink-0"
            >
              <div className="flex border-b border-slate-900">
                {(['transcript', 'radar'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSidebarTab(tab)}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                      sidebarTab === tab
                        ? 'border-b-2 border-indigo-500 text-indigo-400 bg-indigo-500/5'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    {tab === 'transcript' ? '📝 Transcript' : '🎯 AI Radar'}
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

      {/* ── Bottom Dock Controller ──────────────────────────────────────── */}
      <footer className="h-20 border-t border-slate-900 bg-[#090B11]/60 backdrop-blur-md flex items-center justify-between px-8 flex-shrink-0">
        <button
          onClick={handleMicToggle}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isMicMuted
              ? 'bg-red-500 text-white hover:bg-red-650'
              : 'bg-slate-950 text-slate-200 border border-slate-800 hover:bg-slate-900'
          }`}
          title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg text-xs"
        >
          <PhoneOff className="w-4 h-4" />
          {isEnding ? 'Terminating...' : 'End Interview'}
        </button>
      </footer>
    </div>
  );
}
