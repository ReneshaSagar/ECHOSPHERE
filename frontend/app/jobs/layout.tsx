import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pt-16 flex flex-col">
      <header className="bg-white/95 border-b border-gray-200 sticky top-16 z-20 shadow-2xs backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/jobs" className="flex items-center gap-2 font-bold text-gray-900 text-lg hover:text-blue-600 transition">
              <span className="w-7 h-7 rounded bg-[#00AEEF] text-white flex items-center justify-center text-sm font-black">N</span>
              <span>Nexora Labs</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hidden sm:inline">Careers</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="hidden sm:flex items-center gap-1 text-gray-500 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#00AEEF]" />
              <span>Interviews powered by OmniPanel</span>
            </div>
            <Link href="/admin" className="text-gray-500 hover:text-gray-900 transition hover:underline">
              Recruiter Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            © 2026 Nexora Labs, Inc. • Bengaluru HQ · Singapore · London
          </div>
          <div className="flex items-center gap-1.5 text-blue-600 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Candidate Experience Powered by OmniPanel</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
