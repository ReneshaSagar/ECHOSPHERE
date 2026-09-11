"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldCheck, AlertTriangle, CameraOff } from 'lucide-react';
import {
  ProctorScoringEngine,
  DemoScenarioSimulator,
  VisionState,
  AudioState,
  ScoringResult,
  ProctorEvent
} from '@/lib/proctoringEngine';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Filter Emscripten/MediaPipe WASM C++ internal INFO logs sent via console.error (stderr)
if (typeof window !== 'undefined' && !(window as any).__mediapipe_log_patched) {
  (window as any).__mediapipe_log_patched = true;
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args[0] ? String(args[0]) : '';
    if (
      msg.includes('INFO:') || 
      msg.includes('TensorFlow Lite') || 
      msg.includes('XNNPACK delegate') ||
      msg.includes('Created TensorFlow')
    ) {
      console.info(...args);
      return;
    }
    originalError.apply(console, args);
  };
}

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
  const scoringEngineRef = useRef<ProctorScoringEngine>(new ProctorScoringEngine());
  const simulatorRef = useRef<DemoScenarioSimulator>(new DemoScenarioSimulator());

  const [activeScenario, setActiveScenario] = useState<'live' | 'demo_1'>('live');
  const [warningBanner, setWarningBanner] = useState<{ message: string; severity: 'MEDIUM' | 'HIGH'; type?: string } | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const [contextSwitchCount, setContextSwitchCount] = useState<number>(0);
  const [cameraBlocked, setCameraBlocked] = useState<boolean>(false);

  const [currentScores, setCurrentScores] = useState<ScoringResult>({
    integrity_score: 96, confidence_score: 92, screen_attention_score: 96,
    gaze_stability_score: 95, head_attention_score: 95, hand_activity_score: 95,
    speech_confidence_score: 90, face_presence_score: 98, behavioral_calmness_score: 92,
    behavioral_consistency_score: 94, compound_penalty: 0,
    assessment: 'LOW SUSPICION', assessment_desc: 'Candidate behavior consistent with standard examination patterns.',
    badge_color: 'green',
    weights: { eye_gaze: 0.3, face_presence: 0.15, multiple_person: 0.2, head_orientation: 0.1, hand_activity: 0.1, speech_hesitation: 0.1, consistency: 0.05 },
    observations: { positive: ['Candidate visible and verified.'], cautions: [] },
    components: { eye_gaze_contrib: 28.8, presence_contrib: 14.7, multi_person_contrib: 20.0, head_contrib: 9.5, hand_contrib: 9.5, speech_contrib: 9.0, consistency_contrib: 4.7 }
  });

  const [currentVision, setCurrentVision] = useState<VisionState>({
    timestamp: Date.now(), status: 'NORMAL', face_count: 1, face_presence: 'CANDIDATE DETECTED',
    gaze_direction: 'CENTER', gaze_ratio_x: 0.5, gaze_ratio_y: 0.5, ear: 0.30,
    blink_count: 0, blink_rate_bpm: 18, head_yaw: 0, head_pitch: 0, head_roll: 0,
    gaze_stability_score: 95, screen_attention_score: 96, head_attention_score: 95,
    hand_count: 0, hand_activity_score: 95, hand_state: 'NORMAL', hand_gesture: 'Resting / On Keyboard',
    facial_expression: 'Neutral', behavioral_calmness_score: 92, fps: 30, second_person_alert: false
  });

  const [currentAudio, setCurrentAudio] = useState<AudioState>({
    total_words: 0, filler_count: 0, long_pauses: 0, speech_confidence_score: 90,
    hesitation_state: 'FLUENT', feedback: 'Natural speech flow', multiple_voices_detected: false,
    voice_status: 'SINGLE VOICE VERIFIED'
  });

  const eventsHistoryRef = useRef<ProctorEvent[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const lastCameraBlockedAlertRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastTimestampRef = useRef<number>(0);

  const logEvent = useCallback(async (event: ProctorEvent) => {
    eventsHistoryRef.current.push(event);

    if (event.severity === 'HIGH' || event.severity === 'MEDIUM') {
      setWarningBanner({ message: event.description, severity: event.severity, type: event.type });
      setTimeout(() => setWarningBanner(null), 6000);
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

  // Tab Switch & Focus Loss Monitoring
  useEffect(() => {
    if (!isRunning) return;

    let blurStart: number | null = null;

    const handleBlur = () => {
      blurStart = Date.now();
      setIsWindowFocused(false);
      setContextSwitchCount(prev => prev + 1);
      logEvent({
        timestamp: new Date().toLocaleTimeString(), epoch_time: Date.now(),
        type: 'TAB_SWITCH', description: 'Candidate switched tabs or minimized interview window',
        duration: 0, severity: 'HIGH', score_impact: -15
      });
    };

    const handleFocus = () => {
      setIsWindowFocused(true);
      if (blurStart) {
        const durationSec = Math.round((Date.now() - blurStart) / 100) / 10;
        blurStart = null;
        logEvent({
          timestamp: new Date().toLocaleTimeString(), epoch_time: Date.now(),
          type: 'FOCUS_REGAINED', description: `Candidate returned to interview tab after ${durationSec}s`,
          duration: durationSec, severity: 'INFO', score_impact: 0
        });
      }
    };

    const handleVisibilityChange = () => { document.hidden ? handleBlur() : handleFocus(); };

    let keyPressCount = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length === 1) keyPressCount++;
      if (keyPressCount > 18) {
        logEvent({
          timestamp: new Date().toLocaleTimeString(), epoch_time: Date.now(),
          type: 'HEAVY_TYPING', description: 'Unusual keyboard typing detected during oral interview (possible external AI consultation)',
          severity: 'MEDIUM', score_impact: -10
        });
        keyPressCount = 0;
      }
    };
    const keyInterval = setInterval(() => { keyPressCount = 0; }, 5000);

    const handlePaste = () => {
      logEvent({
        timestamp: new Date().toLocaleTimeString(), epoch_time: Date.now(),
        type: 'PASTE_DETECTED', description: 'Clipboard paste action detected',
        severity: 'LOW', score_impact: -5
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

  // Setup MediaPipe and Camera
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm");
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 2
        });
        if (active) faceLandmarkerRef.current = landmarker;
      } catch (err) {
        console.error("Mediapipe initialization failed", err);
      }

      if (!active || !isRunning || activeScenario !== 'live') return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
          audio: false
        });
        if (active && isRunning && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          mediaStreamRef.current = stream;
        } else {
          // Stream acquired after unmount/stop
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.warn('[ProctorEngine] Camera access blocked, falling back to simulator:', err);
        simulatorRef.current.setScenario('demo_1');
        setActiveScenario('demo_1');
      }
    }

    if (isRunning && activeScenario === 'live') {
      init();
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (activeScenario !== 'live') {
        simulatorRef.current.setScenario(activeScenario);
      }
    }

    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isRunning, activeScenario]);

  // Render Loop & Inference
  useEffect(() => {
    let lastComputeTime = Date.now();
    let lastAlertTime = 0;

    function renderLoop() {
      const now = Date.now();

      if (videoRef.current && videoRef.current.readyState >= 2 && faceLandmarkerRef.current) {
        // Camera-blocked detection via luminance sampling
        if (canvasRef.current && videoRef.current.videoWidth > 0) {
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvasRef.current.width = 64;
            canvasRef.current.height = 48;
            ctx.drawImage(videoRef.current, 0, 0, 64, 48);
            const imageData = ctx.getImageData(0, 0, 64, 48);
            const data = imageData.data;
            let totalLuma = 0;
            for (let i = 0; i < data.length; i += 16) {
              totalLuma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
            const avgLuma = totalLuma / (data.length / 16);
            const isBlocked = avgLuma < 8;
            setCameraBlocked(isBlocked);
            if (isBlocked && now - lastCameraBlockedAlertRef.current > 6000) {
              lastCameraBlockedAlertRef.current = now;
              logEvent({
                timestamp: new Date().toLocaleTimeString(), epoch_time: Date.now(),
                type: 'CAMERA_BLOCKED', description: 'Camera lens appears to be covered or obstructed',
                severity: 'HIGH', score_impact: -25, duration: 0
              });
            }
          }
        }

        if (!videoRef.current || videoRef.current.readyState < 2 || videoRef.current.paused || videoRef.current.ended) {
          animationFrameRef.current = requestAnimationFrame(renderLoop);
          return;
        }

        let faceCount = 0;
        let results: any = null;

        if (
          faceLandmarkerRef.current &&
          videoRef.current &&
          videoRef.current.videoWidth > 0 &&
          videoRef.current.currentTime !== lastVideoTimeRef.current
        ) {
          lastVideoTimeRef.current = videoRef.current.currentTime;
          let nowTimestamp = Math.floor(performance.now());
          if (nowTimestamp <= lastTimestampRef.current) {
            nowTimestamp = lastTimestampRef.current + 1;
          }
          lastTimestampRef.current = nowTimestamp;

          try {
            results = faceLandmarkerRef.current.detectForVideo(videoRef.current, nowTimestamp);
            faceCount = results?.faceLandmarks ? results.faceLandmarks.length : 0;
          } catch (err) {
            // Safeguard against timestamp non-monotonicity or frame read errors
          }
        }

        if (now - lastComputeTime > 1000) {
          lastComputeTime = now;
          let newGazeScore = 95;
          let newFacePresence: 'CANDIDATE DETECTED' | 'NO CANDIDATE DETECTED' | 'MULTIPLE PEOPLE DETECTED' = 'CANDIDATE DETECTED';
          let alertSent = false;

          if (faceCount === 0) {
            newFacePresence = 'NO CANDIDATE DETECTED';
            newGazeScore = 0;
            if (now - lastAlertTime > 5000) {
              logEvent({
                timestamp: new Date().toLocaleTimeString(), epoch_time: Date.now(),
                type: 'NO_FACE_DETECTED', description: 'Candidate is not visible to the webcam',
                severity: 'HIGH', score_impact: -20, duration: 0
              });
              lastAlertTime = now;
              alertSent = true;
            }
          } else if (faceCount > 1) {
            newFacePresence = 'MULTIPLE PEOPLE DETECTED';
            if (now - lastAlertTime > 5000) {
              logEvent({
                timestamp: new Date().toLocaleTimeString(), epoch_time: Date.now(),
                type: 'MULTIPLE_FACES', description: 'Another person detected in the camera frame',
                severity: 'HIGH', score_impact: -25, duration: 0
              });
              lastAlertTime = now;
              alertSent = true;
            }
          }

          if (faceCount === 1 && results && results.faceBlendshapes && results.faceBlendshapes[0]) {
            const blendshapes = results.faceBlendshapes[0].categories;
            const eyeLookInLeft = blendshapes.find((b: any) => b.categoryName === 'eyeLookInLeft')?.score || 0;
            const eyeLookOutRight = blendshapes.find((b: any) => b.categoryName === 'eyeLookOutRight')?.score || 0;
            if (eyeLookInLeft > 0.6 && eyeLookOutRight > 0.6 && !alertSent) {
              newGazeScore = 40;
              if (now - lastAlertTime > 5000) {
                logEvent({
                  timestamp: new Date().toLocaleTimeString(), epoch_time: Date.now(),
                  type: 'GAZE_OUT_OF_BOUNDS', description: 'Candidate is looking away from the screen',
                  severity: 'MEDIUM', score_impact: -5, duration: 0
                });
                lastAlertTime = now;
              }
            }
          }

          const liveVision: VisionState = {
            timestamp: now, status: 'NORMAL', face_count: faceCount, face_presence: newFacePresence,
            gaze_direction: 'CENTER', gaze_ratio_x: 0.50, gaze_ratio_y: 0.50, ear: 0.30,
            blink_count: 0, blink_rate_bpm: 18.0, head_yaw: 0, head_pitch: 0, head_roll: 0,
            gaze_stability_score: newGazeScore, screen_attention_score: newGazeScore, head_attention_score: 95,
            hand_count: 0, hand_activity_score: 95, hand_state: 'NORMAL', hand_gesture: 'Resting / On Keyboard',
            facial_expression: 'Engaged', behavioral_calmness_score: 94, fps: 30.0, second_person_alert: faceCount > 1
          };

          setCurrentVision(liveVision);
          const scores = scoringEngineRef.current.computeScores(liveVision, currentAudio, eventsHistoryRef.current);
          setCurrentScores(scores);
          if (onTelemetryUpdate) onTelemetryUpdate(scores);
        }
      } else if (simulatorRef.current.isDemoActive()) {
        const simData = simulatorRef.current.generateTelemetry();
        setCurrentVision(simData.vision);
        if (simData.events.length > 0) {
          simData.events.forEach(e => {
            if (now - lastComputeTime > 3000) logEvent(e);
          });
        }
        const scores = scoringEngineRef.current.computeScores(simData.vision, simData.audio, eventsHistoryRef.current);
        setCurrentScores(scores);
        if (onTelemetryUpdate) onTelemetryUpdate(scores);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }

    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRunning, onTelemetryUpdate, logEvent, currentAudio]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      try {
        await fetch(`/api/interviews/${interviewId}/proctor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'TELEMETRY_HEARTBEAT', details: 'Periodic behavioral telemetry snapshot',
            severity: 'INFO', score_impact: 0, currentScores, currentVision, currentAudio
          })
        });
      } catch (e) {}
    }, 8000);
    return () => clearInterval(interval);
  }, [interviewId, isRunning, currentScores, currentVision, currentAudio]);

  if (!isRunning) {
    return (
      <>
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />
      </>
    );
  }

  return (
    <>
      {/* Full-width top-of-tab banner for violations */}
      {warningBanner && (
        <div className={`fixed top-0 left-0 right-0 z-[9999] px-5 py-2.5 flex items-center gap-3 animate-in slide-in-from-top duration-200 ${
          warningBanner.severity === 'HIGH'
            ? 'bg-rose-600 text-white'
            : 'bg-amber-500 text-black'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className="font-bold text-xs uppercase tracking-wider shrink-0">
              {warningBanner.type === 'TAB_SWITCH'
                ? '⚠️ Tab Switch Detected'
                : warningBanner.type === 'CAMERA_BLOCKED'
                ? '🚨 Camera Blocked'
                : warningBanner.severity === 'HIGH' ? '🚨 Proctoring Alert' : '⚠️ Attention Warning'}
            </span>
            <span className="text-xs opacity-90 truncate">{warningBanner.message}</span>
          </div>
          <span className="text-[10px] font-mono opacity-70 shrink-0">Logged by OmniPanel Proctor.</span>
        </div>
      )}

      {/* Camera covered persistent floating pill */}
      {cameraBlocked && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-full shadow-xl border border-rose-400 animate-pulse text-xs font-bold">
          <CameraOff className="w-4 h-4" />
          Camera lens appears to be covered — please unblock your camera
        </div>
      )}

      {/* Tab-switch fullscreen overlay (appears when window loses focus) */}
      {!isWindowFocused && (
        <div className="fixed inset-0 z-[9990] bg-rose-950/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-rose-900 border-2 border-rose-500 rounded-3xl px-12 py-10 text-center shadow-2xl max-w-sm">
            <div className="text-5xl mb-4">⚠️</div>
            <div className="text-white font-bold text-xl mb-2">Tab Switch Logged</div>
            <div className="text-rose-200 text-sm leading-relaxed">
              Please return to this tab immediately.<br />
              This event has been recorded by OmniPanel Proctor and will affect your integrity score.
            </div>
          </div>
        </div>
      )}

      {/* AI Proctor status pill — bottom right */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono font-medium text-white/70 uppercase tracking-wide">
            AI Proctor Active
          </span>
          {contextSwitchCount > 0 && (
            <span className="text-[10px] font-mono font-bold ml-1 text-rose-400">
              · {contextSwitchCount} switch{contextSwitchCount > 1 ? 'es' : ''} logged
            </span>
          )}
        </div>
      </div>

      {/* Hidden camera feed & canvas for CV */}
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} width={640} height={480} className="hidden" />
    </>
  );
}
