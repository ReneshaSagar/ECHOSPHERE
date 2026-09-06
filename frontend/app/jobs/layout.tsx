import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030304] text-[#f5f5f7] font-sans pt-16 flex flex-col selection:bg-purple-500/30 selection:text-white">


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

