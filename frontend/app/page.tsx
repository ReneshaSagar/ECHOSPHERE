'use client';

import { ArrowDownRight, ArrowRight, Sparkles, Server, Cpu, Globe2, ShieldCheck, Zap, Users, Terminal, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NEXORA_LABS } from '@/lib/company';

const AGORA_BLUE = '#00AEEF';
const GRID_SIZE = 18;

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTopTextScratched, setIsTopTextScratched] = useState(false);
  const [isTitleScratched, setIsTitleScratched] = useState(false);
  const [isPrimaryBtnScratched, setIsPrimaryBtnScratched] = useState(false);
  const [isSecondaryBtnScratched, setIsSecondaryBtnScratched] = useState(false);
  const [isRightTextScratched, setIsRightTextScratched] = useState(false);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(bounds.width * pixelRatio);
    canvas.height = Math.floor(bounds.height * pixelRatio);
    const context = canvas.getContext('2d');
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    setIsTopTextScratched(false);
    setIsTitleScratched(false);
    setIsPrimaryBtnScratched(false);
    setIsSecondaryBtnScratched(false);
    setIsRightTextScratched(false);
  }, []);

  useEffect(() => {
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    return () => window.removeEventListener('resize', sizeCanvas);
  }, [sizeCanvas]);

  const scratch = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    if (!context) return;

    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    const originX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    const originY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

    // Tactile pixel reveal
    for (let i = 0; i < 18; i += 1) {
      const offsetX = (Math.floor(Math.random() * 7) - 3) * GRID_SIZE;
      const offsetY = (Math.floor(Math.random() * 7) - 3) * GRID_SIZE;
      const cellSize = Math.random() > 0.72 ? GRID_SIZE * 2 : GRID_SIZE;
      context.fillStyle = Math.random() > 0.18 ? AGORA_BLUE : '#009CDE';
      context.fillRect(originX + offsetX + 1, originY + offsetY + 1, cellSize - 2, cellSize - 2);
    }
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#fbfdff] dark:bg-[#0B121F] text-[#102a3a] dark:text-slate-100 transition-colors"
      onClick={(event) => scratch(event.clientX, event.clientY)}
      onPointerDown={(event) => scratch(event.clientX, event.clientY)}
      onPointerMove={(event) => scratch(event.clientX, event.clientY)}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(#00AEEF_1px,transparent_1px),linear-gradient(90deg,#00AEEF_1px,transparent_1px)] [background-size:72px_72px]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 pb-8 pt-24 sm:px-10 lg:px-16">
        {/* Hero Section */}
        <section className="flex min-h-[calc(100vh-10rem)] flex-col justify-between py-8 sm:py-12">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="max-w-4xl">
              <div 
                className={`mb-8 flex w-fit items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] transition-colors duration-500 ${isTopTextScratched ? 'text-white' : 'text-[#00AEEF]'}`}
                onPointerEnter={() => setIsTopTextScratched(true)}
              >
                <span className={`grid h-6 w-6 place-items-center transition-colors duration-500 ${isTopTextScratched ? 'bg-white text-[#00AEEF]' : 'bg-[#00AEEF] text-white'}`}>+</span>
                Nexora Labs • AI-Native Infrastructure
              </div>

              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.075em] text-[#102a3a] dark:text-slate-100 sm:text-7xl lg:text-[6.2rem]">
                Build what
                <span 
                  className={`block w-fit transition-colors duration-500 ${isTitleScratched ? 'text-white' : 'text-[#00AEEF]'}`}
                  onPointerEnter={() => setIsTitleScratched(true)}
                >
                  intelligent software
                </span>
                runs on.
              </h1>

              <p className="mt-8 max-w-xl text-base leading-relaxed text-[#4b6574] dark:text-slate-300 sm:text-lg">
                Nexora Labs builds the foundational distributed platforms, real-time media backbones, and developer primitives powering the next generation of AI-native software.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link 
                  href="/jobs" 
                  className={`group inline-flex items-center gap-3 px-6 py-3.5 text-sm font-bold transition-colors shadow-sm ${isPrimaryBtnScratched ? 'bg-white text-[#00AEEF] hover:bg-slate-100' : 'bg-[#00AEEF] text-white hover:bg-[#008fca]'}`}
                  onPointerEnter={() => setIsPrimaryBtnScratched(true)}
                >
                  Explore Open Roles
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <a 
                  href="#platform" 
                  className={`inline-flex items-center gap-2 border border-[#00AEEF]/30 px-5 py-3.5 text-sm font-semibold backdrop-blur-sm transition-colors ${isSecondaryBtnScratched ? 'bg-white/20 text-white hover:bg-white/30 border-white/50' : 'bg-white/80 dark:bg-[#0B121F]/80 text-[#00AEEF] hover:border-[#00AEEF] hover:text-white dark:hover:text-white'}`}
                  onPointerEnter={() => setIsSecondaryBtnScratched(true)}
                >
                  Platform Overview <ArrowDownRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div 
              className={`justify-self-end w-fit border-l pl-5 text-sm leading-relaxed lg:max-w-xs transition-colors duration-500 ${isRightTextScratched ? 'border-white/50 text-white' : 'border-[#00AEEF]/25 text-[#3b5869] dark:text-slate-400'}`}
              onPointerEnter={() => setIsRightTextScratched(true)}
            >
              <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-500 ${isRightTextScratched ? 'text-white' : 'text-[#00AEEF]'}`}>Series B • Series of Signal</p>
              <p className="mt-3">Move your cursor across the page to reveal the low-latency distributed telemetry layer.</p>
            </div>
          </div>

          {/* Key Infrastructure Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 gap-px border border-[#00AEEF]/30 bg-[#00AEEF]/30 sm:grid-cols-4">
            {[
              ['180+', 'Team members across 20+ nationalities'],
              ['3', 'Global Hubs: Bengaluru · Singapore · London'],
              ['<50ms', 'Global edge inference & audio latency'],
              ['99.99%', 'Enterprise infrastructure SLA'],
            ].map(([stat, label]) => (
              <div key={label} className="min-h-28 bg-white/90 dark:bg-[#0B121F]/90 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-2xl font-semibold tracking-[-0.06em] text-[#00AEEF]">{stat}</p>
                <p className="mt-3 max-w-36 text-[11px] font-medium uppercase leading-relaxed tracking-[0.08em] text-[#587180] dark:text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platform Architecture & Core Primitives Section */}
        <section id="platform" className="border-t border-[#00AEEF]/30 py-16 sm:py-24">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF]">Core Technology Architecture</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#102a3a] dark:text-slate-100 sm:text-5xl">Engineered for Scale.</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#527080] dark:text-slate-400">
              <Cpu className="h-4 w-4 text-[#00AEEF]" /> Composable Infrastructure Primitives
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px border border-[#00AEEF]/35 bg-[#00AEEF]/35 md:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Real-Time Audio & Inference Gateways',
                role: 'Sub-50ms Global Streaming',
                desc: 'WebRTC and WebSocket transport pipelines bridging multimodal AI models with high-concurrency event loops and zero-jitter audio packet delivery.'
              },
              {
                number: '02',
                title: 'Distributed Event & Data Backbone',
                role: 'High-Throughput Partitioning',
                desc: 'Fault-tolerant Kafka clusters, Redis state coordination, and PostgreSQL query optimizations designed for multi-region resilience and fast recovery.'
              },
              {
                number: '03',
                title: 'OmniPanel Evaluation Intelligence',
                role: 'Autonomous Multi-Persona Engine',
                desc: 'Stateful turn arbitration, calibrated rubric grading, and anti-hallucination groundings that transform candidate assessments into objective signal.'
              }
            ].map((pillar) => (
              <article key={pillar.title} className="group relative min-h-64 overflow-hidden bg-white/95 dark:bg-[#0B121F]/95 p-6 backdrop-blur-sm transition-colors hover:bg-[#e9f8ff] dark:hover:bg-slate-900/90 sm:p-8">
                <span className="absolute right-5 top-5 font-mono text-[10px] text-[#00AEEF]">{pillar.number}</span>
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-[#00AEEF] transition-all duration-300 group-hover:w-full" />
                <Sparkles className="h-5 w-5 text-[#00AEEF]" strokeWidth={1.5} />
                <h3 className="mt-12 text-2xl font-semibold tracking-[-0.06em] text-[#102a3a] dark:text-slate-100">{pillar.title}</h3>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[#00AEEF]">{pillar.role}</p>
                <p className="mt-6 text-sm leading-relaxed text-[#385463] dark:text-slate-400">
                  {pillar.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Operating Principles Section */}
        <section id="principles" className="border-t border-[#00AEEF]/30 py-16 sm:py-24">
          <div className="mb-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF]">How We Build</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#102a3a] dark:text-slate-100 sm:text-5xl">Our Operating Principles.</h2>
            <p className="mt-4 max-w-2xl text-base text-[#4b6574] dark:text-slate-300">
              The cultural standards and engineering tenets that guide every architectural RFC, code review, and product decision at Nexora Labs.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {NEXORA_LABS.principles.map((principle) => (
              <div 
                key={principle.number}
                className="bg-white/80 dark:bg-[#0e1726]/80 p-6 rounded-xl border border-[#00AEEF]/20 hover:border-[#00AEEF]/50 transition shadow-xs"
              >
                <div className="font-mono text-xs font-bold text-[#00AEEF] mb-3">PRINCIPLE // {principle.number}</div>
                <h3 className="text-xl font-bold text-[#102a3a] dark:text-slate-100 mb-2">{principle.title}</h3>
                <p className="text-sm text-[#4b6574] dark:text-slate-400 leading-relaxed">{principle.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Global Hubs Section */}
        <section className="border-t border-[#00AEEF]/30 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF]">Global Presence</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#102a3a] dark:text-slate-100">Three Global Hubs.</h2>
              <p className="mt-3 text-sm text-[#4b6574] dark:text-slate-400 leading-relaxed">
                Headquartered in Bengaluru with engineering and product centers in Singapore and London, building infrastructure for developers worldwide.
              </p>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {NEXORA_LABS.offices.map((office) => (
                <div key={office.city} className="p-5 rounded-xl border border-[#00AEEF]/20 bg-white/60 dark:bg-[#0e1726]/60">
                  <div className="flex items-center gap-2 text-[#00AEEF] mb-2 font-mono text-xs font-bold uppercase">
                    <Globe2 className="w-3.5 h-3.5" />
                    <span>{office.region}</span>
                  </div>
                  <h4 className="text-lg font-bold text-[#102a3a] dark:text-slate-100">{office.city}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{office.country}</p>
                  <div className="mt-3 text-xs text-[#4b6574] dark:text-slate-400 border-t border-gray-100 dark:border-gray-800 pt-2 font-medium">
                    {office.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Careers Call to Action Banner */}
        <section className="border-t border-[#00AEEF]/30 py-16">
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="relative z-10 max-w-xl">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-[#38bdf8] text-xs font-mono font-bold uppercase border border-blue-400/30">
                We're Hiring
              </span>
              <h2 className="text-3xl sm:text-4xl font-black mt-4 tracking-tight">
                Join our engineering & product team.
              </h2>
              <p className="mt-3 text-gray-300 text-sm sm:text-base leading-relaxed">
                Explore our open positions across Backend, Full Stack, AI/ML, Cloud Platform, Product, and Design.
              </p>
            </div>

            <div className="relative z-10">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#00AEEF] hover:bg-[#008fca] text-white font-bold text-base rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <span>View 7 Open Roles</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-4 border-t border-[#00AEEF]/25 pt-6 text-[11px] font-semibold tracking-[0.08em] text-[#5c7482] dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Nexora Labs, Inc. All rights reserved. • Bengaluru · Singapore · London</span>
          <span className="text-[#00AEEF] flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by OmniPanel
          </span>
        </footer>
      </main>
    </div>
  );
}
