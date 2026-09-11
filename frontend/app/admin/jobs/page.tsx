import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import { Briefcase, ArrowRight, Users, Plus, ExternalLink, Sparkles } from 'lucide-react';

export default function AdminJobsList() {
  const db = getDb();

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              REQUISITIONS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Job Requisitions & Openings</span>
          </h1>
          <p className="text-white/50 text-xs sm:text-sm mt-1">
            Configure technical evaluation criteria, interview blueprints, and stage pipelines.
          </p>
        </div>

        <Link 
          href="/admin/jobs/new" 
          className="px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold text-xs shadow-[0_0_20px_rgba(255,255,255,0.15)] transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Post New Job</span>
        </Link>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 gap-4">
        {db.jobs.map(job => {
          const appCount = db.applications.filter(a => a.jobId === job.id).length;
          const scheduledCount = db.interviews.filter(i => {
            const app = db.applications.find(a => a.id === i.applicationId);
            return app?.jobId === job.id && (i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS');
          }).length;

          let stages: string[] = [];
          try {
            stages = JSON.parse(job.stagesJson);
          } catch {
            stages = ['Workspace Assessment', 'Tech Panel', 'Leadership'];
          }

          return (
            <div 
              key={job.id} 
              className="bg-[#0a0a0e] hover:bg-[#0f0f15] p-5 sm:p-6 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-base text-white hover:text-purple-300 transition">
                      <Link href={`/admin/jobs/${job.id}`}>{job.title}</Link>
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-full">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2 max-w-2xl leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-right">
                    <div className="text-sm font-bold text-white font-mono">{appCount}</div>
                    <div className="text-[10px] text-white/40 font-mono uppercase">Applicants</div>
                  </div>

                  <Link 
                    href={`/admin/jobs/${job.id}`} 
                    className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-white font-mono text-xs rounded-xl border border-white/[0.1] transition flex items-center gap-1.5"
                  >
                    <span>Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Stages Bar */}
              <div className="pt-3 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-white/40">3 Rounds:</span>
                  {stages.map((stage, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-white/70"
                    >
                      {stage}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-white/40">
                  <span>{scheduledCount} active sessions</span>
                  <span>•</span>
                  <Link 
                    href={`/jobs/${job.id}`} 
                    target="_blank"
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <span>Candidate View</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {db.jobs.length === 0 && (
          <div className="p-12 text-center bg-[#0a0a0e] rounded-2xl border border-white/[0.08] text-white/40 font-mono text-xs">
            No job requisitions created yet. Click "+ Post New Job" to create your first listing.
          </div>
        )}
      </div>
    </div>
  );
}


