'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, PhoneOff, SidebarClose, SidebarOpen,
  AlertTriangle, ShieldCheck, ExternalLink, ChevronRight, Loader2,
} from 'lucide-react';
import dynamic from 'next/dynamic';

import AvatarCard from '@/components/room/AvatarCard';
import LiveTranscript from '@/components/room/LiveTranscript';
import { getToken, startAgents, endSession, advanceRound, stopAgent } from '@/lib/api';
import { initRTC, toggleMic, teardownRTC } from '@/lib/agora';
import type { TranscriptEntry, RoundConfig, DynamicPersona } from '@/lib/types';

const AudioVisualizer = dynamic(() => import('@/components/room/AudioVisualizer'), { ssr: false });

function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function hashColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = str.charCodeAt(i) + ((h << 5) - h); h = h & h; }
  const c = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];
  return c[Math.abs(h) % c.length];
}

export default function RoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  // Session state
  const [roundPlan, setRoundPlan] = useState<RoundConfig[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Audio/speaking
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<Record<number, number>>({});

  // Transcript
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [cheatAlerts, setCheatAlerts] = useState<string[]>([]);

  // Proctoring
  const [proctorOk, setProctorOk] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const activeAgentIds = useRef<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const currentRound: RoundConfig | undefined = roundPlan[currentRoundIdx];

  // ── Load round plan ──
  useEffect(() => {
    const stored = sessionStorage.getItem('omnipanel_round_plan');
    if (stored) {
      try { setRoundPlan(JSON.parse(stored)); } catch {}
    }
  }, []);

  // ── Timer ──
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── WebSocket telemetry ──
  useEffect(() => {
    if (!sessionId) return;
    const wsBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace('http', 'ws');
    const ws = new WebSocket(`${wsBase}/ws/telemetry/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => console.log('[WS] Connected');
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'ping') { ws.send(JSON.stringify({ type: 'pong' })); return; }
        const ev = data.event ?? data;
        if (ev.type === 'transcript_line') {
          setTranscript(prev => [...prev, {
            id: ev.id ?? String(Date.now()),
            speaker: ev.speaker,
            text: ev.text,
            timestamp: ev.timestamp ?? 0,
            vaguenessScore: ev.vagueness_score,
          }]);
        } else if (ev.type === 'speaker_change') {
          setActiveSpeaker(ev.speaker);
        } else if (ev.type === 'round_advanced') {
          setCurrentRoundIdx(ev.round_index);
        }
      } catch {}
    };
    ws.onerror = () => console.warn('[WS] Error');

    return () => ws.close();
  }, [sessionId]);

  // ── Initialize Agora RTC ──
  const initAgora = useCallback(async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? '';
    if (!appId) {
      console.error('[Agora] NEXT_PUBLIC_AGORA_APP_ID is not set');
      setIsConnecting(false);
      return;
    }
    try {
      const uid = Math.floor(Math.random() * 100000) + 1000;
      const tokenRes = await getToken({ channel_name: sessionId, uid });
      await initRTC(
        appId,
        sessionId,
        uid,
        tokenRes.rtc_token,
        (_user, _type) => {},
        (_user) => {},
        (remoteUid, level) => {
          setAudioLevels(prev => ({ ...prev, [remoteUid]: level }));
          if (level > 15 && currentRound) {
            const speaking = currentRound.personas.find(p => p.agent_uid === remoteUid);
            if (speaking) setActiveSpeaker(speaking.name);
          }
        },
      );
      setIsConnected(true);
      console.log('[Agora] Joined channel:', sessionId);
    } catch (err) {
      console.error('[Agora] Init failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [sessionId, isConnecting, isConnected, currentRound]);

  // ── Start AI agents ──
  const startAIAgents = useCallback(async (roundIndex: number) => {
    if (!sessionId) return;
    try {
      const res = await startAgents({ session_id: sessionId, channel_name: sessionId, round_index: roundIndex });
      activeAgentIds.current = res.agent_ids;
      console.log('[Agents] Started:', res.agent_ids);
    } catch (err) {
      console.error('[Agents] Failed to start:', err);
    }
  }, [sessionId]);

  // ── Start camera + proctoring ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setProctorOk(true);
      }
      // MediaPipe face tracking (best-effort)
      try {
        await new Promise<void>((resolve, reject) => {
          if ((window as any).FaceLandmarker) return resolve();
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.js';
          s.crossOrigin = 'anonymous';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('MediaPipe CDN failed'));
          document.head.appendChild(s);
        });
        let attempts = 0;
        await new Promise<void>(resolve => {
          const check = setInterval(() => {
            if ((window as any).FaceLandmarker || attempts++ > 30) { clearInterval(check); resolve(); }
          }, 300);
        });
        console.log('[MediaPipe] Available:', !!(window as any).FaceLandmarker);
      } catch (err) {
        console.warn('[MediaPipe] Could not load, using fallback:', err);
      }
    } catch {
      console.warn('[Camera] Access denied, proctoring degraded');
    }
  }, []);

  // ── Screen recording ──
  const startScreenRecording = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const recorder = new MediaRecorder(displayStream, { mimeType: 'video/webm;codecs=vp9' });
      recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      console.log('[Screen] Recording started');
    } catch (err) {
      console.warn('[Screen] Recording not started:', err);
    }
  }, []);

  // ── Initialize on mount ──
  useEffect(() => {
    if (!sessionId) return;
    startCamera();
    initAgora();
    // Auto-start agents for first non-OA round
    const roundPlanStored = sessionStorage.getItem('omnipanel_round_plan');
    if (roundPlanStored) {
      const plan: RoundConfig[] = JSON.parse(roundPlanStored);
      const firstAgentRound = plan.findIndex(r => r.type !== 'oa');
      if (firstAgentRound >= 0) {
        setTimeout(() => startAIAgents(firstAgentRound), 2000);
      }
    }
    return () => { teardownRTC(); };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle round advance ──
  const handleAdvanceRound = useCallback(async () => {
    if (isAdvancing || !sessionId) return;
    setIsAdvancing(true);
    // Stop current agents
    for (const agentId of Object.values(activeAgentIds.current)) {
      try { await stopAgent(agentId); } catch {}
    }
    activeAgentIds.current = {};
    setActiveSpeaker(null);

    try {
      const res = await advanceRound(sessionId);
      if (res.status === 'completed') {
        router.push(`/report/${sessionId}`);
        return;
      }
      const newIdx = res.round_index;
      setCurrentRoundIdx(newIdx);
      // Start agents for new round
      const newRound = roundPlan[newIdx];
      if (newRound && newRound.type !== 'oa') {
        await startAIAgents(newIdx);
      }
    } catch (err) {
      console.error('[Round] Advance failed:', err);
    } finally {
      setIsAdvancing(false);
    }
  }, [sessionId, isAdvancing, roundPlan, router, startAIAgents]);

  // ── End interview ──
  const handleEndInterview = useCallback(async () => {
    if (isEnding) return;
    setIsEnding(true);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    await teardownRTC();
    try { await endSession(sessionId); } catch {}
    router.push(`/report/${sessionId}`);
  }, [sessionId, isEnding, router]);

  const handleMicToggle = useCallback(async () => {
    const muted = await toggleMic();
    setIsMicMuted(muted);
  }, []);

  // ── OA Round UI ──
  const renderOARound = () => (
    <div className="flex-1 flex gap-4 p-4 min-h-0">
      {/* Left: webcam + proctoring */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        <div className="meet-card" style={{ aspectRatio: '4/3', position: 'relative' }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
          {proctorOk && (
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <span className="pill pill-green" style={{ fontSize: '0.6rem' }}>
                <ShieldCheck size={10} /> Proctored
              </span>
            </div>
          )}
        </div>
        <div className="glass-card p-3">
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Proctoring Active</p>
          {cheatAlerts.slice(-3).map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={10} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>{a}</span>
            </div>
          ))}
          {cheatAlerts.length === 0 && (
            <p style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>No issues detected</p>
          )}
        </div>
        <button className="btn-ghost" onClick={startScreenRecording} style={{ fontSize: '0.75rem', padding: '8px 14px' }}>
          Share Screen
        </button>
      </div>

      {/* Right: coding platform iframe */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{currentRound?.label}</span>
          {currentRound?.platform_url && (
            <a href={currentRound.platform_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.7rem', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open externally <ExternalLink size={11} />
            </a>
          )}
        </div>
        {currentRound?.platform_url ? (
          <iframe
            src={currentRound.platform_url}
            style={{ flex: 1, border: 'none' }}
            allow="clipboard-read; clipboard-write"
            title="Coding Assessment"
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Online Assessment Platform</p>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.78rem' }}>Complete your assessment then click Submit below.</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Interview Round UI ──
  const renderInterviewRound = () => {
    const personas = currentRound?.personas ?? [];
    return (
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* Video grid */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Grid */}
          <div className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: `repeat(${Math.min(personas.length + 1, 4)}, 1fr)` }}>
            {/* Candidate */}
            <div className="meet-card" style={{ position: 'relative' }}>
              <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 99, color: '#fff' }}>
                  You
                </span>
                {isMicMuted && <MicOff size={12} style={{ color: '#ef4444' }} />}
              </div>
              {proctorOk && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <span className="pill pill-green" style={{ fontSize: '0.6rem' }}><ShieldCheck size={10} /> Live</span>
                </div>
              )}
            </div>

            {/* AI Persona cards */}
            {personas.map((persona: DynamicPersona) => (
              <AvatarCard
                key={persona.agent_uid}
                persona={persona}
                isActive={activeSpeaker === persona.name}
                isThinking={false}
              />
            ))}
          </div>

          {/* Audio visualizer */}
          <div className="glass-card" style={{ height: 60, padding: '8px 12px' }}>
            <AudioVisualizer
              activeSpeaker={activeSpeaker}
              audioLevels={Object.fromEntries(Object.entries(audioLevels).map(([k, v]) => [String(k), v]))}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dot-grid" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid var(--border)', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(16px)', flexShrink: 0 }}>
        {/* Round pills */}
        <div className="flex items-center gap-2">
          {roundPlan.map((r, i) => (
            <div key={i} style={{
              padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 600,
              background: i === currentRoundIdx ? 'var(--accent)' : i < currentRoundIdx ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
              color: i === currentRoundIdx ? '#fff' : i < currentRoundIdx ? 'var(--accent-light)' : 'var(--text-subtle)',
              border: '1px solid ' + (i === currentRoundIdx ? 'var(--accent)' : 'var(--border)'),
            }}>
              {i + 1}. {r.label}
            </div>
          ))}
        </div>

        {/* Right: alerts + timer + sidebar toggle */}
        <div className="flex items-center gap-3">
          {cheatAlerts.length > 0 && (
            <span className="pill pill-red" style={{ fontSize: '0.65rem' }}>
              <AlertTriangle size={10} /> {cheatAlerts.length} alerts
            </span>
          )}
          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 600 }}>
            {formatTime(elapsed)}
          </span>
          {isConnected ? (
            <span className="pill pill-green" style={{ fontSize: '0.6rem' }}><span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" /> Live</span>
          ) : isConnecting ? (
            <span className="pill pill-amber" style={{ fontSize: '0.6rem' }}><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Connecting</span>
          ) : null}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            {sidebarOpen ? <SidebarClose size={17} /> : <SidebarOpen size={17} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* Round content */}
          {currentRound?.type === 'oa' ? renderOARound() : renderInterviewRound()}

          {/* Footer dock */}
          <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderTop: '1px solid var(--border)', background: 'rgba(8,8,16,0.95)', flexShrink: 0 }}>
            <div className="flex items-center gap-3">
              <button
                onClick={handleMicToggle}
                className={isMicMuted ? 'btn-ghost' : 'btn-primary'}
                style={{ padding: '8px 18px', fontSize: '0.82rem', borderRadius: 99 }}
              >
                {isMicMuted ? <><MicOff size={14} /> Unmute</> : <><Mic size={14} /> Mute</>}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {currentRoundIdx < roundPlan.length - 1 && (
                <button
                  className="btn-ghost"
                  onClick={handleAdvanceRound}
                  disabled={isAdvancing}
                  style={{ fontSize: '0.82rem', padding: '8px 18px' }}
                >
                  {isAdvancing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Next Round <ChevronRight size={14} />
                </button>
              )}
              <button
                onClick={handleEndInterview}
                disabled={isEnding}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 99, color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <PhoneOff size={14} /> End Interview
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ borderLeft: '1px solid var(--border)', background: 'rgba(8,8,16,0.95)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Live Transcript</span>
              </div>
              <LiveTranscript entries={transcript} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
