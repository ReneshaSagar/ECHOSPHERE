'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Zap, Shield, BarChart3, FileText, Mic2, Users } from 'lucide-react';

const FEATURES = [
  { icon: Users, title: 'Dynamic AI Panel', desc: 'Personas generated from your JD — no fixed names, fully adaptive to any role from engineering to fashion design.' },
  { icon: Shield, title: 'Real-Time Proctoring', desc: 'MediaPipe face-mesh gaze tracking, multiple-face detection, and automatic screen recording keep assessments honest.' },
  { icon: BarChart3, title: 'ATS + Interview Score', desc: 'Resume ATS scoring (30%) combined with multi-round interview performance (70%) for a bias-free composite score.' },
  { icon: FileText, title: 'Minutes of Meeting', desc: 'Separate recruiter and candidate MoM with key moments, decision markers, and constructive action items.' },
  { icon: Mic2, title: 'Live Voice Panels', desc: 'Real-time voice conversation with multiple AI interviewers via Agora SD-RTN™ — coordinated, natural, non-overlapping.' },
  { icon: Zap, title: 'Multi-Round Flow', desc: 'Online assessment → technical interview → HR round, each with tailored personas that pass or fail candidates dynamically.' },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function HomePage() {
  const router = useRouter();
  return (
    <main className="dot-grid min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-20" style={{ minHeight: '88vh' }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="pill pill-accent mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Powered by Agora SD-RTN™ · GPT-4o
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          style={{ fontSize: 'clamp(2.8rem, 8vw, 6.5rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}
        >
          Autonomous<br />
          <span className="gradient-text">AI Interview</span><br />
          Panel
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
          style={{ fontSize: '1.05rem', color: 'rgba(240,240,255,0.5)', maxWidth: '480px', marginBottom: '2.5rem', lineHeight: 1.7 }}
        >
          Dynamic multi-persona voice panels tailored to any role. Real-time proctoring, ATS scoring, and bias-free evaluation — all in your browser.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center gap-3 flex-wrap justify-center"
        >
          <button className="btn-primary" onClick={() => router.push('/setup')} style={{ padding: '14px 32px', fontSize: '0.95rem' }}>
            <Zap className="w-4 h-4" /> Start Interview
          </button>
          <button className="btn-ghost" onClick={() => router.push('/setup')} style={{ padding: '13px 28px', fontSize: '0.95rem' }}>
            View Demo
          </button>
        </motion.div>

        {/* Live stats strip */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.5 }}
          className="flex items-center gap-8 mt-16 flex-wrap justify-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2rem' }}
        >
          {[
            ['Any Role', 'Fashion to Finance'],
            ['3 Rounds', 'OA → Technical → HR'],
            ['Real-time Voice', 'Agora RTC'],
            ['Bias-Free', 'AI Scoring'],
          ].map(([val, label]) => (
            <div key={val} className="text-center">
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f0ff' }}>{val}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.35)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div key={feat.title} variants={fadeUp} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-glow)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 17, height: 17, color: 'var(--accent-light)' }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{feat.title}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>{feat.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </main>
  );
}
