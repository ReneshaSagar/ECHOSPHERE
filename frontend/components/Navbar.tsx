'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles, Radio } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isAppRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/interview') || pathname?.startsWith('/report') || pathname?.startsWith('/setup');

  if (isAppRoute) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-5 pointer-events-none">
      {/* Left: Brand Logo Wordmark */}
      <div className="pointer-events-auto flex items-center gap-3">
        <Link href="/" className="group flex items-center gap-2 text-white hover:opacity-90 transition-opacity">
          <span className="text-xl font-medium tracking-[-0.03em] font-sans lowercase text-white">
            plantra
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-80 group-hover:scale-125 transition-transform"></span>
        </Link>
      </div>

      {/* Center: Floating Capsule Navigation Pill */}
      <nav className="pointer-events-auto hidden md:flex items-center gap-7 px-6 py-2.5 rounded-full bg-[#0d0d12]/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-xs text-zinc-300 font-medium">
        <Link href="/products" className="hover:text-white transition-colors">
          Products
        </Link>
        <Link href="/solutions" className="hover:text-white transition-colors">
          Solutions
        </Link>
        <Link href="/developers" className="hover:text-white transition-colors">
          Developers
        </Link>
        <Link href="/company" className="hover:text-white transition-colors">
          Company
        </Link>
        <Link href="/jobs" className="hover:text-white transition-colors flex items-center gap-1.5 text-zinc-100 font-semibold">
          <span>Careers</span>
          <span className="w-1 h-1 rounded-full bg-pink-400 animate-pulse"></span>
        </Link>
      </nav>

      {/* Right: Get Started / Live CTA Pill */}
      <div className="pointer-events-auto flex items-center gap-3">

        <Link
          href="/company"
          className="group px-5 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center gap-1.5"
        >
          <span>Talk to us</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}
