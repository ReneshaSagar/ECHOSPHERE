import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030304] text-[#f5f5f7] font-sans pt-16 flex flex-col selection:bg-purple-500/30 selection:text-white">
      {/* Top Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#030304]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:scale-105 transition">
                <Sparkles className="w-3.5 h-3.5 text-white/90" />
              </div>
              <span className="font-sans font-bold text-white text-base tracking-tight group-hover:text-white/90 transition">
                nexora
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-white/60 border border-white/[0.08] hidden sm:inline">
                careers
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-1.5 text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>OmniPanel Voice Evaluation</span>
            </div>
            <Link 
              href="/admin" 
              className="text-white/70 hover:text-white transition px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]"
            >
              recruiter portal →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full relative z-10">
        {children}
      </main>

      <footer className="border-t border-white/[0.06] bg-[#030304] py-8 mt-16 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-white/40">
          <div>
            © 2026 nexora labs, inc. · bengaluru · singapore · london
          </div>
          <div className="flex items-center gap-2 text-white/60">
            <Sparkles className="w-3.5 h-3.5 text-white/80" />
            <span>autonomous voice hiring infrastructure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

