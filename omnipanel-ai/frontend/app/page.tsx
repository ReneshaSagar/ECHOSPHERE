'use client';

import { ArrowDownRight, ArrowRight, Mic, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';

const AGORA_BLUE = '#00AEEF';
const GRID_SIZE = 18;



export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(bounds.width * pixelRatio);
    canvas.height = Math.floor(bounds.height * pixelRatio);
    const context = canvas.getContext('2d');
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
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

    // A clustered, pixel-by-pixel reveal keeps the interaction tactile instead of a soft brush stroke.
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
        <section className="flex min-h-[calc(100vh-10rem)] flex-col justify-between py-8 sm:py-12">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
            <div className="max-w-4xl">
              <div className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#00AEEF]">
                <span className="grid h-6 w-6 place-items-center bg-[#00AEEF] text-white">+</span>
                Agora-powered interview intelligence
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.075em] sm:text-7xl lg:text-[6.5rem]">
                Make every interview
                <span className="block text-[#00AEEF] transition-colors duration-500 hover:text-white">a real conversation.</span>
              </h1>
              <p className="mt-8 max-w-xl text-base leading-relaxed text-[#4b6574] dark:text-slate-400 sm:text-lg">
                OmniPanel brings dynamic AI perspectives into one live voice interview—so teams can hear beyond rehearsed answers.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/setup" className="group inline-flex items-center gap-3 bg-[#00AEEF] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#008fca]">
                  Start an interview
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#panel" className="inline-flex items-center gap-2 border border-[#00AEEF]/30 bg-white/80 dark:bg-[#0B121F]/80 px-5 py-3.5 text-sm font-semibold text-[#00AEEF] backdrop-blur-sm transition-colors hover:border-[#00AEEF] hover:text-white dark:hover:text-white">
                  Meet the panel <ArrowDownRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="justify-self-end border-l border-[#00AEEF]/25 pl-5 text-sm leading-relaxed text-[#3b5869] dark:text-slate-400 lg:max-w-xs">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#00AEEF]">Scratch the surface</p>
              <p className="mt-3">Move your cursor across the page to uncover the live signal underneath.</p>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-px border border-[#00AEEF]/30 bg-[#00AEEF]/30 sm:grid-cols-4">
            {[
              ['1-4', 'dynamic agents per round'],
              ['01', 'shared interview context'],
              ['<250ms', 'real-time audio response'],
              ['∞', 'room for better decisions'],
            ].map(([stat, label]) => (
              <div key={label} className="min-h-28 bg-white/90 dark:bg-[#0B121F]/90 p-4 backdrop-blur-sm sm:p-5">
                <p className="text-2xl font-semibold tracking-[-0.06em] text-[#00AEEF]">{stat}</p>
                <p className="mt-3 max-w-28 text-[11px] font-medium uppercase leading-relaxed tracking-[0.08em] text-[#587180] dark:text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="panel" className="border-t border-[#00AEEF]/30 py-16 sm:py-24">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF]">Tailored specifically for the job</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#102a3a] dark:text-slate-100 sm:text-5xl">Dynamic AI Personas.</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#527080] dark:text-slate-400"><Mic className="h-4 w-4 text-[#00AEEF]" /> Live, adaptive voice interviews</div>
          </div>

          <div className="grid grid-cols-1 gap-px border border-[#00AEEF]/35 bg-[#00AEEF]/35 md:grid-cols-3">
            {[
              ['01', 'Technical Leads', 'Probes architecture, system design, and coding ability in depth.'],
              ['02', 'Product Managers', 'Evaluates product sense, business impact, and user journey.'],
              ['03', 'Culture Advocates', 'Assesses team fit, conflict resolution, and leadership skills.'],
            ].map(([number, name, role]) => (
              <article key={name} className="group relative min-h-64 overflow-hidden bg-white/95 dark:bg-[#0B121F]/95 p-6 backdrop-blur-sm transition-colors hover:bg-[#e9f8ff] dark:hover:bg-slate-900/90 sm:p-8">
                <span className="absolute right-5 top-5 font-mono text-[10px] text-[#00AEEF]">{number}</span>
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-[#00AEEF] transition-all duration-300 group-hover:w-full" />
                <Sparkles className="h-5 w-5 text-[#00AEEF]" strokeWidth={1.5} />
                <h3 className="mt-16 text-3xl font-semibold tracking-[-0.06em] text-[#102a3a] dark:text-slate-100">{name}</h3>
                <p className="mt-2 text-sm text-[#527080] dark:text-slate-400">{role}</p>
                <p className="mt-7 max-w-xs text-sm leading-relaxed text-[#385463] dark:text-slate-500">
                  Focused questions, context-aware follow-ups, and a clear view of what a candidate can really do.
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[#00AEEF]/25 pt-5 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#5c7482] dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>OmniPanel AI / EchoSphere</span>
          <span className="text-[#00AEEF]">Voice is the interface</span>
        </footer>
      </main>
    </div>
  );
}
