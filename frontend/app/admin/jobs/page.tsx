import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import { Briefcase, ArrowRight } from 'lucide-react';

export default function AdminJobsList() {
  const db = getDb();

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-sans font-bold text-white tracking-tight flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-white/70" />
            <span>job postings</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">Manage active listings and interview blueprints.</p>
        </div>
        <Link 
          href="/admin/jobs/new" 
          className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full font-sans font-bold text-xs shadow-[0_0_20px_rgba(255,255,255,0.15)] transition"
        >
          + create job
        </Link>
      </div>

      <div className="bg-[#0a0a0d] rounded-2xl border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] font-mono font-semibold text-white/50 uppercase tracking-wider">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4">Applications</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-sm">
            {db.jobs.map(job => {
              const appCount = db.applications.filter(a => a.jobId === job.id).length;
              return (
                <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-sans font-bold text-white">{job.title}</div>
                    <div className="text-xs font-mono text-white/40 truncate max-w-sm mt-0.5">{job.description}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-mono font-bold text-white/90 bg-white/[0.08] border border-white/[0.1] rounded-full">
                      {appCount}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link 
                      href={`/admin/jobs/${job.id}`} 
                      className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white font-mono text-xs rounded-xl border border-white/[0.08] transition inline-flex items-center gap-1"
                    >
                      <span>manage</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {db.jobs.length === 0 && (
          <div className="p-8 text-center text-white/40 font-mono text-xs">no jobs posted yet.</div>
        )}
      </div>
    </div>
  );
}

