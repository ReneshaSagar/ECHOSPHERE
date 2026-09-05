import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import PipelineBoard from './PipelineBoard';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  const job = db.jobs.find(j => j.id === resolvedParams.id);
  
  if (!job) {
    return (
      <div className="p-8 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        Job requisition not found
      </div>
    );
  }

  const applicants = db.applications
    .filter(a => a.jobId === job.id)
    .map(app => {
      const candidate = db.candidates.find(c => c.id === app.candidateId);
      return { ...app, candidate };
    });

  let parsedStages: string[] = [];
  try {
    parsedStages = JSON.parse(job.stagesJson);
  } catch(e) {
    parsedStages = ['Technical', 'HR'];
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/jobs" 
            className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all font-mono text-xs flex items-center gap-1.5"
          >
            <span>←</span> Back to Jobs
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{job.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/40 uppercase tracking-widest">Job ID:</span>
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/80">
            {job.id}
          </span>
        </div>
      </div>

      {/* Job Details Card */}
      <div className="bg-[#0a0a0d] p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>📋</span> Role Overview & Configuration
          </h2>
          <span className="font-mono text-xs bg-emerald-500/10 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30">
            Active Requisition
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-mono text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">Description</h3>
            <p className="text-xs text-white/80 leading-relaxed bg-[#030304] p-4 rounded-2xl border border-white/[0.06]">
              {job.description}
            </p>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">Requirements & Skills</h3>
            <pre className="text-xs font-mono text-white/80 leading-relaxed bg-[#030304] p-4 rounded-2xl border border-white/[0.06] whitespace-pre-wrap">
              {job.requirements}
            </pre>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-5">
          <h3 className="font-mono text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">Interview Pipeline Stages</h3>
          <div className="flex flex-wrap gap-2">
            {parsedStages.map((stage: string, i: number) => (
              <span key={i} className="px-3.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/20 flex items-center gap-2">
                <span className="text-[10px] opacity-60">0{i+1}</span>
                <span>{stage}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Applicant Pipeline Section */}
      <div>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Applicant Pipeline</h2>
            <p className="text-xs text-white/50 mt-0.5">Drag or change stages to progress candidates through technical screening.</p>
          </div>
          <div className="font-mono text-xs text-white/60 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/[0.08]">
            Total Applicants: <strong className="text-white">{applicants.length}</strong>
          </div>
        </div>

        <PipelineBoard applicants={applicants} />
      </div>
    </div>
  );
}

