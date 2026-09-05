'use client';

import React from 'react';
import Link from 'next/link';
import PixelMatrixFlower from '@/components/hero/PixelMatrixFlower';
import { 
  ArrowRight, 
  Layers, 
  Radio, 
  Cpu, 
  Server, 
  Database, 
  Sparkles, 
  Compass, 
  Users, 
  Building2, 
  Globe2, 
  ShieldCheck, 
  Terminal,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#030304] text-[#f4f4f5] overflow-hidden selection:bg-amber-500/30 selection:text-white">
      {/* Subtle Ambient Background Atmospheres */}
      <div className="pointer-events-none absolute top-1/6 right-1/4 w-[750px] h-[750px] bg-gradient-to-b from-amber-600/10 via-orange-950/5 to-transparent blur-[160px] opacity-70" />
      <div className="pointer-events-none absolute top-2/3 left-1/5 w-[600px] h-[600px] bg-gradient-to-b from-blue-900/10 via-indigo-950/5 to-transparent blur-[160px] opacity-50" />
      <div className="pointer-events-none absolute inset-0 dot-grid-fine opacity-15" />

      <main className="relative z-10 mx-auto flex flex-col max-w-7xl px-6 sm:px-10 lg:px-16 pt-24 sm:pt-32 pb-24">
        
        {/* ── 1. Hero Section ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-8 min-h-[75vh] py-8 sm:py-16">
          
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-6 flex flex-col items-start text-left space-y-6 sm:space-y-8 z-10">
            {/* Minimalist Geometric Brand Glyph */}
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center text-white/90 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <div className="w-4 h-4 rounded-xs border-2 border-amber-400/90 rotate-45 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.8rem] font-serif font-normal tracking-[-0.03em] text-white leading-[1.12]">
              Infrastructure for software that thinks, acts, and scales.
            </h1>

            {/* Subheadline & Description */}
            <div className="space-y-3 max-w-lg">
              <p className="text-base sm:text-lg text-zinc-200 font-medium leading-relaxed">
                Nexora Labs builds the infrastructure behind the next generation of intelligent software.
              </p>
              <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
                We help engineering teams build, deploy, and scale AI-powered products — from realtime systems and data pipelines to intelligent developer platforms.
              </p>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex items-center gap-4 flex-wrap">
              <Link
                href="#platform"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.18] text-white text-xs font-semibold transition-all shadow-[0_0_25px_rgba(255,255,255,0.08)] transform hover:-translate-y-0.5"
              >
                <span>Explore our platform</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-white/80" />
              </Link>

              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold text-zinc-300 hover:text-white border border-transparent hover:border-white/10 transition-all"
              >
                <span>Join Nexora</span>
                <span className="text-zinc-500 font-mono">→</span>
              </Link>
            </div>

            {/* Locations Line */}
            <div className="pt-4 font-mono text-[11px] text-zinc-500 tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80"></span>
              <span>Bengaluru · Singapore · London</span>
            </div>
          </div>

          {/* Right Column: Topographic Pixel Matrix Flower Artwork */}
          <div className="lg:col-span-6 flex items-center justify-center relative">
            <PixelMatrixFlower />
          </div>
        </section>

        {/* ── 2. Built for the Next Generation of Software ── */}
        <section id="solutions" className="py-24 border-t border-white/[0.08] space-y-10">
          <div className="max-w-3xl space-y-6">
            <span className="font-mono text-[11px] text-amber-400 uppercase tracking-widest block">
              [ BUILT FOR THE NEXT GENERATION OF SOFTWARE ]
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight text-white leading-tight">
              AI is changing what software can do.<br />
              <span className="text-zinc-300">We're building what it runs on.</span>
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-zinc-400 leading-relaxed font-sans max-w-2xl">
              <p>
                Modern applications demand more than traditional infrastructure.
              </p>
              <p>
                They need to process massive amounts of data, respond in realtime, coordinate intelligent agents, and remain reliable at scale.
              </p>
              <p className="text-zinc-200 font-medium">
                That's what we're building at Nexora.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. What We Build ── */}
        <section id="products" className="py-24 border-t border-white/[0.08] space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest block">
                [ WHAT WE BUILD ]
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-2">
                Infrastructure for intelligent products.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono max-w-sm">
              Modular, low-latency primitives engineered for mission-critical production AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Realtime Systems */}
            <div className="p-8 rounded-2xl border border-white/[0.08] bg-[#07070a] hover:border-white/20 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold text-white">Realtime Systems</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                Low-latency infrastructure for applications where every millisecond matters.
              </p>
            </div>

            {/* Card 2: AI Infrastructure */}
            <div className="p-8 rounded-2xl border border-white/[0.08] bg-[#07070a] hover:border-white/20 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold text-white">AI Infrastructure</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                Tools and systems for deploying, evaluating, and operating intelligent applications in production.
              </p>
            </div>

            {/* Card 3: Developer Platforms */}
            <div className="p-8 rounded-2xl border border-white/[0.08] bg-[#07070a] hover:border-white/20 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold text-white">Developer Platforms</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                Infrastructure that gives engineering teams the building blocks to ship faster.
              </p>
            </div>

            {/* Card 4: Data Systems */}
            <div className="p-8 rounded-2xl border border-white/[0.08] bg-[#07070a] hover:border-white/20 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold text-white">Data Systems</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                Reliable pipelines designed to move, process, and understand data at scale.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. The Nexora Platform Flow ── */}
        <section id="platform" className="py-24 border-t border-white/[0.08] space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest block">
              [ THE NEXORA PLATFORM ]
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              From first request to production scale.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
              Our platform brings together the infrastructure modern engineering teams need to build intelligent products.
            </p>
          </div>

          {/* Flow Pipeline Visual */}
          <div className="p-8 sm:p-12 rounded-2xl border border-white/[0.08] bg-[#060608] relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
              {[
                { label: 'DATA', icon: Database, color: 'text-amber-400', border: 'border-amber-500/30' },
                { label: 'PROCESSING', icon: Cpu, color: 'text-orange-400', border: 'border-orange-500/30' },
                { label: 'INTELLIGENCE', icon: Sparkles, color: 'text-purple-400', border: 'border-purple-500/30' },
                { label: 'REALTIME', icon: Radio, color: 'text-cyan-400', border: 'border-cyan-500/30' },
                { label: 'PRODUCTION', icon: ShieldCheck, color: 'text-emerald-400', border: 'border-emerald-500/30' },
              ].map((step, idx, arr) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center text-center p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] w-full md:w-auto md:min-w-[130px]">
                    <step.icon className={`w-5 h-5 ${step.color} mb-2`} />
                    <span className="font-mono text-xs font-bold tracking-wider text-white">
                      {step.label}
                    </span>
                  </div>

                  {idx < arr.length - 1 && (
                    <div className="flex items-center justify-center text-zinc-600 font-mono text-sm py-1 md:py-0">
                      <span className="hidden md:inline">→</span>
                      <span className="md:hidden">↓</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-xs sm:text-sm text-zinc-300 font-mono">
                Built for systems that don't just respond — they understand, adapt, and act.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. Engineering at Nexora ── */}
        <section id="developers" className="py-24 border-t border-white/[0.08] space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest block">
              [ ENGINEERING AT NEXORA ]
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              We build for problems that don't have easy answers.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
              At Nexora, engineers work across distributed systems, AI, infrastructure, and developer tooling.
            </p>
          </div>

          <div className="space-y-4">
            <div className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
              You'll work on systems where:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#07070a] space-y-2">
                <h4 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Scale matters.</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Millions of requests and billions of events aren't edge cases.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#07070a] space-y-2">
                <h4 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span>Latency matters.</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Realtime means realtime.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#07070a] space-y-2">
                <h4 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Reliability matters.</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Infrastructure is only useful when people can depend on it.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#07070a] space-y-2">
                <h4 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span>Ownership matters.</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The team that builds a system owns it in production.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Our Principles ── */}
        <section id="company" className="py-24 border-t border-white/[0.08] space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-widest block">
                [ OUR PRINCIPLES ]
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-2">
                How we build.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono">
              The foundational tenets that govern our engineering culture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { num: '01', title: 'Think in systems', desc: 'Understand the problem beyond the immediate implementation.' },
              { num: '02', title: 'Bias toward ownership', desc: 'Take responsibility for outcomes, not just tasks.' },
              { num: '03', title: 'Make complexity disappear', desc: 'The best infrastructure makes difficult things feel simple.' },
              { num: '04', title: 'Build for scale', desc: "Design today with tomorrow's constraints in mind." },
              { num: '05', title: 'Stay curious', desc: 'The problems worth solving rarely have a single answer.' },
            ].map((p) => (
              <div key={p.num} className="p-6 rounded-2xl border border-white/[0.06] bg-[#07070a] hover:border-white/15 transition-all space-y-3">
                <div className="font-mono text-[11px] text-amber-400">
                  {p.num} — {p.title}
                </div>
                <h4 className="text-lg font-semibold text-white">{p.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">{p.desc}</p>
              </div>
            ))}

            <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-transparent flex flex-col justify-between space-y-4">
              <div className="font-mono text-[11px] text-zinc-500">GLOBAL SITES // 06</div>
              <div className="text-sm font-semibold text-white">
                Bengaluru · Singapore · London
              </div>
              <p className="text-xs text-zinc-500">
                180+ team members across 20+ nationalities building global developer infrastructure.
              </p>
              <Link href="/jobs" className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-mono">
                <span>View open positions</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 7. Careers Section ── */}
        <section id="careers" className="py-24 border-t border-white/[0.08] space-y-10">
          <div className="max-w-3xl space-y-4">
            <span className="font-mono text-[11px] text-amber-400 uppercase tracking-widest block">
              [ CAREERS ]
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight text-white">
              Come build what's next.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans max-w-2xl">
              We're looking for engineers, researchers, designers, and builders who want to work on difficult technical problems with real-world impact.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 max-w-lg py-4 border-y border-white/[0.06]">
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white">180+</div>
              <div className="text-xs text-zinc-500 mt-1">people</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white">3</div>
              <div className="text-xs text-zinc-500 mt-1">offices</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white">20+</div>
              <div className="text-xs text-zinc-500 mt-1">nationalities</div>
            </div>
          </div>

          {/* Explore open roles CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              <span>Explore open roles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <span className="font-mono text-[11px] text-zinc-500">
              Hiring infrastructure powered by OmniPanel
            </span>
          </div>
        </section>

        {/* ── 8. Final CTA Section ── */}
        <section className="py-24 border-t border-white/[0.08] text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight text-white leading-tight">
              Build what intelligent software runs on.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              Join us in building the infrastructure behind the next generation of software.
            </p>
            <div className="pt-4 flex items-center justify-center gap-4">
              <Link
                href="/jobs"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.25)]"
              >
                <span>View open positions</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 9. Footer ── */}
        <footer className="pt-16 border-t border-white/[0.08] space-y-8 text-xs text-zinc-400 font-mono">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                NEXORA LABS
              </div>
              <p className="text-zinc-500 text-[11px] font-sans">
                Infrastructure for software that thinks, acts, and scales.
              </p>
            </div>

            <div className="flex items-center gap-6 flex-wrap text-zinc-400 font-sans text-xs">
              <Link href="/#products" className="hover:text-white transition">Products</Link>
              <span className="text-zinc-700">·</span>
              <Link href="/#solutions" className="hover:text-white transition">Solutions</Link>
              <span className="text-zinc-700">·</span>
              <Link href="/#developers" className="hover:text-white transition">Developers</Link>
              <span className="text-zinc-700">·</span>
              <Link href="/#company" className="hover:text-white transition">Company</Link>
              <span className="text-zinc-700">·</span>
              <Link href="/jobs" className="hover:text-white transition">Careers</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/[0.04] text-[11px] text-zinc-500">
            <div>
              Bengaluru · Singapore · London
            </div>

            <div className="flex items-center gap-4">
              <span>© 2026 Nexora Labs. All rights reserved.</span>
              <span className="text-zinc-700">|</span>
              <Link href="/admin" className="text-zinc-400 hover:text-white transition">
                Careers powered by OmniPanel
              </Link>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
