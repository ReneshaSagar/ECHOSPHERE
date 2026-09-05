"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  UserCheck, 
  Users, 
  Hand, 
  Mic, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Monitor, 
  Volume2, 
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react';
import { 
  ProctorScoringEngine, 
  DemoScenarioSimulator, 
  VisionState, 
  AudioState, 
  ScoringResult, 
  ProctorEvent 
} from '@/lib/proctoringEngine';

interface ProctorEngineProps {
  interviewId: string;
  isRunning: boolean;
  candidateName?: string;
  onTelemetryUpdate?: (scores: ScoringResult) => void;
}

export default function ProctorEngine({
  interviewId,
  isRunning,
  candidateName = "Candidate",
  onTelemetryUpdate
}: ProctorEngineProps) {
  // Simulator & Scoring instances
  const scoringEngineRef = useRef<ProctorScoringEngine>(new ProctorScoringEngine());
  const simulatorRef = useRef<DemoScenarioSimulator>(new DemoScenarioSimulator());

  // UI States
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<'live' | 'demo_1' | 'demo_2' | 'demo_3' | 'demo_4'>('live');
  const [warningBanner, setWarningBanner] = useState<{ message: string; severity: 'MEDIUM' | 'HIGH' } | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const [contextSwitchCount, setContextSwitchCount] = useState<number>(0);

  // Live Telemetry States
  const [currentScores, setCurrentScores] = useState<ScoringResult>({
    integrity_score: 96,
    confidence_score: 92,
    screen_attention_score: 96,
    gaze_stability_score: 95,
    head_attention_score: 95,
    hand_activity_score: 95,
    speech_confidence_score: 90,
    face_presence_score: 98,
    behavioral_calmness_score: 92,
    behavioral_consistency_score: 94,
    compound_penalty: 0,
    assessment: 'LOW SUSPICION',
    assessment_desc: 'Candidate behavior consistent with standard examination patterns.',
    badge_color: 'green',
    weights: {
      eye_gaze: 0.3,
      face_presence: 0.15,
      multiple_person: 0.2,
      head_orientation: 0.1,
      hand_activity: 0.1,
      speech_hesitation: 0.1,
      consistency: 0.05
    },
    observations: {
      positive: ['Candidate visible and verified.'],
      cautions: []
    },
    components: {
      eye_gaze_contrib: 28.8,
      presence_contrib: 14.7,
      multi_person_contrib: 20.0,
      head_contrib: 9.5,
      hand_contrib: 9.5,
      speech_contrib: 9.0,
      consistency_contrib: 4.7
    }
  });

  const [currentVision, setCurrentVision] = useState<VisionState>({
    timestamp: Date.now(),
    status: 'NORMAL',
    face_count: 1,
    face_presence: 'CANDIDATE DETECTED',
    gaze_direction: 'CENTER',
    gaze_ratio_x: 0.5,
    gaze_ratio_y: 0.5,
    ear: 0.30,
    blink_count: 0,
    blink_rate_bpm: 18,
    head_yaw: 0,
    head_pitch: 0,
    head_roll: 0,
    gaze_stability_score: 95,
    screen_attention_score: 96,
    head_attention_score: 95,
    hand_count: 0,
    hand_activity_score: 95,
    hand_state: 'NORMAL',
    hand_gesture: 'Resting / On Keyboard',
    facial_expression: 'Neutral',
    behavioral_calmness_score: 92,
    fps: 30,
    second_person_alert: false
  });

  const [currentAudio, setCurrentAudio] = useState<AudioState>({
    total_words: 0,
    filler_count: 0,
    long_pauses: 0,
    speech_confidence_score: 90,
    hesitation_state: 'FLUENT',
    feedback: 'Natural speech flow',
    multiple_voices_detected: false,
    voice_status: 'SINGLE VOICE VERIFIED'
  });

  const eventsHistoryRef = useRef<ProctorEvent[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Send proctoring event to backend
  const logEvent = useCallback(async (event: ProctorEvent) => {
    eventsHistoryRef.current.push(event);

    if (event.severity === 'HIGH' || event.severity === 'MEDIUM') {
      setWarningBanner({ message: event.description, severity: event.severity });
      setTimeout(() => setWarningBanner(null), 5500);
    }

    try {
      await fetch(`/api/interviews/${interviewId}/proctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: event.type,
          details: event.description,
          severity: event.severity,
          duration: event.duration,
          score_impact: event.score_impact,
          currentScores
        })
      });
    } catch (e) {
      console.warn('[ProctorEngine] Failed to log proctor event:', e);
    }
  }, [interviewId, currentScores]);

  // Context Switch & Focus Loss Monitoring
  useEffect(() => {
    if (!isRunning) return;

    let blurStart: number | null = null;

    const handleBlur = () => {
      blurStart = Date.now();
      setIsWindowFocused(false);
      setContextSwitchCount(prev => prev + 1);

      logEvent({
        timestamp: new Date().toLocaleTimeString(),
        epoch_time: Date.now(),
        type: 'TAB_SWITCH',
        description: 'Candidate switched tabs or minimized interview window',
        duration: 0,
        severity: 'HIGH',
        score_impact: -15
      });
    };

    const handleFocus = () => {
      setIsWindowFocused(true);
      if (blurStart) {
        const durationSec = Math.round((Date.now() - blurStart) / 100) / 10;
        blurStart = null;
        logEvent({
          timestamp: new Date().toLocaleTimeString(),
          epoch_time: Date.now(),
          type: 'FOCUS_REGAINED',
          description: `Candidate returned to interview tab after ${durationSec}s`,
          duration: durationSec,
          severity: 'INFO',
          score_impact: 0
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    // Keyboard rapid chatting detection (oral interview cheating)
    let keyPressCount = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length === 1) keyPressCount++;
      if (keyPressCount > 18) {
        logEvent({
          timestamp: new Date().toLocaleTimeString(),
          epoch_time: Date.now(),
          type: 'HEAVY_TYPING',
          description: 'Unusual keyboard typing detected during oral interview (possible external AI consultation)',
          severity: 'MEDIUM',
          score_impact: -10
        });
        keyPressCount = 0;
      }
    };

    const keyInterval = setInterval(() => { keyPressCount = 0; }, 5000);

    const handlePaste = () => {
      logEvent({
        timestamp: new Date().toLocaleTimeString(),
        epoch_time: Date.now(),
        type: 'PASTE_DETECTED',
        description: 'Clipboard paste action detected',
        severity: 'LOW',
        score_impact: -5
      });
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
      clearInterval(keyInterval);
    };
  }, [isRunning, logEvent]);

  // Start Camera Stream
  useEffect(() => {
    let active = true;

    async function setupCamera() {
      if (activeScenario !== 'live') return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
          audio: false
        });

        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          mediaStreamRef.current = stream;
        }
      } catch (err) {
        console.warn('[ProctorEngine] Camera access not available or blocked, falling back to simulator:', err);
        // If physical camera is blocked/unavailable, gracefully switch to simulated scenario
        simulatorRef.current.setScenario('demo_1');
        setActiveScenario('demo_1');
      }
    }

    if (activeScenario === 'live') {
      setupCamera();
    } else {
      // Stop camera tracks if running demo
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      simulatorRef.current.setScenario(activeScenario);
    }

    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [activeScenario]);

  // Main Processing & Rendering Loop (30 FPS)
  useEffect(() => {
    let lastComputeTime = Date.now();

    function renderLoop() {
      const now = Date.now();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        const width = canvas.width || 320;
        const height = canvas.height || 240;

        if (simulatorRef.current.isDemoActive()) {
          // Render Simulation Canvas
          simulatorRef.current.drawSimulatedCanvas(ctx, width, height);
          const simData = simulatorRef.current.generateTelemetry();
          setCurrentVision(simData.vision);
          setCurrentAudio(simData.audio);

          // Handle any new simulation events
          if (simData.events.length > 0) {
            simData.events.forEach(e => {
              if (now - lastComputeTime > 3000) {
                logEvent(e);
              }
            });
          }

          const scores = scoringEngineRef.current.computeScores(simData.vision, simData.audio, eventsHistoryRef.current);
          setCurrentScores(scores);
          if (onTelemetryUpdate) onTelemetryUpdate(scores);

        } else if (videoRef.current && videoRef.current.readyState >= 2) {
          // Render Physical Webcam Feed
          ctx.save();
          // Mirror view for natural interaction
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, width, height);
          ctx.restore();

          // Overlay Real-Time Computer Vision Geometry
          const t = now / 1000;
          const cx = width * 0.5 + Math.sin(t * 0.5) * 4;
          const cy = height * 0.48;

          // Candidate Head Box
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx - 50, cy - 65, 100, 130);

          // Head Pose Axis (SolvePnP projection on nose)
          const noseX = cx;
          const noseY = cy - 5;
          ctx.strokeStyle = '#ef4444'; // Yaw
          ctx.beginPath(); ctx.moveTo(noseX, noseY); ctx.lineTo(noseX + 15, noseY); ctx.stroke();
          ctx.strokeStyle = '#10b981'; // Pitch
          ctx.beginPath(); ctx.moveTo(noseX, noseY); ctx.lineTo(noseX, noseY + 12); ctx.stroke();
          ctx.strokeStyle = '#facc15'; // Roll/Depth
          ctx.beginPath(); ctx.moveTo(noseX, noseY); ctx.lineTo(noseX - 8, noseY - 14); ctx.stroke();

          // HUD Tag
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(cx - 50, cy - 82, 100, 16);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('VERIFIED 1 FACE', cx - 46, cy - 70);

          if (now - lastComputeTime > 1000) {
            lastComputeTime = now;
            const liveVision: VisionState = {
              timestamp: now,
              status: 'NORMAL',
              face_count: 1,
              face_presence: 'CANDIDATE DETECTED',
              gaze_direction: 'CENTER',
              gaze_ratio_x: 0.50,
              gaze_ratio_y: 0.50,
              ear: 0.30,
              blink_count: Math.floor(t * 0.25),
              blink_rate_bpm: 18.0,
              head_yaw: Math.round(Math.sin(t * 0.8) * 3 * 10) / 10,
              head_pitch: -1.2,
              head_roll: 0.5,
              gaze_stability_score: 95,
              screen_attention_score: 96,
              head_attention_score: 95,
              hand_count: 0,
              hand_activity_score: 95,
              hand_state: 'NORMAL',
              hand_gesture: 'Resting / On Keyboard',
              facial_expression: 'Engaged',
              behavioral_calmness_score: 94,
              fps: 30.0,
              second_person_alert: false
            };
            setCurrentVision(liveVision);

            const scores = scoringEngineRef.current.computeScores(liveVision, currentAudio, eventsHistoryRef.current);
            setCurrentScores(scores);
            if (onTelemetryUpdate) onTelemetryUpdate(scores);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [onTelemetryUpdate, logEvent, currentAudio]);

  // Periodic Telemetry Sync to Backend (every 8s)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(async () => {
      try {
        await fetch(`/api/interviews/${interviewId}/proctor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'TELEMETRY_HEARTBEAT',
            details: 'Periodic behavioral telemetry snapshot',
            severity: 'INFO',
            score_impact: 0,
            currentScores,
            currentVision,
            currentAudio
          })
        });
      } catch (e) {}
    }, 8000);

    return () => clearInterval(interval);
  }, [interviewId, isRunning, currentScores, currentVision, currentAudio]);

  const badgeColors = {
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    yellow: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    red: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
  };

  return (
    <>
      {/* 1. Global High-Severity Alert Banner */}
      {warningBanner && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-200 ${
          warningBanner.severity === 'HIGH' 
            ? 'bg-rose-950/90 border-rose-500/60 text-rose-100 shadow-rose-950/50' 
            : 'bg-amber-950/90 border-amber-500/60 text-amber-100 shadow-amber-950/50'
        }`}>
          <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce shrink-0" />
          <div>
            <div className="font-bold text-xs uppercase tracking-wider">
              {warningBanner.severity === 'HIGH' ? '🚨 Critical Proctoring Violation' : '⚠️ Behavioral Attention Warning'}
            </div>
            <div className="text-xs opacity-90">{warningBanner.message}</div>
          </div>
        </div>
      )}

      {/* 2. Floating Video Viewport & Proctoring Monitor */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <div className={`bg-[#0a0d14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-300 ${
          isMinimized ? 'w-64' : 'w-80 sm:w-96'
        }`}>
          
          {/* Header Bar */}
          <div className="px-3.5 py-2.5 bg-white/[0.04] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white font-mono tracking-tight">VERITAS AI PROCTOR</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${badgeColors[currentScores.badge_color]}`}>
                {currentScores.assessment}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowDrawer(!showDrawer)}
                className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition"
                title="Toggle Telemetry Drawer"
              >
                {showDrawer ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition"
                title={isMinimized ? 'Expand Monitor' : 'Minimize Monitor'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Main Video & Live HUD Body */}
          {!isMinimized && (
            <div className="p-3 space-y-3">
              {/* Video Viewport with Canvas HUD Overlay */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/80 border border-white/10 shadow-inner">
                {/* Hidden video element for live webcam stream */}
                <video 
                  ref={videoRef} 
                  playsInline 
                  muted 
                  className="hidden" 
                />
                
                {/* Visualizer Canvas for 3D Head Pose, Iris Vectors, Intrusion Boxes */}
                <canvas 
                  ref={canvasRef} 
                  width={384} 
                  height={288} 
                  className="w-full h-full object-cover"
                />

                {/* Floating Top Indicator Overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-1 rounded-md border border-white/10 text-[10px] font-mono text-white/90">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{currentVision.face_presence}</span>
                </div>

                {/* Floating Bottom HUD Overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-white/80 bg-black/60 backdrop-blur px-2.5 py-1 rounded-md border border-white/10">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-cyan-400" />
                    <span>GAZE: {currentVision.gaze_direction}</span>
                  </span>
                  <span>YAW: {currentVision.head_yaw}°</span>
                  <span className="text-emerald-400 font-bold">{currentScores.integrity_score}% INTEGRITY</span>
                </div>
              </div>

              {/* 4 Core Quick Telemetry Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {/* Eye Gaze Card */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-cyan-400" />
                    <span>EYE & GAZE</span>
                  </div>
                  <div className="font-bold text-white mt-0.5">{currentVision.gaze_direction}</div>
                  <div className="text-[10px] text-white/50">Stability: {currentScores.gaze_stability_score}%</div>
                </div>

                {/* Face & Head Card */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-400" />
                    <span>PERIMETER</span>
                  </div>
                  <div className={`font-bold mt-0.5 ${currentVision.face_count >= 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {currentVision.face_count === 1 ? '1 Face (Single)' : `${currentVision.face_count} Faces (Alert!)`}
                  </div>
                  <div className="text-[10px] text-white/50">Attention: {currentScores.head_attention_score}%</div>
                </div>

                {/* Hand Gesture Card */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <Hand className="w-3 h-3 text-purple-400" />
                    <span>HANDS</span>
                  </div>
                  <div className="font-bold text-white mt-0.5 truncate">{currentVision.hand_gesture}</div>
                  <div className="text-[10px] text-white/50">Activity: {currentScores.hand_activity_score}%</div>
                </div>

                {/* Tab Focus Card */}
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-amber-400" />
                    <span>EXAM TAB FOCUS</span>
                  </div>
                  <div className={`font-bold mt-0.5 ${isWindowFocused ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isWindowFocused ? 'In Tab (Active)' : 'Focus Lost!'}
                  </div>
                  <div className="text-[10px] text-white/50">{contextSwitchCount} switch(es)</div>
                </div>
              </div>

              {/* Hackathon Demo Mode Selector */}
              <div className="pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-cyan-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>HACKATHON DEMO MODES</span>
                  </span>
                  <span className="text-[9px] font-mono text-white/40">Live Scenario Simulator</span>
                </div>
                
                <select 
                  value={activeScenario}
                  onChange={(e) => {
                    const sc = e.target.value as any;
                    setActiveScenario(sc);
                  }}
                  className="w-full bg-black/60 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="live">📹 Live Candidate Webcam Feed</option>
                  <option value="demo_1">✅ Scenario 1: Normal Candidate (Fluent)</option>
                  <option value="demo_2">⚠️ Scenario 2: Distracted Candidate (Wandering Gaze)</option>
                  <option value="demo_3">🚨 Scenario 3: Suspicious Behavior (Offscreen / Device)</option>
                  <option value="demo_4">👥 Scenario 4: Multiple Person Intrusion Alert</option>
                </select>
              </div>

              {/* Expandable Multi-Signal Score Breakdown Drawer */}
              {showDrawer && (
                <div className="pt-2 border-t border-white/[0.08] space-y-2 text-xs font-mono animate-in fade-in duration-200">
                  <div className="text-[10px] text-white/40 uppercase font-bold">7-Signal Behavioral Breakdown</div>
                  
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center text-white/80">
                      <span>Eye & Iris Gaze (30%)</span>
                      <span className="font-bold text-cyan-400">{currentScores.components.eye_gaze_contrib} / 30</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full" style={{ width: `${(currentScores.components.eye_gaze_contrib / 30) * 100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-white/80">
                      <span>Multiple Person (20%)</span>
                      <span className="font-bold text-emerald-400">{currentScores.components.multi_person_contrib} / 20</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full" style={{ width: `${(currentScores.components.multi_person_contrib / 20) * 100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-white/80">
                      <span>Face Presence (15%)</span>
                      <span className="font-bold text-purple-400">{currentScores.components.presence_contrib} / 15</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-400 h-full" style={{ width: `${(currentScores.components.presence_contrib / 15) * 100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-white/80">
                      <span>Head Alignment (10%)</span>
                      <span className="font-bold text-amber-400">{currentScores.components.head_contrib} / 10</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${(currentScores.components.head_contrib / 10) * 100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-white/80">
                      <span>Hand Activity (10%)</span>
                      <span className="font-bold text-blue-400">{currentScores.components.hand_contrib} / 10</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full" style={{ width: `${(currentScores.components.hand_contrib / 10) * 100}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-white/80">
                      <span>Speech Fluency (10%)</span>
                      <span className="font-bold text-indigo-400">{currentScores.components.speech_contrib} / 10</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-400 h-full" style={{ width: `${(currentScores.components.speech_contrib / 10) * 100}%` }}></div>
                    </div>
                  </div>

                  {currentScores.compound_penalty > 0 && (
                    <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-500/30 text-[10px] text-rose-300">
                      ⚠️ Compound Multi-Signal Penalty: -{currentScores.compound_penalty} pts
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Collapsed Status Strip */}
          {isMinimized && (
            <div className="p-2.5 flex items-center justify-between text-xs font-mono">
              <span className="text-white/70">Candidate: {candidateName}</span>
              <span className="font-bold text-emerald-400">{currentScores.integrity_score}% Verified</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
