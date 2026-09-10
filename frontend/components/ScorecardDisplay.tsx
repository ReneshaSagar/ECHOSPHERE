"use client";

import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { CheckCircle, TrendingUp, MessageSquare, BarChart2, Code2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Cpu, Layers, Server, AlertTriangle, HeartHandshake } from 'lucide-react';

interface ScorecardDisplayProps {
  scorecard: any;
}

export default function ScorecardDisplay({ scorecard: sc }: ScorecardDisplayProps) {
  const [isRound1Expanded, setIsRound1Expanded] = useState(false);
  const [isRound2Expanded, setIsRound2Expanded] = useState(false);
  const [isRound3Expanded, setIsRound3Expanded] = useState(false);
  if (!sc) return null;

  const rubric: any[] = sc.rubric_evaluations || [];
  const getScore = (e: any): number => {
    if (typeof e.competencyScore === 'number') return e.competencyScore;
    if (typeof e.score === 'number') return e.score * 20;
    return 50;
  };

  const overallScore = sc.overallScore ?? (rubric.length > 0
    ? Math.round(rubric.reduce((s: number, e: any) => s + getScore(e), 0) / rubric.length) : 0);
  const isStrong = sc.overall_recommendation?.toLowerCase().includes('strong');
  const isNoHire = sc.overall_recommendation?.toLowerCase().includes('no hire') || sc.overall_recommendation?.toLowerCase().includes('no_hire');
  
  const isDisqualified = sc.overall_recommendation?.toLowerCase().includes('disqualified');
  const verdictColor = isDisqualified ? '#64748b' : isNoHire ? '#f43f5e' : isStrong ? '#10b981' : '#f59e0b';
  const verdictBg = isDisqualified
    ? 'bg-slate-500/10 text-slate-300 border-slate-500/30'
    : isNoHire
    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
    : isStrong ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
    : 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    
  const multiRoundRounds: any[] = sc.multiRoundBreakdown || [];
  const round1: any = sc.round1Evaluation;
  const round2: any = sc.round2Evaluation;
  const round3: any = sc.round3Evaluation;

  const formatPillarName = (name: string): string => {
    const n = (name || '').toLowerCase();
    if (n.includes('problem') || n.includes('algorithm') || n.includes('code')) return 'Problem Solving';
    if (n.includes('architecture') || n.includes('system')) return 'System Arch';
    if (n.includes('experience') || n.includes('judgment') || n.includes('real-world')) return 'Eng Judgment';
    if (n.includes('ownership') || n.includes('accountability')) return 'Ownership';
    if (n.includes('collaboration') || n.includes('teamwork') || n.includes('conflict')) return 'Teamwork';
    if (n.includes('communication') || n.includes('clarity')) return 'Communication';
    return name?.length > 14 ? name.slice(0, 14) + '…' : (name || 'Competency');
  };

  const radarData = rubric.map((e: any) => ({
    subject: formatPillarName(e.pillar),
    score: getScore(e),
  }));

  const allQuotes: { text: string; pillar: string }[] = [];
  rubric.forEach((e: any) => {
    if (e.evidence?.length) e.evidence.slice(0, 2).forEach((q: string) => allQuotes.push({ text: q, pillar: e.pillar }));
  });

  return (
    <div className="space-y-5 text-left">
      {/* Header */}
      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[10px] text-purple-300 bg-purple-500/10 px-3 py-0.5 rounded-full border border-purple-500/20 mb-2">✦ AI PANEL EVALUATION COMPLETE</div>
            <h3 className="text-xl font-bold text-white">Final Candidate Scorecard</h3>
            <p className="text-white/40 text-xs mt-0.5">Multi-round practical coding, technical panel & HR assessment report</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-mono font-bold text-xs tracking-wider border shrink-0 ${verdictBg}`}>
            {sc.overall_recommendation?.toUpperCase()}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-[#030304] border border-white/[0.06] rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: verdictColor }}>
              {isDisqualified ? 'N/A' : overallScore}
            </div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-1">Composite Score</div>
          </div>
          <div className="bg-[#030304] border border-white/[0.06] rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{rubric.filter((e: any) => getScore(e) >= 70).length}/{rubric.length}</div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-1">Strong Pillars</div>
          </div>
          <div className="bg-[#030304] border border-white/[0.06] rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{allQuotes.length}</div>
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-1">Evidence Quotes</div>
          </div>
        </div>
      </div>

      {/* Multi-Round Breakdown Bar */}
      {multiRoundRounds.length > 0 && (
        <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-white/60">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-white">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Multi-Round Score Distribution
            </span>
            <span>35% Coding • 50% Technical • 15% HR</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {multiRoundRounds.map((r: any, idx: number) => (
              <div key={idx} className="p-3 bg-[#030304] border border-white/[0.06] rounded-xl text-xs space-y-1">
                <div className="text-[10px] font-mono text-white/40 uppercase flex justify-between">
                  <span>{r.roundType}</span>
                  <span>{Math.round(r.weight * 100)}%</span>
                </div>
                <div className="font-bold text-white text-base">{r.rawScore}<span className="text-xs text-white/40 font-mono">/100</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round 1 Workspace Assessment Card */}
      {round1 && (
        <div className="bg-[#0a0a0d] border border-cyan-500/20 rounded-3xl p-5 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-bold text-white text-sm">Round 1: Practical Problem Solving & Codecraft</span>
                <span className="text-[10px] font-mono text-cyan-300 ml-2 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                  {round1.score}/100 ({round1.decision})
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsRound1Expanded(!isRound1Expanded)}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            >
              {isRound1Expanded ? 'Hide Details ↑' : 'View Breakdown ↓'}
            </button>
          </div>

          <p className="text-xs text-white/70 leading-relaxed bg-[#030304] p-3.5 rounded-xl border border-white/[0.06]">
            {round1.reason}
          </p>

          {isRound1Expanded && (
            <div className="space-y-3 pt-2">
              {round1.competencyEvaluations?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {round1.competencyEvaluations.map((c: any, idx: number) => (
                    <div key={idx} className="bg-[#030304] p-3 rounded-xl border border-white/[0.06] text-xs space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{c.competency}</span>
                        <span>{c.score}/100</span>
                      </div>
                      <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${c.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {round1.workspaceEvidence?.code && (
                <pre className="bg-[#030304] p-3 rounded-xl font-mono text-xs text-white/70 border border-white/[0.06] max-h-36 overflow-x-auto custom-scrollbar">
                  {round1.workspaceEvidence.code}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Round 2 Technical Assessment Card */}
      {round2 && (
        <div className="bg-[#0a0a0d] border border-indigo-500/20 rounded-3xl p-5 space-y-4 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="font-bold text-white text-sm">Round 2: Technical Interview Assessment</span>
                <span className={`text-[10px] font-mono ml-2 px-2 py-0.5 rounded border ${
                  round2.technicalBar === 'met' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' :
                  round2.technicalBar === 'not_met' ? 'bg-rose-950/40 text-rose-300 border-rose-500/30' :
                  'bg-amber-950/40 text-amber-300 border-amber-500/30'
                }`}>
                  {round2.score}/100 (BAR: {round2.technicalBar?.toUpperCase()})
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsRound2Expanded(!isRound2Expanded)}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
            >
              {isRound2Expanded ? 'Hide Details ↑' : 'View Breakdown ↓'}
            </button>
          </div>

          <p className="text-xs text-white/70 leading-relaxed bg-[#030304] p-3.5 rounded-xl border border-white/[0.06]">
            {round2.summary}
          </p>

          {isRound2Expanded && (
            <div className="space-y-3 pt-2">
              {round2.competencies?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {round2.competencies.map((c: any, idx: number) => (
                    <div key={idx} className="bg-[#030304] p-3 rounded-xl border border-white/[0.06] text-xs space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{c.name}</span>
                        <span>{c.score}/100</span>
                      </div>
                      <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${c.score}%` }} />
                      </div>
                      {c.feedback && <p className="text-[11px] text-white/50">{c.feedback}</p>}
                    </div>
                  ))}
                </div>
              )}

              {round2.validatedExperience?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Profile Claims Verification</div>
                  {round2.validatedExperience.map((ve: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#030304] border border-white/[0.06] flex items-start gap-2 text-xs">
                      {ve.demonstrated ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-white">{ve.claim}: </span>
                        <span className="text-white/60">{ve.validationNote}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Round 3 Behavioral & Cultural Alignment Card */}
      {round3 && (
        <div className="bg-[#0a0a0d] border border-amber-500/20 rounded-3xl p-5 space-y-4 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <HeartHandshake className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-bold text-white text-sm">Round 3: Behavioral & Cultural Alignment</span>
                <span className={`text-[10px] font-mono ml-2 px-2 py-0.5 rounded border ${
                  round3.decision === 'PASS' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' :
                  'bg-rose-950/40 text-rose-300 border-rose-500/30'
                }`}>
                  {round3.score}/100 ({round3.overallRecommendation?.toUpperCase() || round3.decision})
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsRound3Expanded(!isRound3Expanded)}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 transition cursor-pointer"
            >
              {isRound3Expanded ? 'Hide Details ↑' : 'View Breakdown ↓'}
            </button>
          </div>

          <p className="text-xs text-white/70 leading-relaxed bg-[#030304] p-3.5 rounded-xl border border-white/[0.06]">
            {round3.reason}
          </p>

          {isRound3Expanded && (
            <div className="space-y-3 pt-2">
              {round3.competencies?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {round3.competencies.map((c: any, idx: number) => (
                    <div key={idx} className="bg-[#030304] p-3 rounded-xl border border-white/[0.06] text-xs space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{c.competency}</span>
                        <span>{c.score}/100</span>
                      </div>
                      <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${c.score}%` }} />
                      </div>
                      {c.feedback && <p className="text-[11px] text-white/50">{c.feedback}</p>}
                    </div>
                  ))}
                </div>
              )}

              {round3.keyMoments?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Key Behavioral Moments (STAR)</div>
                  {round3.keyMoments.map((km: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#030304] border border-white/[0.06] space-y-1 text-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono text-amber-300 font-bold">
                        <span>{km.competency}</span>
                      </div>
                      <p className="text-white/70 italic">&ldquo;{km.quote}&rdquo;</p>
                      <div className="text-[11px] text-white/50">
                        <strong>Outcome:</strong> {km.outcome}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Radar + Strengths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {radarData.length > 2 && (
          <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6">
            <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.18em] mb-3 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5" /> Evaluation Radar
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.18} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {sc.strengths?.length > 0 && (
            <div className="bg-[#0a0a0d] border border-emerald-500/20 rounded-3xl p-5">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-[0.18em] mb-3">
                <CheckCircle className="w-3.5 h-3.5" /> Key Verified Strengths
              </div>
              <ul className="space-y-2">
                {sc.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/80 leading-relaxed">
                    <span className="text-emerald-400 mt-0.5 shrink-0">•</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sc.weaknesses?.length > 0 && (
            <div className="bg-[#0a0a0d] border border-amber-500/20 rounded-3xl p-5">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-[0.18em] mb-3">
                <TrendingUp className="w-3.5 h-3.5" /> Target Areas for Growth
              </div>
              <ul className="space-y-2">
                {sc.weaknesses.map((w: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/80 leading-relaxed">
                    <span className="text-amber-400 mt-0.5 shrink-0">•</span><span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Executive MoM */}
      {(sc.overall_summary || allQuotes.length > 0) && (
        <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-purple-400 uppercase tracking-[0.18em] mb-3">
            <MessageSquare className="w-3.5 h-3.5" /> Executive Recruiter Minutes of Meeting (MoM)
          </div>
          {sc.overall_summary && <p className="text-sm text-white/80 leading-relaxed mb-4">{sc.overall_summary}</p>}
          {allQuotes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allQuotes.slice(0, 4).map((q, i) => (
                <div key={i} className="bg-[#030304] border border-white/[0.06] rounded-2xl p-3.5">
                  <div className="text-[9px] font-mono text-purple-400 uppercase tracking-wider mb-1.5">{q.pillar}</div>
                  <p className="text-xs text-white/70 italic leading-relaxed">&ldquo;{q.text}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Competency Rubric */}
      <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6">
        <div className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.18em] mb-4 pb-2 border-b border-white/[0.06]">
          Competency & Evidence Rubric Breakdown
        </div>
        <div className="space-y-4">
          {rubric.map((e: any, i: number) => {
            const scoreNum = getScore(e);
            const quality = e.evidenceQuality || (scoreNum >= 75 ? 'STRONG' : scoreNum >= 50 ? 'PARTIAL' : 'NONE');
            const barColor = scoreNum >= 75 ? '#10b981' : scoreNum >= 55 ? '#f59e0b' : '#f43f5e';
            const roundTag = e.round || (
              e.pillar?.includes('Problem') ? 'Round 1: Coding' :
              e.pillar?.includes('Architecture') || e.pillar?.includes('Experience') ? 'Round 2: Technical' :
              e.pillar?.includes('Ownership') || e.pillar?.includes('Collaboration') ? 'Round 3: HR' : 'Cross-Round'
            );
            return (
              <div key={i} className="bg-[#030304] rounded-2xl p-5 border border-white/[0.06]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h5 className="font-bold text-white text-sm">{e.pillar}</h5>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20">
                      {roundTag}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${quality === 'STRONG' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : quality === 'PARTIAL' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}>
                      {quality}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">{scoreNum}/100</span>
                    <div className="w-24 bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(4, scoreNum))}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-3">{e.feedback}</p>
                {e.evidence?.length > 0 && (
                  <div className="space-y-2">
                    {e.evidence.map((q: string, qi: number) => (
                      <div key={qi} className="bg-indigo-950/20 border-l-2 border-indigo-400 pl-3 pr-3 py-2.5 rounded-r-xl text-xs text-white/70 italic leading-relaxed">
                        &ldquo;{q}&rdquo;
                      </div>
                    ))}
                  </div>
                )}
                {e.missingEvidence?.length > 0 && (
                  <div className="mt-2 text-[11px] text-rose-300/80 font-mono bg-rose-950/20 px-3 py-2 rounded-lg border border-rose-500/20">
                    <strong className="text-rose-300">Missing: </strong>
                    {Array.isArray(e.missingEvidence) ? e.missingEvidence.join('; ') : e.missingEvidence}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
