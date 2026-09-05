import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export default async function BlueprintViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  
  const blueprint = db.blueprints.find(b => b.interviewId === resolvedParams.id);
  const interview = db.interviews.find(i => i.id === resolvedParams.id);
  
  if (!blueprint || !interview) {
    return (
      <div className="p-8 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        Blueprint or Interview session not found
      </div>
    );
  }

  const application = db.applications.find(a => a.id === interview.applicationId);
  const candidate = db.candidates.find(c => c.id === application?.candidateId);

  let parsedJson;
  try {
    parsedJson = JSON.parse(blueprint.blueprintJson);
  } catch(e) {
    parsedJson = { error: "Failed to parse JSON" };
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <Link 
        href="/admin/schedule" 
        className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all font-mono text-xs inline-flex items-center gap-1.5 mb-2"
      >
        <span>←</span> Back to Schedule & Sessions
      </Link>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-cyan-300 bg-cyan-500/10 px-3 py-0.5 rounded-full border border-cyan-500/20 mb-2">
            <span>🎙️</span> AGORA ORCHESTRATION PAYLOAD
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Interview Blueprint</h1>
          <p className="text-white/50 text-xs mt-0.5">Generated for candidate: <strong className="text-white">{candidate?.name}</strong></p>
        </div>
        <Link 
          href={`/interview/${blueprint.id}`} 
          className="px-6 py-3 bg-white text-black font-sans font-bold text-xs rounded-full hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all inline-flex items-center gap-2 shrink-0"
        >
          <span>Launch AI Interview</span>
          <span>→</span>
        </Link>
      </div>

      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="p-6 bg-[#030304]/60 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Raw JSON Orchestrator Config</h2>
            <p className="text-xs text-white/40 mt-0.5 font-mono">This config drives the multi-agent RTC sessions and arbiters.</p>
          </div>
          <span className="font-mono text-[10px] bg-white/[0.05] text-white/60 px-2.5 py-1 rounded-full border border-white/[0.08]">
            JSON Schema v2
          </span>
        </div>
        <div className="p-6">
          <pre className="w-full bg-[#030304] text-emerald-400/90 p-5 rounded-2xl border border-white/[0.08] overflow-x-auto text-xs font-mono max-h-[600px] custom-scrollbar">
            {JSON.stringify(parsedJson, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

