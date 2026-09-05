'use client';

import React from 'react';
import Link from 'next/link';
import PixelMatrixFlower from '@/components/hero/PixelMatrixFlower';
import { NEXORA_LABS } from '@/lib/company';
import { 
  ArrowRight, 
  Sparkles, 
  Server, 
  Radio, 
  Layers,
  ShieldCheck, 
  Zap, 
  Terminal, 
  Workflow, 
  Code2, 
  CheckCircle2, 
  Users,
  Compass
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#030304] text-[#f4f4f5] overflow-hidden selection:bg-amber-500/30 selection:text-white">
      {/* Subtle Background Radial Atmosphere */}
      <div className="pointer-events-none absolute top-1/4 right-1/4 w-[700px] h-[700px] bg-gradient-to-b from-amber-600/10 via-orange-950/5 to-transparent blur-[160px] opacity-70" />
      <div className="pointer-events-none absolute inset-0 dot-grid-fine opacity-15" />

      <main className="relative z-10 mx-auto flex flex-col max-w-7xl px-6 sm:px-10 lg:px-16 pt-24 sm:pt-32 pb-24">
        
        {/* ── 1. Hero Section (Matching Reference Image Pixel-for-Pixel) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-8 min-h-[72vh] py-8 sm:py-16">
          
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-6 flex flex-col items-start text-left space-y-6 sm:space-y-8 z-10">
            {/* Minimalist Geometric Logo Glyph */}
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center text-white/90 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <div className="w-4 h-4 rounded-sm border-2 border-white rotate-45 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>

            {/* Editorial Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-[4.2rem] font-serif font-normal tracking-[-0.03em] text-white leading-[1.08]">
              Nature doesn’t guess<br />
              <span className="text-white/90">Neither should AI.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-zinc-400 font-sans leading-relaxed max-w-md">
              Our conversational voice AI analyzes real-time technical dialogue to uncover genuine engineering mastery—beyond resumes and guesswork.
            </p>

            {/* Capsule CTA Button (Matching Reference Image) */}
            <div className="pt-2 flex items-center gap-4 flex-wrap">
              <Link
                href="/jobs"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.18] text-white text-xs font-semibold transition-all shadow-[0_0_25px_rgba(255,255,255,0.08)] transform hover:-translate-y-0.5"
              >
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-white/80" />
              </Link>

              <Link
                href="/admin/schedule"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-mono text-zinc-400 hover:text-white transition-colors"
              >
                <span>ATS Schedule</span>
                <span className="text-zinc-600">→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Topographic Pixel Matrix Flower Artwork */}
          <div className="lg:col-span-6 flex items-center justify-center relative">
            <PixelMatrixFlower />
          </div>
        </section>

        {/* ── 2. Services / Platform Architecture Section ── */}
        <section id="platform" className="py-24 border-t border-white/[0.08] space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">[ SERVICES // ARCHITECTURE ]</span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-2">
                Infrastructure for intelligent software.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md font-mono leading-relaxed">
              Composable primitives engineered for low-latency voice AI, multi-region event streaming, and automated evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card glass-card-hover p-8 space-y-5 relative overflow-hidden group">
              <div className="font-mono text-xs text-zinc-500">01 / AUDIO & INFERENCE</div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold text-white">Sub-50ms Streaming Gateways</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Full-duplex WebRTC media pipelines with neural acoustic synchronization, adaptive barge-in handling, and zero audio packet jitter.
              </p>
              <div className="pt-2 text-[11px] font-mono text-amber-400 flex items-center gap-1">
                <span>WebRTC · Agora RTC · Gemini Live</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover p-8 space-y-5 relative overflow-hidden group">
              <div className="font-mono text-xs text-zinc-500">02 / EVENT BACKBONE</div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold text-white">Distributed Event Mesh</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Fault-tolerant Apache Kafka and Redis Pub/Sub topologies designed for billions of monthly state events with multi-region active-active replication.
              </p>
              <div className="pt-2 text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <span>Kafka · Redis · PostgreSQL</span>
              </div>
            </div>

            <div className="glass-card glass-card-hover p-8 space-y-5 relative overflow-hidden group">
              <div className="font-mono text-xs text-zinc-500">03 / EVALUATION INTELLIGENCE</div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold text-white">OmniPanel AI Evaluation</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Stateful turn arbitration, calibrated multi-round rubric synthesis, and verified evidence grounding for technical talent assessment.
              </p>
              <div className="pt-2 text-[11px] font-mono text-purple-400 flex items-center gap-1">
                <span>Multi-Persona Arbiter · RAG</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. How It Works Section ── */}
        <section id="how-it-works" className="py-24 border-t border-white/[0.08] space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">[ HOW IT WORKS ]</span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              From application to signal in minutes.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono">
              An objective, conversational hiring pipeline powered by OmniPanel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#08080b] space-y-4">
              <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
                <span>PHASE // 01</span>
                <span className="text-zinc-600">INGESTION</span>
              </div>
              <h4 className="text-lg font-semibold text-white">Multi-Source Enrichment</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Extracts verified project repositories from candidate GitHub and LinkedIn, identifying high-signal codecraft to probe during the interview.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#08080b] space-y-4">
              <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
                <span>PHASE // 02</span>
                <span className="text-zinc-600">LIVE AUDIO</span>
              </div>
              <h4 className="text-lg font-semibold text-white">Multi-Agent Voice Panel</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Candidate joins a live room with technical leads (Priya Nair, Arjun Malhotra) who coordinate turns, probe scalability, and assess depth.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#08080b] space-y-4">
              <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
                <span>PHASE // 03</span>
                <span className="text-zinc-600">DECISION</span>
              </div>
              <h4 className="text-lg font-semibold text-white">Grounded Synthesis Scorecard</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Turn Arbiter synthesizes candidate explanations against objective rubrics, delivering comprehensive telemetry to engineering hiring committees.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. AI Security & Operating Principles ── */}
        <section id="principles" className="py-24 border-t border-white/[0.08] space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">[ SECURITY & CULTURE // PRINCIPLES ]</span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-2">
                Our Operating Principles.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md font-mono">
              The foundational tenets that govern our engineering standards and hiring criteria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {NEXORA_LABS.principles.map((p) => (
              <div key={p.number} className="p-6 rounded-2xl border border-white/[0.06] bg-[#07070a] hover:border-white/15 transition-all space-y-3">
                <div className="font-mono text-[11px] text-amber-400">PRINCIPLE // {p.number}</div>
                <h4 className="text-lg font-semibold text-white">{p.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">{p.description}</p>
              </div>
            ))}

            <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-transparent flex flex-col justify-between space-y-4">
              <div className="font-mono text-[11px] text-zinc-500">GLOBAL NETWORK // 06</div>
              <div className="text-sm font-semibold text-white">
                Bengaluru HQ · Singapore · London
              </div>
              <p className="text-xs text-zinc-500">
                180+ team members across 20+ nationalities building global developer infrastructure.
              </p>
              <Link href="/jobs" className="text-xs text-white hover:underline flex items-center gap-1 font-mono">
                <span>View team openings</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 5. Open Roles / Careers Preview Section ── */}
        <section className="py-24 border-t border-white/[0.08] space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest">[ CAREERS // 7 POSITIONS ]</span>
              <h2 className="text-3xl font-semibold tracking-tight text-white mt-1">
                Open roles at Nexora Labs.
              </h2>
            </div>

            <Link
              href="/jobs"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/15 hover:border-white/30 text-xs font-semibold text-white transition-all bg-white/5"
            >
              <span>View all openings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid gap-3">
            {[
              { title: 'Senior Backend Engineer — Distributed Systems & Real-Time APIs', loc: 'Bengaluru (Hybrid)', exp: '3–6 yrs', dept: 'Core Infra', id: 'j1' },
              { title: 'Staff Backend Engineer — Core Infrastructure & Architecture', loc: 'Bengaluru / Remote India', exp: '7+ yrs', dept: 'Architecture', id: 'j2' },
              { title: 'Senior Full Stack Engineer — Next.js & Developer Platform', loc: 'Bengaluru', exp: '3–6 yrs', dept: 'Product Eng', id: 'j3' },
              { title: 'AI / Machine Learning Engineer — Conversational Systems & LLM Infra', loc: 'Bengaluru', exp: '2–5 yrs', dept: 'AI Platform', id: 'j4' },
              { title: 'Senior Platform Engineer — Cloud Infrastructure & Kubernetes', loc: 'Singapore', exp: '4–7 yrs', dept: 'Cloud Platform', id: 'j5' }
            ].map((role) => (
              <Link
                key={role.id}
                href={`/jobs/${role.id}`}
                className="group p-5 rounded-2xl border border-white/[0.06] bg-[#08080b] hover:border-white/20 hover:bg-[#0c0c10] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                      {role.dept}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {role.loc} · {role.exp}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-white group-hover:text-zinc-200 transition">
                    {role.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 group-hover:text-white transition whitespace-nowrap">
                  <span>Apply</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center pt-4 sm:hidden">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/15 text-xs font-semibold text-white bg-white/5"
            >
              <span>Explore all 7 openings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* ── 6. Minimalist Dark Footer ── */}
        <footer className="pt-16 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-4">
            <span className="text-white font-sans font-medium text-sm lowercase">nexora</span>
            <span>© 2026 Nexora Labs, Inc.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/jobs" className="hover:text-zinc-300 transition">Careers</Link>
            <Link href="/admin" className="hover:text-zinc-300 transition">ATS Portal</Link>
            <span className="text-zinc-400">Powered by OmniPanel</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
