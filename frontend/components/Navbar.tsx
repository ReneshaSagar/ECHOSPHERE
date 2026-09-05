'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles, Radio } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isLiveInterview = pathname?.includes('/interview/') || pathname?.startsWith('/room/');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-5 pointer-events-none">
      {/* Left: Brand Logo Wordmark */}
      <div className="pointer-events-auto flex items-center gap-3">
        <Link href="/" className="group flex items-center gap-2 text-white hover:opacity-90 transition-opacity">
          <span className="text-xl font-medium tracking-[-0.03em] font-sans lowercase text-white">
            nexora
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-80 group-hover:scale-125 transition-transform"></span>
        </Link>
      </div>

      {/* Center: Floating Capsule Navigation Pill */}
      <nav className="pointer-events-auto hidden md:flex items-center gap-7 px-6 py-2.5 rounded-full bg-[#0d0d12]/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-xs text-zinc-300 font-medium">
        <Link href="/#platform" className="hover:text-white transition-colors">
          Services
        </Link>
        <Link href="/#how-it-works" className="hover:text-white transition-colors">
          How it works
        </Link>
        <Link href="/#principles" className="hover:text-white transition-colors">
          AI Security
        </Link>
        <Link href="/#stack" className="hover:text-white transition-colors">
          Integrations
        </Link>
        <Link href="/jobs" className="hover:text-white transition-colors flex items-center gap-1.5 text-zinc-100 font-semibold">
          <span>Careers</span>
          <span className="w-1 h-1 rounded-full bg-pink-400 animate-pulse"></span>
        </Link>
        <Link href="/test-interview" className="hover:text-amber-300 transition-colors text-amber-400 font-mono text-[11px] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Test Studio</span>
        </Link>
        <Link href="/admin" className="hover:text-white transition-colors text-zinc-400 text-[11px]">
          ATS
        </Link>
      </nav>

      {/* Right: Get Started / Live CTA Pill */}
      <div className="pointer-events-auto flex items-center gap-3">
        {isLiveInterview && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-mono uppercase tracking-wider font-bold">
            <Radio className="w-3 h-3 animate-pulse text-red-400" />
            <span>Live Session</span>
          </div>
        )}

        <Link
          href="/jobs"
          className="group px-5 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center gap-1.5"
        >
          <span>Get started</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}
