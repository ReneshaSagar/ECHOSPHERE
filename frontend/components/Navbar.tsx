'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Badge from './ui/Badge';
import ThemeToggle from './ThemeToggle';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isLiveInterview = pathname?.includes('/interview/') || pathname?.startsWith('/room/');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-[#00AEEF]/25 bg-white/90 dark:bg-[#0B121F]/90 px-4 sm:px-8 backdrop-blur-md transition-colors">
      {/* Brand & Logo */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="grid h-8 w-8 place-items-center bg-[#00AEEF] text-base font-black leading-none text-white rounded-sm shadow-sm">
            N
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-[-0.04em] text-[#102a3a] dark:text-slate-100 flex items-center gap-1.5 leading-tight">
              NEXORA <span className="text-xs font-semibold text-[#00AEEF] uppercase tracking-widest hidden sm:inline">LABS</span>
            </span>
          </div>
        </Link>

        {/* Primary Nav Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#4b6574] dark:text-slate-300">
          <Link href="/#platform" className="hover:text-[#00AEEF] transition-colors">
            Products
          </Link>
          <Link href="/#principles" className="hover:text-[#00AEEF] transition-colors">
            Principles
          </Link>
          <Link href="/#stack" className="hover:text-[#00AEEF] transition-colors">
            Developers
          </Link>
          <Link href="/jobs" className="hover:text-[#00AEEF] transition-colors text-[#00AEEF] flex items-center gap-1">
            Careers
            <span className="w-1.5 h-1.5 rounded-full bg-[#00AEEF] animate-pulse"></span>
          </Link>
        </div>
      </div>

      {/* Center Status indicator */}
      <div className="flex items-center justify-center">
        {isLiveInterview && (
          <Badge variant="live">LIVE SESSION</Badge>
        )}
      </div>

      {/* Right Actions & Attribution */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/40 border border-[#00AEEF]/30 text-[10px] font-bold uppercase tracking-[0.16em] text-[#007eb6] dark:text-[#38bdf8]">
          <Sparkles className="w-3 h-3 text-[#00AEEF]" />
          <span>Powered by OmniPanel</span>
        </div>

        <Link
          href="/admin"
          className="text-xs font-medium text-[#4b6574] dark:text-slate-400 hover:text-[#00AEEF] transition hidden sm:inline"
        >
          ATS Portal
        </Link>

        <Link
          href="/jobs"
          className="px-3.5 py-1.5 bg-[#00AEEF] hover:bg-[#008fca] text-white text-xs font-bold rounded shadow-xs transition flex items-center gap-1.5"
        >
          <span>Join Us</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <ThemeToggle />
      </div>
    </nav>
  );
}
