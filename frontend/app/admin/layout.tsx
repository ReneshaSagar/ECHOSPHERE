import React from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen pt-16 bg-gray-100 text-gray-900 overflow-hidden">
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-600">EchoSphere Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="block p-2 rounded hover:bg-gray-100 font-medium">Dashboard</Link>
          <Link href="/admin/jobs" className="block p-2 rounded hover:bg-gray-100 font-medium">Job Postings</Link>
          <Link href="/admin/interviews" className="block p-2 rounded hover:bg-gray-100 font-medium text-gray-400 cursor-not-allowed">Interviews (Soon)</Link>
        </nav>
      </div>
      <div className="flex-1 overflow-auto p-8">
        {children}
      </div>
    </div>
  );
}
