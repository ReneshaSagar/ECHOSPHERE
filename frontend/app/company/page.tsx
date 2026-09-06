import React from 'react';
import Link from 'next/link';

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-[#030304] text-[#f4f4f5] pt-32 px-6 sm:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl sm:text-6xl font-serif text-white">Company</h1>
        <p className="text-zinc-400 font-sans leading-relaxed text-lg">
          Nexora Labs is a global technology company building the infrastructure behind intelligent software.
        </p>
        <ul className="space-y-4 text-zinc-300 font-mono text-sm">
          <li>- About Nexora</li>
          <li>- Mission & Principles</li>
          <li>- Locations</li>
          <li>- Leadership Team</li>
        </ul>
        <div className="pt-8">
          <Link href="/" className="text-amber-400 hover:underline font-mono text-xs">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
