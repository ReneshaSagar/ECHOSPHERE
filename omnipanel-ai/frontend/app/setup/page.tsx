'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  'w-full bg-white dark:bg-[#090D16] border border-[#00AEEF]/30 dark:border-slate-700/60 px-4 py-3 outline-none ' +
  'focus:border-[#00AEEF] dark:focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/10 ' +
  'transition-all text-[#102a3a] dark:text-slate-100 placeholder:text-[#8baab8] dark:placeholder:text-slate-500 text-sm';

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
      className="flex items-center gap-2 px-5 py-3 border border-[#00AEEF]/30 dark:border-slate-700
        text-[#527080] dark:text-slate-400 text-sm font-semibold hover:border-[#00AEEF] dark:hover:border-slate-500
        hover:text-[#102a3a] dark:hover:text-slate-200 transition-colors bg-white dark:bg-[#090D16]"
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
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a] dark:text-slate-100 mb-1">
          Job Details
        </h2>
        <p className="text-sm text-[#527080] dark:text-slate-400">
          Tell us about the role so the AI panel can tailor their questions.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#102a3a] dark:text-slate-300">
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
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#102a3a] dark:text-slate-300">
          Job Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={7}
          placeholder="Paste the full job description here. The more detail, the better the rubric and questions."
          className={`${inputCls} resize-none`}
        />
        <p className="text-xs text-[#8baab8] dark:text-slate-500">{jdText.length} chars — aim for 200+</p>
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
  resumeText, setResumeText,
  resumeFile, setResumeFile,
  resumeLink, setResumeLink,
  onBack, onNext, loading,
}: {
  resumeText: string; setResumeText: (v: string) => void;
  resumeFile: File | null; setResumeFile: (v: File | null) => void;
  resumeLink: string; setResumeLink: (v: string) => void;
  onBack: () => void; onNext: () => void; loading: boolean;
}) {
  const [mode, setMode] = useState<'file' | 'link' | 'text'>('file');

  const valid = mode === 'file' ? !!resumeFile :
                mode === 'link' ? resumeLink.trim().length > 5 :
                resumeText.trim().length > 50;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF] mb-2">
          Step 02
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a] dark:text-slate-100 mb-1">
          Candidate Resume
        </h2>
        <p className="text-sm text-[#527080] dark:text-slate-400">
          Upload a PDF, link to Google Drive, or paste the candidate&apos;s resume text.
        </p>
      </div>

      <div className="flex gap-4 border-b border-[#00AEEF]/20 pb-2">
        {(['file', 'link', 'text'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-sm font-semibold uppercase tracking-wider transition-colors ${mode === m ? 'text-[#00AEEF] border-b-2 border-[#00AEEF]' : 'text-[#8baab8] dark:text-slate-500 hover:text-[#00AEEF]/70 dark:hover:text-[#00AEEF]'}`}
          >
            {m === 'file' ? 'PDF Upload' : m === 'link' ? 'Drive Link' : 'Paste Text'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 min-h-[200px]">
        {mode === 'file' && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#00AEEF]/30 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 h-48 rounded-lg p-6">
            <input 
              type="file" 
              accept="application/pdf"
              id="resume-upload"
              className="hidden"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#f0faff] dark:bg-[#00AEEF]/10 rounded-full flex items-center justify-center mb-3 text-[#00AEEF]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <span className="text-sm font-semibold text-[#102a3a] dark:text-slate-200">{resumeFile ? resumeFile.name : 'Click to upload PDF resume'}</span>
            </label>
            {resumeFile && (
              <button onClick={() => setResumeFile(null)} className="mt-4 text-xs text-red-500 hover:underline">
                Remove file
              </button>
            )}
          </div>
        )}

        {mode === 'link' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#102a3a] dark:text-slate-300">
              Google Drive / External Link <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={resumeLink}
              onChange={(e) => setResumeLink(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className={`${inputCls}`}
            />
            <p className="text-xs text-[#8baab8] dark:text-slate-500">Make sure the link is publicly accessible so the Orchestrator can read it.</p>
          </div>
        )}

        {mode === 'text' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#102a3a] dark:text-slate-300">
              Resume Text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={8}
              placeholder="Paste resume text here (plain text works best)..."
              className={`${inputCls} resize-none font-mono`}
            />
          </div>
        )}
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
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a] dark:text-slate-100 mb-1">
          Your Evaluation Rubric
        </h2>
        <p className="text-sm text-[#527080] dark:text-slate-400">
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
            className="p-4 bg-white dark:bg-[#090D16] border"
            style={{ borderColor: `${PILLAR_COLORS[key] ?? '#94A3B8'}50` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 flex-shrink-0"
                style={{ backgroundColor: PILLAR_COLORS[key] ?? '#94A3B8' }}
              />
              <span className="font-semibold text-[#102a3a] dark:text-slate-200 text-sm">{pillar.label}</span>
            </div>
            <p className="text-xs text-[#527080] dark:text-slate-400 mb-2">{pillar.description}</p>
            <div className="flex flex-wrap gap-1">
              {pillar.key_signals?.map((sig, si) => (
                <span
                  key={si}
                  className="text-[10px] px-2 py-0.5 bg-[#f0faff] dark:bg-[#00AEEF]/10 border border-[#00AEEF]/20 text-[#087fb5] dark:text-[#00AEEF] font-medium"
                >
                  {sig}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {openingQuestion && (
        <div className="p-4 border border-[#00AEEF]/30 dark:border-[#00AEEF]/20 bg-[#00AEEF]/5 dark:bg-[#00AEEF]/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00AEEF] mb-1">
            Opening Question (Alex)
          </p>
          <p className="text-sm text-[#385463] dark:text-slate-300 italic">&ldquo;{openingQuestion}&rdquo;</p>
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
  const [micStatus, setMicStatus] = useState<'idle' | 'testing' | 'listening' | 'granted' | 'denied'>('idle');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [volume, setVolume] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const testMic = useCallback(async () => {
    setMicStatus('testing');
    cleanup();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices(devs.filter((d) => d.kind === 'audioinput'));
      
      setMicStatus('listening');
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioCtxRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      let speechDetected = false;
      let smoothedVolume = 0;
      
      const checkVolume = () => {
        analyser.getByteTimeDomainData(dataArray);
        
        let max = 0;
        for (let i = 0; i < analyser.frequencyBinCount; i++) {
          const val = Math.abs(dataArray[i] - 128);
          if (val > max) max = val;
        }
        
        // Scale so that normal speaking hits a satisfying range
        const currentVol = Math.min(100, (max / 60) * 100);
        
        // Smooth the visualizer (instant attack, slow decay)
        if (currentVol > smoothedVolume) {
          smoothedVolume = currentVol; 
        } else {
          smoothedVolume = smoothedVolume * 0.85 + currentVol * 0.15;
        }
        
        setVolume(smoothedVolume);
        
        if (smoothedVolume > 20 && !speechDetected) {
          speechDetected = true;
          setMicStatus('granted');
        }
        
        rafRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

    } catch {
      setMicStatus('denied');
    }
  }, [cleanup]);

  useEffect(() => { testMic(); }, [testMic]);

  return (
    <div className="flex flex-col gap-6 items-center py-4">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF] mb-2">
          Step 04
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a] dark:text-slate-100 mb-1">
          Microphone Test
        </h2>
        <p className="text-sm text-[#527080] dark:text-slate-400">Ensure your mic is ready before joining the panel.</p>
      </div>

      {/* Mic status indicator */}
      <div className="relative w-28 h-28">
        {(micStatus === 'testing' || (micStatus === 'listening' && volume < 5)) && (
          <div
            className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${AGORA_BLUE} transparent transparent transparent` }}
          />
        )}
        <div
          className={`absolute inset-2 flex items-center justify-center rounded-full transition-colors ${
            micStatus === 'granted'
              ? 'bg-emerald-500/15'
              : micStatus === 'denied'
              ? 'bg-red-500/15'
              : 'bg-[#00AEEF]/10'
          }`}
        >
          {micStatus === 'granted' ? (
            <Mic className="w-10 h-10 text-emerald-500" />
          ) : micStatus === 'denied' ? (
            <AlertCircle className="w-12 h-12 text-red-500" />
          ) : (
            <Mic className={`w-10 h-10 text-[#00AEEF] transition-transform ${micStatus === 'listening' ? 'scale-110' : ''}`} />
          )}
        </div>
      </div>

      {(micStatus === 'listening' || micStatus === 'granted') && (
        <div className="flex items-center gap-1 w-56 justify-center">
          {Array.from({ length: 24 }).map((_, i) => {
            // Calculate if this segment is active based on volume (0-100)
            const isActive = (volume / 100) * 24 > i;
            
            // Color gradient: Green -> Yellow -> Red
            let color = 'bg-emerald-500';
            let glow = 'shadow-[0_0_8px_rgba(16,185,129,0.5)]';
            if (i > 19) {
              color = 'bg-red-500';
              glow = 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';
            } else if (i > 14) {
              color = 'bg-amber-400';
              glow = 'shadow-[0_0_8px_rgba(251,191,36,0.5)]';
            }

            return (
              <div 
                key={i} 
                className={`flex-1 h-3 rounded-[1px] transition-all duration-75 ${
                  isActive ? `${color} ${glow}` : 'bg-slate-200/50 dark:bg-slate-800/50'
                }`}
              />
            );
          })}
        </div>
      )}

      <div className="text-center text-sm min-h-6">
        {micStatus === 'granted' && (
          <p className="text-emerald-600 font-semibold">✓ Perfect! Audio detected</p>
        )}
        {micStatus === 'denied' && (
          <p className="text-red-500 font-semibold">⚠ Mic blocked — enable in browser settings</p>
        )}
        {micStatus === 'testing' && (
          <p className="text-[#8baab8] dark:text-slate-500">Requesting microphone access…</p>
        )}
        {micStatus === 'listening' && (
          <p className="text-[#00AEEF] font-semibold animate-pulse">Please speak into your microphone...</p>
        )}
      </div>

      {devices.length > 0 && (
        <div className="w-full max-w-sm">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#527080] dark:text-slate-400 mb-2">
            Available Microphones
          </label>
          <select
            className="w-full bg-white dark:bg-[#090D16] border border-[#00AEEF]/30 dark:border-slate-700/60 px-4 py-2.5 text-sm
              text-[#102a3a] dark:text-slate-100 outline-none focus:border-[#00AEEF]"
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
          disabled={micStatus === 'denied' || micStatus === 'testing' || micStatus === 'listening'}
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
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeLink, setResumeLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rubric, setRubric] = useState<RubricData>({});
  const [error, setError] = useState<string | null>(null);

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleGenerateRubric = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createSession({
        job_title: jobTitle,
        jd_text: jdText,
        resume_text: resumeText,
        resume_file: resumeFile || undefined,
        resume_link: resumeLink,
      });
      setSessionId(res.session_id);
      setRubric(res.rubric as unknown as Record<string, { label: string; description: string; key_signals: string[] }>);
      nextStep();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create session';
      setError(msg);
      
      // If it's a 400 Bad Request (gibberish detected), stop and don't proceed to demo mode
      if (msg.includes('400') || msg.toLowerCase().includes('gibberish')) {
        setLoading(false);
        return;
      }
      
      setSessionId(`demo_${Date.now()}`);
      setRubric({
        architecture:  { label: 'Architecture & System Design', description: 'Probe distributed system knowledge.', key_signals: ['CAP theorem', 'Sharding', 'Fault tolerance'] },
        product_sense: { label: 'Product & Business Sense', description: 'Evaluate ROI and user awareness.', key_signals: ['User journey', 'ROI', 'Feature priority'] },
        scalability:   { label: 'Scalability & Performance', description: 'Assess scale thinking.', key_signals: ['Load estimation', 'Bottleneck ID', 'Optimization'] },
        clarity:       { label: 'Communication & Clarity', description: 'Measure articulation clarity.', key_signals: ['Structured answers', 'Conciseness', 'No jargon'] },
        ownership:     { label: 'Ownership & Leadership', description: 'Evaluate accountability depth.', key_signals: ['Concrete examples', 'Personal contribution', 'Outcomes'] },
      });
      nextStep();
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = () => {
    if (sessionId) router.push(`/room/${sessionId}`);
  };

  const slideVariants = {
    enter:  { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit:   { opacity: 0, x: -40 },
  };

  return (
    <div className="min-h-screen bg-[#fbfdff] dark:bg-[#0B121F] text-[#102a3a] dark:text-slate-100 flex flex-col items-center py-20 px-6 transition-colors">
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
          <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#087fb5] dark:text-[#00AEEF]">
            <span className="grid h-5 w-5 place-items-center bg-[#00AEEF] text-white text-[9px]">+</span>
            OmniPanel AI
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[#102a3a] dark:text-slate-100 mb-2">
            Setup Your Interview
          </h1>
          <p className="text-sm text-[#527080] dark:text-slate-400">4 quick steps to launch your AI panel session</p>
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
                      : 'bg-white dark:bg-slate-900 border border-[#00AEEF]/15 text-[#8baab8] dark:border-slate-700/50 dark:text-slate-500'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 transition-colors ${
                      done ? 'bg-emerald-400/40' : 'bg-[#00AEEF]/15 dark:bg-slate-700/50'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Error banner */}
        {error && (
          <div className="mb-4 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-4 py-2 text-center rounded">
            {(error.includes('400') || error.toLowerCase().includes('gibberish')) 
              ? error 
              : `API unavailable — using demo mode. ${error}`}
          </div>
        )}

        {/* ── Step card */}
        <div className="bg-white dark:bg-[#0B121F]/90 border border-[#00AEEF]/25 dark:border-[#00AEEF]/15 p-8 overflow-hidden backdrop-blur-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <StepJobDetails
                  jobTitle={jobTitle} setJobTitle={setJobTitle}
                  jdText={jdText} setJdText={setJdText}
                  onNext={nextStep}
                />
              )}
              {step === 2 && (
                  <StepResume
                    resumeText={resumeText} setResumeText={setResumeText}
                    resumeFile={resumeFile} setResumeFile={setResumeFile}
                    resumeLink={resumeLink} setResumeLink={setResumeLink}
                    onBack={prevStep}
                    onNext={handleGenerateRubric}
                    loading={loading}
                  />
              )}
              {step === 3 && (
                <StepRubric rubric={rubric} onBack={prevStep} onNext={nextStep} />
              )}
              {step === 4 && (
                <StepMicTest onBack={prevStep} onLaunch={handleLaunch} />
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
