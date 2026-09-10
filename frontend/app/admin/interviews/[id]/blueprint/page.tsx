import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import { Zap } from 'lucide-react';

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

      {candidate?.candidateContext?.interviewBrief && (
        <div className="bg-[#0a0a0d] rounded-3xl border border-emerald-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(16,185,129,0.08)] mb-6">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400 mb-4 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> LLM Pre-Interview Brief
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {candidate.candidateContext.interviewBrief.relevant_experience?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 mb-2">Relevant Experience</h4>
                  <ul className="space-y-2">
                    {candidate.candidateContext.interviewBrief.relevant_experience.map((exp: any, i: number) => (
                      <li key={i} className="text-xs flex flex-col gap-1 text-white/70 bg-white/[0.03] border border-white/[0.06] p-2.5 rounded-xl">
                        <span className="font-bold text-white/90">{exp.role} @ {exp.company}</span>
                        <span className="text-white/50">{exp.relevance_to_role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {candidate.candidateContext.interviewBrief.relevant_technical_skills?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 mb-2">Technical Alignment</h4>
                  <div className="flex flex-wrap gap-2">
                    {candidate.candidateContext.interviewBrief.relevant_technical_skills.map((skill: any, i: number) => (
                      <span key={i} className={`px-2 py-1 rounded-lg text-xs font-medium border ${skill.evidence_type === 'observed_evidence' ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/20' : 'bg-amber-950/30 text-amber-300 border-amber-500/20'}`}>
                        {skill.skill} <span className="opacity-50">({skill.evidence_type === 'observed_evidence' ? 'Verified' : 'Claim'})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {candidate.candidateContext.interviewBrief.areas_worth_probing?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">Areas to Probe</h4>
                  <ul className="space-y-2">
                    {candidate.candidateContext.interviewBrief.areas_worth_probing.map((area: string, i: number) => (
                      <li key={i} className="text-xs flex items-start gap-2 text-cyan-100 bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-xl">
                        <span className="text-cyan-400 shrink-0">›</span> {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {candidate.candidateContext.interviewBrief.claims_worth_validating?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-2">Claims to Validate</h4>
                  <ul className="space-y-2">
                    {candidate.candidateContext.interviewBrief.claims_worth_validating.map((claim: any, i: number) => (
                      <li key={i} className="text-xs flex flex-col gap-1 text-purple-100 bg-purple-950/20 border border-purple-500/20 p-2.5 rounded-xl">
                        <span><strong className="text-white/60">Claim:</strong> {claim.claim}</span>
                        <span className="text-purple-300/70"><strong className="text-purple-300/40">Validate:</strong> {claim.how_to_validate}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

