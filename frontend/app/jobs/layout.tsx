import React from 'react';
import Link from 'next/link';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pt-16">
      <header className="bg-white border-b sticky top-16 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/jobs" className="text-2xl font-bold text-blue-600">mr.technologies Careers</Link>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 hover:underline">Admin Login</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
