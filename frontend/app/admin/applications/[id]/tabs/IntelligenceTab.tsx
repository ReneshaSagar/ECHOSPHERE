import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Brain, CheckCircle, TrendingUp, MessageSquare, Zap, Code2, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import ScorecardDisplay from '@/components/ScorecardDisplay';

interface IntelligenceTabProps {
  candidateContext: any;
  interview: any;
  blueprint: any;
  parsedBlueprint: any;
  candidateName: string;
}

export default function IntelligenceTab({ candidateContext, interview, blueprint, parsedBlueprint, candidateName }: IntelligenceTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ── POST-INTERVIEW SCORECARD ── */}
      {interview?.scorecard ? (
        <>
          <ScorecardDisplay scorecard={interview.scorecard} />
          {/* Divider before briefing */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Pre-Interview Agent Briefing</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
        </>
      ) : interview && (
        <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-8 text-center">
          <Brain className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <p className="text-white font-bold text-sm mb-1">Scorecard not yet generated</p>
          <p className="text-white/40 text-xs">The interview is complete — scroll down to generate the AI scorecard.</p>
        </div>
      )}


      {candidateContext?.interviewBrief && (
        <div className="bg-[#0a0a0d] rounded-3xl border border-emerald-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(16,185,129,0.08)] space-y-6">
          
          {/* Header & Candidate Snapshot */}
          <div className="border-b border-white/[0.08] pb-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-emerald-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> LLM Pre-Interview Brief (Comprehensive AI Dossier)
              </h3>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-full">
                10-Point Analysis Active
              </span>
            </div>

            {candidateContext.interviewBrief.candidate_snapshot && (
              <div className="bg-[#030304] border border-white/[0.08] rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-white/40 uppercase block mb-1">Current Role</span>
                  <p className="font-semibold text-white">{candidateContext.interviewBrief.candidate_snapshot.current_role || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-white/40 uppercase block mb-1">Target Role</span>
                  <p className="font-semibold text-cyan-300">{candidateContext.interviewBrief.candidate_snapshot.target_role || 'N/A'}</p>
                </div>
                <div className="lg:col-span-2">
                  <span className="text-[10px] font-mono text-white/40 uppercase block mb-1">Overall Relevance</span>
                  <p className="text-white/80 leading-relaxed">{candidateContext.interviewBrief.candidate_snapshot.overall_relevance || candidateContext.interviewBrief.candidate_snapshot.relevant_background || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Grid Layout for Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. RELEVANT TECHNICAL SKILLS */}
            {(candidateContext.interviewBrief.relevant_technical_skills?.length > 0) && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" /> 1. Relevant Technical Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {candidateContext.interviewBrief.relevant_technical_skills.map((s: any, i: number) => {
                    const isObserved = s.evidence_type === 'observed_evidence';
                    const isClaim = s.evidence_type === 'candidate_claim';
                    return (
                      <div key={i} className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-2 ${
                        isObserved ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' :
                        isClaim ? 'bg-amber-950/30 border-amber-500/30 text-amber-200' :
                        'bg-purple-950/30 border-purple-500/30 text-purple-200'
                      }`}>
                        <span className="font-bold text-white">{s.skill || s}</span>
                        {s.evidence_type && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 uppercase">
                            {s.evidence_type.replace('_', ' ')} {s.source ? `via ${s.source}` : ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. RELEVANT PROJECTS & GITHUB REPOS */}
            {(candidateContext.interviewBrief.relevant_projects?.length > 0 || candidateContext.interviewBrief.relevant_projects_repos?.length > 0) && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> 2. Relevant Projects & Repositories
                </h4>
                <div className="space-y-3">
                  {(candidateContext.interviewBrief.relevant_projects || candidateContext.interviewBrief.relevant_projects_repos).map((p: any, i: number) => (
                    <div key={i} className="bg-[#070709] border border-white/[0.08] p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-sm">{p.name}</span>
                        {p.source && <span className="text-[9px] font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-md">{p.source}</span>}
                      </div>
                      {p.description && <p className="text-white/70">{p.description}</p>}
                      {p.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.technologies.map((tech: string, tIdx: number) => (
                            <span key={tIdx} className="text-[9px] font-mono bg-white/[0.05] text-white/60 px-1.5 py-0.5 rounded">{tech}</span>
                          ))}
                        </div>
                      )}
                      {p.candidate_contribution && <p className="text-emerald-300/80 text-[11px]"><strong className="text-white/60">Contribution:</strong> {p.candidate_contribution}</p>}
                      {p.why_relevant && <p className="text-cyan-300/80 text-[11px]"><strong className="text-white/60">Why Relevant:</strong> {p.why_relevant}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. RELEVANT EXPERIENCE */}
            {candidateContext.interviewBrief.relevant_experience?.length > 0 && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3 lg:col-span-2">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> 3. Targeted Role Experience
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidateContext.interviewBrief.relevant_experience.map((e: any, i: number) => (
                    <div key={i} className="bg-[#070709] border border-white/[0.08] p-4 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                        <span className="font-bold text-white">{e.role} @ {e.company}</span>
                        <span className="text-[10px] font-mono text-white/40">{e.duration}</span>
                      </div>
                      {e.what_they_worked_on && <p className="text-white/80"><strong className="text-white/50">Worked On:</strong> {e.what_they_worked_on}</p>}
                      {e.relevant_responsibilities && <p className="text-white/70"><strong className="text-white/50">Responsibilities:</strong> {e.relevant_responsibilities}</p>}
                      {e.relevance_to_role && <p className="text-cyan-200/90"><strong className="text-cyan-400/60">Relevance:</strong> {e.relevance_to_role}</p>}
                      {e.claims_vs_evidence && <p className="text-amber-200/80 bg-amber-950/20 p-2 rounded-lg border border-amber-500/20"><strong className="text-amber-300">Claims vs Evidence:</strong> {e.claims_vs_evidence}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. VERIFIED EVIDENCE */}
            {candidateContext.interviewBrief.verified_evidence?.length > 0 && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> 4. Directly Verified Evidence
                </h4>
                <div className="space-y-2">
                  {candidateContext.interviewBrief.verified_evidence.map((v: any, i: number) => (
                    <div key={i} className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-emerald-200">{v.item}</span>
                        <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">{v.evidence_strength || 'High'} Strength</span>
                      </div>
                      {v.provenance && <p className="text-white/50 text-[10px] font-mono">Provenance: {v.provenance}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. CLAIMS TO VALIDATE */}
            {candidateContext.interviewBrief.claims_to_validate?.length > 0 && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> 5. Claims Requiring Validation
                </h4>
                <div className="space-y-2">
                  {candidateContext.interviewBrief.claims_to_validate.map((c: any, i: number) => (
                    <div key={i} className="bg-purple-950/20 border border-purple-500/20 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">"{c.claim}"</span>
                        {c.source && <span className="text-[9px] font-mono text-purple-300/60">Source: {c.source}</span>}
                      </div>
                      <p className="text-purple-200/80"><strong className="text-purple-300/50">Validation Method:</strong> {c.what_needs_validation || c.how_to_validate}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. AREAS WORTH PROBING */}
            {candidateContext.interviewBrief.areas_worth_probing?.length > 0 && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> 6. Key Probing Vectors
                </h4>
                <div className="space-y-2">
                  {candidateContext.interviewBrief.areas_worth_probing.map((a: any, i: number) => {
                    const areaText = typeof a === 'string' ? a : a.area;
                    const whyText = typeof a === 'object' ? a.why_worth_probing : null;
                    return (
                      <div key={i} className="bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-xl text-xs space-y-1">
                        <p className="font-semibold text-cyan-100 flex items-start gap-2">
                          <span className="text-cyan-400 shrink-0">›</span> {areaText}
                        </p>
                        {whyText && <p className="text-cyan-300/70 pl-4 text-[11px]"><strong className="text-white/50">Why Probe:</strong> {whyText}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7. POTENTIAL GAPS & UNCERTAINTIES */}
            {candidateContext.interviewBrief.potential_gaps?.length > 0 && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> 7. Potential Gaps & Uncertainties
                </h4>
                <div className="space-y-2">
                  {candidateContext.interviewBrief.potential_gaps.map((g: any, i: number) => {
                    const gapText = typeof g === 'string' ? g : g.gap || g.gap_description;
                    const level = typeof g === 'object' ? g.concern_level : 'Moderate';
                    return (
                      <div key={i} className="bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl text-xs flex items-center justify-between gap-2">
                        <span className="text-amber-200">{gapText}</span>
                        {level && <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">{level} Concern</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. ROLE ALIGNMENT */}
            {candidateContext.interviewBrief.role_alignment && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3 lg:col-span-2">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/70">
                  8. Role Requirement Alignment
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block">Strong Matches</span>
                    <ul className="space-y-1 text-emerald-200">
                      {candidateContext.interviewBrief.role_alignment.strong_matches?.map((m: string, i: number) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block">Partial Matches</span>
                    <ul className="space-y-1 text-amber-200">
                      {candidateContext.interviewBrief.role_alignment.partial_matches?.map((m: string, i: number) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-rose-400 uppercase block">Missing / Unclear</span>
                    <ul className="space-y-1 text-rose-200">
                      {candidateContext.interviewBrief.role_alignment.missing_or_unclear?.map((m: string, i: number) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 9 & 10. INTERVIEW GUIDANCE */}
            {candidateContext.interviewBrief.interview_guidance && (
              <div className="bg-[#030304]/60 border border-white/[0.06] rounded-2xl p-5 space-y-3 lg:col-span-2">
                <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400">
                  9 & 10. AI Panel Directives & Interview Guidance
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase block">Highest-Value Investigations</span>
                    <ul className="space-y-1 text-indigo-100">
                      {candidateContext.interviewBrief.interview_guidance.highest_value_investigations?.map((item: string, i: number) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-rose-300 uppercase block">Do NOT Assume</span>
                    <ul className="space-y-1 text-rose-100">
                      {candidateContext.interviewBrief.interview_guidance.do_not_assume?.map((item: string, i: number) => (
                        <li key={i}>⚠️ {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Agent Blueprint */}
      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="p-6 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-[#0a0a0d] border-b border-white/[0.08] flex justify-between items-center gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              AGORA REAL-TIME VOICE AI
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">🎙️ Agent Briefing & Interview Directives</h2>
            <p className="text-white/50 text-xs mt-1">System instructions and evaluation rubrics dispatched to the AI Panel</p>
          </div>
          {blueprint && (
            <Link href={`/interview/${blueprint.id}`}
              className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 font-bold rounded-full text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all">
              Launch Live Room →
            </Link>
          )}
        </div>

        <div className="p-6 space-y-6">
          {parsedBlueprint?.interview_rounds ? (
            <div className="space-y-4">
              {parsedBlueprint.interview_rounds.map((round: any, idx: number) => (
                <div key={idx} className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#030304]/60">
                  <div className="px-5 py-4 bg-white/[0.03] border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm">Round {idx + 1}: {round.round_name}</span>
                    <span className="font-mono text-xs bg-indigo-500/10 text-indigo-300 font-semibold px-3 py-1 rounded-full border border-indigo-500/20">
                      {round.interviewer?.name || (round.interviewers?.map((i: any) => i.name).join(' & '))} ({round.interviewer?.role || round.interviewers?.[0]?.role})
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">🔊 Opening Line</h4>
                      <p className="text-xs bg-emerald-950/20 border border-emerald-500/20 text-emerald-200 p-4 rounded-2xl italic leading-relaxed">
                        "{round.interviewer?.greeting_message || round.interviewers?.[0]?.greeting_message}"
                      </p>
                    </div>
                    <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">🧠 Agent Instructions</h4>
                      <p className="text-xs bg-indigo-950/20 border border-indigo-500/20 text-white/70 p-4 rounded-2xl whitespace-pre-wrap leading-relaxed font-mono">
                        {round.interviewer?.instructions || round.interviewers?.[0]?.instructions}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : interview ? (
            <div className="text-center py-8 text-white/60 text-sm">
              <p className="mb-4">Interview is scheduled but blueprint hasn't been generated yet.</p>
              <Link href="/admin/schedule" className="px-5 py-2 bg-white text-black font-bold rounded-full text-xs hover:bg-neutral-200 transition">
                Go to Schedule & Generate →
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 text-white/60 text-sm">
              No interview scheduled yet. Select this candidate for interview to generate the AI panel.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
