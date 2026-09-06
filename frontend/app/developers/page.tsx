import React from 'react';
import Link from 'next/link';

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#030304] text-[#f4f4f5] pt-32 px-6 sm:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl sm:text-6xl font-serif text-white">Developers</h1>
        <p className="text-zinc-400 font-sans leading-relaxed text-lg">
          Build the next generation of intelligent software with the Nexora SDK.
        </p>
        <ul className="space-y-4 text-zinc-300 font-mono text-sm">
          <li>- API Overview</li>
          <li>- SDKs</li>
          <li>- Documentation</li>
          <li>- Example Code Snippets</li>
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
