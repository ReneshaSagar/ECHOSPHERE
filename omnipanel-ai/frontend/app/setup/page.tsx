'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Loader2, Briefcase, FileText, ClipboardList, Zap } from 'lucide-react';
import { createSession } from '@/lib/api';

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

// ── Step 1: Job Details ───────────────────────────────────────────────────

function StepJobDetails({
  jobTitle, setJobTitle,
  jdText, setJdText,
  onNext,
}: {
  jobTitle: string; setJobTitle: (v: string) => void;
  jdText: string; setJdText: (v: string) => void;
  onNext: () => void;
}) {
  const valid = jobTitle.trim().length > 2 && jdText.trim().length > 20;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Job Details</h2>
        <p className="text-sm text-slate-500">Tell us about the role so the AI panel can tailor their questions.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Title <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Senior Backend Engineer"
          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Description <span className="text-red-500">*</span></label>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={7}
          placeholder="Paste the full job description here. The more detail, the better the rubric and questions."
          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
        />
        <p className="text-xs text-slate-400">{jdText.length} chars — aim for 200+</p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Resume ────────────────────────────────────────────────────────

function StepResume({
  resumeText, setResumeText,
  onBack, onNext, loading,
}: {
  resumeText: string; setResumeText: (v: string) => void;
  onBack: () => void; onNext: () => void; loading: boolean;
}) {
  const valid = resumeText.trim().length > 50;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Candidate Resume</h2>
        <p className="text-sm text-slate-500">Paste the candidate's resume to help the panel tailor their behavioral probes.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Resume Text <span className="text-red-500">*</span></label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={10}
          placeholder="Paste resume text here (plain text works best)..."
          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 resize-none font-mono text-sm"
        />
        <p className="text-xs text-slate-400">{resumeText.length} chars</p>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!valid || loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Rubric...
            </>
          ) : (
            <>
              Generate Rubric <Zap className="w-4 h-4" />
            </>
          )}
        </button>
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
  rubric: RubricData;
  onBack: () => void; onNext: () => void;
}) {
  const pillars = Object.entries(rubric).filter(([key, val]) => key !== 'opening_question' && typeof val === 'object') as [string, RubricPillar][];
  const openingQuestion = typeof rubric.opening_question === 'string' ? rubric.opening_question : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Your Evaluation Rubric</h2>
        <p className="text-sm text-slate-500">AI-generated based on the JD + resume. The panel will score across these 5 pillars.</p>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {pillars.map(([key, pillar], i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/50"
            style={{ borderColor: `${PILLAR_COLORS[key] ?? '#94A3B8'}40` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PILLAR_COLORS[key] ?? '#94A3B8' }} />
              <span className="font-semibold text-slate-900 dark:text-white text-sm">{pillar.label}</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">{pillar.description}</p>
            <div className="flex flex-wrap gap-1">
              {pillar.key_signals?.map((sig, si) => (
                <span key={si} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {sig}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {openingQuestion && (
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
          <p className="text-xs font-semibold text-cyan-500 uppercase tracking-wider mb-1">Opening Question (Alex)</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{openingQuestion}"</p>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md"
        >
          Proceed to Mic Test <ChevronRight className="w-4 h-4" />
        </button>
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Microphone Test</h2>
        <p className="text-sm text-slate-500">Ensure your mic is ready before joining the panel.</p>
      </div>

      {/* Mic status indicator */}
      <div className="relative w-28 h-28">
        {micStatus === 'testing' && (
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
        )}
        <div className={`absolute inset-2 rounded-full flex items-center justify-center transition-colors ${
          micStatus === 'granted' ? 'bg-emerald-500/20' :
          micStatus === 'denied'  ? 'bg-red-500/20' :
          'bg-cyan-500/10'
        }`}>
          {micStatus === 'granted' ? (
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          ) : micStatus === 'denied' ? (
            <AlertCircle className="w-12 h-12 text-red-500" />
          ) : (
            <Mic className="w-10 h-10 text-cyan-500" />
          )}
        </div>
      </div>

      <div className="text-center text-sm">
        {micStatus === 'granted' && (
          <p className="text-emerald-500 font-semibold">✓ Microphone access granted</p>
        )}
        {micStatus === 'denied' && (
          <p className="text-red-500">⚠ Mic blocked — enable in browser settings</p>
        )}
        {micStatus === 'testing' && (
          <p className="text-slate-400">Requesting microphone access...</p>
        )}
      </div>

      {/* Device list */}
      {devices.length > 0 && (
        <div className="w-full max-w-sm">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Available Microphones</label>
          <select className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500">
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {micStatus === 'denied' && (
        <button onClick={testMic} className="text-xs text-cyan-500 underline">Retry</button>
      )}

      <div className="flex justify-between w-full mt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onLaunch}
          disabled={micStatus === 'denied' || micStatus === 'testing'}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg text-sm"
        >
          <Zap className="w-4 h-4" />
          Launch Interview
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
      const res = await createSession({ job_title: jobTitle, jd_text: jdText, resume_text: resumeText });
      setSessionId(res.session_id);
      // Cast rubric from response (backend returns full rubric object)
      setRubric(res.rubric as unknown as Record<string, { label: string; description: string; key_signals: string[] }>);
      nextStep();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create session';
      setError(msg);
      // Fallback: generate a session ID locally for demo
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] flex flex-col items-center py-20 px-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Setup Your Interview</h1>
          <p className="text-slate-500 text-sm">4 quick steps to launch your AI panel session</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  done   ? 'bg-emerald-500/20 text-emerald-500' :
                  active ? 'bg-cyan-500/20 text-cyan-500' :
                           'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 transition-colors ${done ? 'bg-emerald-500/40' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            API unavailable — using demo mode. {error}
          </div>
        )}

        {/* Step card */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md p-8 shadow-sm overflow-hidden">
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
                  onBack={prevStep} onNext={handleGenerateRubric} loading={loading}
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
      </div>
    </div>
  );
}
