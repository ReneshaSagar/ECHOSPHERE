'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  Loader2, Briefcase, FileText, ClipboardList, Zap, ArrowRight,
} from 'lucide-react';
import { createSession } from '@/lib/api';

const AGORA_BLUE = '#00AEEF';

// ── Step metadata ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Job Details', icon: Briefcase },
  { id: 2, label: 'Resume',     icon: FileText },
  { id: 3, label: 'Rubric',     icon: ClipboardList },
  { id: 4, label: 'Mic Test',   icon: Mic },
];

const PILLAR_COLORS: Record<string, string> = {
  architecture:  '#06B6D4',
  product_sense: '#F59E0B',
  scalability:   '#8B5CF6',
  clarity:       '#10B981',
  ownership:     '#F97316',
};

// ── Shared input/textarea classes ─────────────────────────────────────────

const inputCls =
  'w-full bg-white border border-[#00AEEF]/30 px-4 py-3 outline-none ' +
  'focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/10 ' +
  'transition-all text-[#102a3a] placeholder:text-[#8baab8] text-sm';

// ── Buttons ───────────────────────────────────────────────────────────────

function PrimaryBtn({
  onClick, disabled, children,
}: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-6 py-3 bg-[#00AEEF] hover:bg-[#008fca]
        text-white text-sm font-bold transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function SecondaryBtn({
  onClick, children,
}: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-3 border border-[#00AEEF]/30
        text-[#527080] text-sm font-semibold hover:border-[#00AEEF]
        hover:text-[#102a3a] transition-colors bg-white"
    >
      {children}
    </button>
  );
}

// ── Step 1: Job Details ───────────────────────────────────────────────────

function StepJobDetails({
  jobTitle, setJobTitle, jdText, setJdText, onNext,
}: {
  jobTitle: string; setJobTitle: (v: string) => void;
  jdText: string; setJdText: (v: string) => void;
  onNext: () => void;
}) {
  const valid = jobTitle.trim().length > 2 && jdText.trim().length > 20;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF] mb-2">
          Step 01
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a] mb-1">
          Job Details
        </h2>
        <p className="text-sm text-[#527080]">
          Tell us about the role so the AI panel can tailor their questions.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#102a3a]">
          Job Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Senior Backend Engineer"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#102a3a]">
          Job Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={7}
          placeholder="Paste the full job description here. The more detail, the better the rubric and questions."
          className={`${inputCls} resize-none`}
        />
        <p className="text-xs text-[#8baab8]">{jdText.length} chars — aim for 200+</p>
      </div>

      <div className="flex justify-end">
        <PrimaryBtn onClick={onNext} disabled={!valid}>
          Next <ChevronRight className="w-4 h-4" />
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── Step 2: Resume ────────────────────────────────────────────────────────

function StepResume({
  resumeText, setResumeText, onBack, onNext, loading,
}: {
  resumeText: string; setResumeText: (v: string) => void;
  onBack: () => void; onNext: () => void; loading: boolean;
}) {
  const valid = resumeText.trim().length > 50;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF] mb-2">
          Step 02
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a] mb-1">
          Candidate Resume
        </h2>
        <p className="text-sm text-[#527080]">
          Paste the candidate&apos;s resume to help the panel tailor their behavioral probes.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#102a3a]">
          Resume Text <span className="text-red-500">*</span>
        </label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={10}
          placeholder="Paste resume text here (plain text works best)..."
          className={`${inputCls} resize-none font-mono`}
        />
        <p className="text-xs text-[#8baab8]">{resumeText.length} chars</p>
      </div>

      <div className="flex justify-between">
        <SecondaryBtn onClick={onBack}>
          <ChevronLeft className="w-4 h-4" /> Back
        </SecondaryBtn>
        <PrimaryBtn onClick={onNext} disabled={!valid || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Rubric…
            </>
          ) : (
            <>
              Generate Rubric <Zap className="w-4 h-4" />
            </>
          )}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── Step 3: Rubric Preview ────────────────────────────────────────────────

type RubricPillar = { label: string; description: string; key_signals: string[] };
type RubricData = Record<string, RubricPillar | string>;

function StepRubric({
  rubric, onBack, onNext,
}: {
  rubric: RubricData; onBack: () => void; onNext: () => void;
}) {
  const pillars = Object.entries(rubric).filter(
    ([key, val]) => key !== 'opening_question' && typeof val === 'object',
  ) as [string, RubricPillar][];
  const openingQuestion =
    typeof rubric.opening_question === 'string' ? rubric.opening_question : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF] mb-2">
          Step 03
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a] mb-1">
          Your Evaluation Rubric
        </h2>
        <p className="text-sm text-[#527080]">
          AI-generated based on the JD + resume. The panel will score across these 5 pillars.
        </p>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {pillars.map(([key, pillar], i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-4 bg-white border"
            style={{ borderColor: `${PILLAR_COLORS[key] ?? '#94A3B8'}50` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 flex-shrink-0"
                style={{ backgroundColor: PILLAR_COLORS[key] ?? '#94A3B8' }}
              />
              <span className="font-semibold text-[#102a3a] text-sm">{pillar.label}</span>
            </div>
            <p className="text-xs text-[#527080] mb-2">{pillar.description}</p>
            <div className="flex flex-wrap gap-1">
              {pillar.key_signals?.map((sig, si) => (
                <span
                  key={si}
                  className="text-[10px] px-2 py-0.5 bg-[#f0faff] border border-[#00AEEF]/20 text-[#087fb5] font-medium"
                >
                  {sig}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {openingQuestion && (
        <div className="p-4 border border-[#00AEEF]/30 bg-[#00AEEF]/5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00AEEF] mb-1">
            Opening Question (Alex)
          </p>
          <p className="text-sm text-[#385463] italic">&ldquo;{openingQuestion}&rdquo;</p>
        </div>
      )}

      <div className="flex justify-between">
        <SecondaryBtn onClick={onBack}>
          <ChevronLeft className="w-4 h-4" /> Back
        </SecondaryBtn>
        <PrimaryBtn onClick={onNext}>
          Proceed to Mic Test <ChevronRight className="w-4 h-4" />
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── Step 4: Mic Test ──────────────────────────────────────────────────────

function StepMicTest({ onBack, onLaunch }: { onBack: () => void; onLaunch: () => void }) {
  const [micStatus, setMicStatus] = useState<'idle' | 'testing' | 'granted' | 'denied'>('idle');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const testMic = useCallback(async () => {
    setMicStatus('testing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices(devs.filter((d) => d.kind === 'audioinput'));
      setMicStatus('granted');
    } catch {
      setMicStatus('denied');
    }
  }, []);

  useEffect(() => { testMic(); }, [testMic]);

  return (
    <div className="flex flex-col gap-6 items-center py-4">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF] mb-2">
          Step 04
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a] mb-1">
          Microphone Test
        </h2>
        <p className="text-sm text-[#527080]">Ensure your mic is ready before joining the panel.</p>
      </div>

      {/* Mic status indicator */}
      <div className="relative w-28 h-28">
        {micStatus === 'testing' && (
          <div
            className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${AGORA_BLUE} transparent transparent transparent` }}
          />
        )}
        <div
          className={`absolute inset-2 flex items-center justify-center transition-colors ${
            micStatus === 'granted'
              ? 'bg-emerald-500/15'
              : micStatus === 'denied'
              ? 'bg-red-500/15'
              : 'bg-[#00AEEF]/10'
          }`}
        >
          {micStatus === 'granted' ? (
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          ) : micStatus === 'denied' ? (
            <AlertCircle className="w-12 h-12 text-red-500" />
          ) : (
            <Mic className="w-10 h-10 text-[#00AEEF]" />
          )}
        </div>
      </div>

      <div className="text-center text-sm">
        {micStatus === 'granted' && (
          <p className="text-emerald-600 font-semibold">✓ Microphone access granted</p>
        )}
        {micStatus === 'denied' && (
          <p className="text-red-500">⚠ Mic blocked — enable in browser settings</p>
        )}
        {micStatus === 'testing' && (
          <p className="text-[#8baab8]">Requesting microphone access…</p>
        )}
      </div>

      {devices.length > 0 && (
        <div className="w-full max-w-sm">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#527080] mb-2">
            Available Microphones
          </label>
          <select
            className="w-full bg-white border border-[#00AEEF]/30 px-4 py-2.5 text-sm
              text-[#102a3a] outline-none focus:border-[#00AEEF]"
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {micStatus === 'denied' && (
        <button
          onClick={testMic}
          className="text-xs text-[#00AEEF] underline underline-offset-2"
        >
          Retry
        </button>
      )}

      <div className="flex justify-between w-full mt-2">
        <SecondaryBtn onClick={onBack}>
          <ChevronLeft className="w-4 h-4" /> Back
        </SecondaryBtn>
        <button
          onClick={onLaunch}
          disabled={micStatus === 'denied' || micStatus === 'testing'}
          className="flex items-center gap-2 px-8 py-3 bg-[#00AEEF] hover:bg-[#008fca]
            text-white font-bold text-sm transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4" />
          Launch Interview
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main SetupPage ────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [jobTitle, setJobTitle] = useState('');
  const [jdText, setJdText] = useState('');
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsFeedback, setAtsFeedback] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rubric, setRubric] = useState<any>(null);
  const [dynamicPersonas, setDynamicPersonas] = useState<any>(null);

  const [videoActive, setVideoActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, []);

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0];
    } else if (e.target.files) {
      file = e.target.files[0];
    }

    if (!file || file.type !== 'application/pdf') return;
    setResumeFile(file);
  };

  const handleGenerateSession = async () => {
    if (!jobTitle || !jdText || !resumeFile) return;
    setIsCreatingSession(true);
    try {
      const res = await createSession({ job_title: jobTitle, jd_text: jdText, resume_text: resumeText });
      setSessionId(res.session_id);
      setRubric(res.rubric as unknown as Record<string, { label: string; description: string; key_signals: string[] }>);
      nextStep();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create session';
      setError(msg);
      setSessionId(`demo_${Date.now()}`);
      setRubric({
        architecture:  { label: 'Architecture & System Design', description: 'Probe distributed system knowledge.', key_signals: ['CAP theorem', 'Sharding', 'Fault tolerance'] },
        product_sense: { label: 'Product & Business Sense', description: 'Evaluate ROI and user awareness.', key_signals: ['User journey', 'ROI', 'Feature priority'] },
        scalability:   { label: 'Scalability & Performance', description: 'Assess scale thinking.', key_signals: ['Load estimation', 'Bottleneck ID', 'Optimization'] },
        clarity:       { label: 'Communication & Clarity', description: 'Measure articulation clarity.', key_signals: ['Structured answers', 'Conciseness', 'No jargon'] },
        ownership:     { label: 'Ownership & Leadership', description: 'Evaluate accountability depth.', key_signals: ['Concrete examples', 'Personal contribution', 'Outcomes'] },
      });
      setSessionId(res.session_id);
      setRubric(res.rubric);
      setAtsScore(res.ats_score);
      setAtsFeedback(res.ats_feedback);
      setDynamicPersonas(res.dynamic_personas);
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const initAVTest = async () => {
    setDeviceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoActive(true);
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / bufferLength;
        if (avg > 5) setAudioActive(true);
        
        ctx.fillStyle = '#040508';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const barWidth = (canvasRef.current.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvasRef.current.height;
          ctx.fillStyle = '#6366F1';
          ctx.fillRect(x, canvasRef.current.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
        
        animationRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (err) {
      console.error(err);
      setDeviceError('Could not access microphone or camera. Please verify system permissions.');
    }
  };

  const handleLaunch = () => {
    if (!sessionId) return;
    // Persist configuration in sessionStorage for the room page
    sessionStorage.setItem(`omnipanel_rubric_${sessionId}`, JSON.stringify(rubric));
    sessionStorage.setItem(`omnipanel_personas_${sessionId}`, JSON.stringify(dynamicPersonas));
    sessionStorage.setItem(`omnipanel_ats_${sessionId}`, JSON.stringify({ score: atsScore, feedback: atsFeedback }));
    
    stopMedia();
    router.push(`/room/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-[#fbfdff] flex flex-col items-center py-20 px-6">
      {/* ── Subtle grid overlay (matches landing) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.04]
          [background-image:linear-gradient(#00AEEF_1px,transparent_1px),linear-gradient(90deg,#00AEEF_1px,transparent_1px)]
          [background-size:72px_72px]"
      />

      <div className="relative z-10 w-full max-w-2xl">
        {/* ── Header */}
        <div className="text-center mb-10">
          <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#087fb5]">
            <span className="grid h-5 w-5 place-items-center bg-[#00AEEF] text-white text-[9px]">+</span>
            OmniPanel AI
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[#102a3a] mb-2">
            Setup Your Interview
          </h1>
          <p className="text-sm text-[#527080]">4 quick steps to launch your AI panel session</p>
        </div>

        {/* ── Step indicators */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                    done
                      ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25'
                      : active
                      ? 'bg-[#00AEEF]/10 text-[#00AEEF] border border-[#00AEEF]/30'
                      : 'bg-white border border-[#00AEEF]/15 text-[#8baab8]'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 transition-colors ${
                      done ? 'bg-emerald-400/40' : 'bg-[#00AEEF]/15'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Error banner */}
        {error && (
          <div className="mb-4 p-3 border border-amber-400/30 bg-amber-50 text-amber-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            API unavailable — using demo mode. {error}
          </div>
        ))}
      </div>

        {/* ── Step card */}
        <div className="bg-white border border-[#00AEEF]/25 p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Step 01 / Job Specifications</span>
                <h2 className="text-2xl font-bold mt-1 text-white tracking-tight">Enter Role Details</h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Job Title</label>
                  <input 
                    type="text" 
                    value={jobTitle} 
                    onChange={e => setJobTitle(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500/40 rounded-xl p-3 text-sm text-slate-100 outline-none transition-colors" 
                    placeholder="e.g. Lead Machine Learning Engineer" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Job Description</label>
                  <textarea 
                    value={jdText} 
                    onChange={e => setJdText(e.target.value)} 
                    rows={5} 
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500/40 rounded-xl p-3 text-sm text-slate-100 outline-none transition-colors resize-none" 
                    placeholder="Paste the core requirements and goals of this position here..." 
                  />
                </div>
                <button 
                  onClick={() => setStep(2)} 
                  disabled={!jobTitle || !jdText} 
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg"
                >
                  Configure Resume <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: PDF Resume OCR */}
          {step === 2 && (
            <motion.div 
              key="step2" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }} 
              className="glass-panel p-8"
            >
              <div className="mb-6">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Step 02 / OCR Profile Parser</span>
                <h2 className="text-2xl font-bold mt-1 text-white tracking-tight">Upload PDF Resume</h2>
              </div>
              
              {!resumeFile ? (
                <div className="space-y-4">
                  <div 
                    className="border border-dashed border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center text-slate-450 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all cursor-pointer"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleFileUpload}
                    onClick={() => document.getElementById('resume-pdf-upload')?.click()}
                  >
                    <input id="resume-pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                    <UploadCloud size={40} className="mb-3 text-slate-500" />
                    <p className="font-semibold text-sm text-slate-350">Drag & Drop PDF Profile</p>
                    <p className="text-xs text-slate-500 mt-1">Accepts native resume documents</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-350 hover:underline block text-center w-full">
                    Go Back to Specifications
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                    <FileText className="text-indigo-400 flex-shrink-0" size={28} />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-semibold text-sm truncate text-slate-200">{resumeFile.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(resumeFile.size / 1024).toFixed(1)} KB • Ready for matching</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setResumeFile(null)} 
                      className="flex-1 py-3 border border-slate-900 hover:bg-slate-950 font-semibold rounded-xl text-xs transition-colors"
                    >
                      Clear File
                    </button>
                    <button 
                      onClick={handleGenerateSession} 
                      disabled={isCreatingSession} 
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isCreatingSession ? 'Extracting Profiles...' : 'Analyze Rubrics'} <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer */}
        <div className="mt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-[#8baab8]">
          <span>OmniPanel AI / EchoSphere</span>
          <span className="text-[#00AEEF]">Voice is the interface</span>
        </div>
      </div>
    </div>
  );
}
