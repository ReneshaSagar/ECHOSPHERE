"use client";

import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { CheckCircle, TrendingUp, MessageSquare, BarChart2 } from 'lucide-react';

interface ScorecardDisplayProps {
  scorecard: any;
}

export default function ScorecardDisplay({ scorecard: sc }: ScorecardDisplayProps) {
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
    
  const radarData = rubric.map((e: any) => ({
    subject: (e.pillar || 'Skill').split(' ').slice(0, 2).join(' '),
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
            <p className="text-white/40 text-xs mt-0.5">Transcript-grounded multi-agent assessment</p>
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
            <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-1">Overall Score</div>
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
            return (
              <div key={i} className="bg-[#030304] rounded-2xl p-5 border border-white/[0.06]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <h5 className="font-bold text-white text-sm">{e.pillar}</h5>
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
