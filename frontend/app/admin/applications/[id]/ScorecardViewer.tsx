"use client";
import React, { useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, MessageSquare, Clock, CheckCircle, AlertTriangle,
  Quote, Brain, Activity, Zap, Star, Shield, BarChart2
} from 'lucide-react';

function OverallScoreRing({ score, verdict }: { score: number; verdict: string }) {
  const isNoHire = verdict?.toLowerCase().includes('no hire');
  const isStrong = verdict?.toLowerCase().includes('strong');
  const isDisqualified = verdict?.toLowerCase().includes('disqualified');
  const color = isDisqualified ? '#64748b' : isNoHire ? '#f43f5e' : isStrong ? '#10b981' : '#f59e0b';
  const size = 120;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, score) / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        {!isDisqualified && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isDisqualified ? (
          <Shield className="w-8 h-8 text-slate-500 mb-1" />
        ) : (
          <>
            <span className="text-2xl font-bold text-white">{score}</span>
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">/ 100</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function ScorecardViewer({ interviewId, initialScorecard }: { interviewId: string; initialScorecard?: any }) {
  const [scorecard, setScorecard] = useState<any>(initialScorecard);
  const [loading, setLoading] = useState(false);

  const generateScorecard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/evaluate-final`, { method: 'POST' });
      const data = await res.json();
      if (data.scorecard) setScorecard(data.scorecard);
      else alert(data.error || 'Failed to generate scorecard');
    } catch { alert('Error generating scorecard'); }
    setLoading(false);
  };

  if (!scorecard) {
    return (
      <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center mx-auto mb-4 text-xl">⚖️</div>
        <h3 className="text-xl font-bold text-white mb-2">Final Interview Scorecard</h3>
        <p className="text-xs text-white/50 mb-6 leading-relaxed max-w-sm mx-auto">
          The interview has concluded. Generate the automated multi-agent synthesis and assessment of the entire transcript.
        </p>
        <button onClick={generateScorecard} disabled={loading}
          className="bg-white text-black font-bold py-3 px-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-neutral-200 disabled:opacity-40 transition-all text-xs">
          {loading ? 'Evaluating Transcript...' : 'Generate Comprehensive Scorecard →'}
        </button>
      </div>
    );
  }

  const isNoHire = scorecard.overall_recommendation?.toLowerCase().includes('no hire');
  const isStrong = scorecard.overall_recommendation?.toLowerCase().includes('strong');
  const verdictBg = isNoHire ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
    : isStrong ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
    : 'bg-amber-500/10 text-amber-300 border-amber-500/30';

  // Compute overall score from rubric
  const rubric: any[] = scorecard.rubric_evaluations || [];
  const overallScore = rubric.length > 0
    ? Math.round(rubric.reduce((sum: number, e: any) => {
        const s = typeof e.competencyScore === 'number' ? e.competencyScore : (typeof e.score === 'number' ? e.score * 20 : 50);
        return sum + s;
      }, 0) / rubric.length)
    : 0;

  // Radar data
  const radarData = rubric.map((e: any) => ({
    subject: e.pillar?.length > 12 ? e.pillar.slice(0, 12) + '…' : (e.pillar || 'Skill'),
    score: typeof e.competencyScore === 'number' ? e.competencyScore : (typeof e.score === 'number' ? e.score * 20 : 50),
  }));

  // Collect interviewer quotes across all rubric items
  const allQuotes: { text: string; pillar: string }[] = [];
  rubric.forEach((e: any) => {
    if (e.evidence?.length) {
      e.evidence.slice(0, 2).forEach((q: string) => allQuotes.push({ text: q, pillar: e.pillar }));
    }
  });

  const getScore = (e: any): number => {
    if (typeof e.competencyScore === 'number') return e.competencyScore;
    if (typeof e.score === 'number') return e.score * 20;
    return 50;
  };

  const statCards = [
    { label: 'Rubric Pillars', value: `${rubric.length}`, icon: BarChart2, color: '#a855f7' },
    { label: 'Avg Score', value: `${overallScore}%`, icon: TrendingUp, color: overallScore >= 70 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#f43f5e' },
    { label: 'Strong Pillars', value: `${rubric.filter((e: any) => getScore(e) >= 70).length}`, icon: CheckCircle, color: '#10b981' },
    { label: 'Weak Pillars', value: `${rubric.filter((e: any) => getScore(e) < 50).length}`, icon: AlertTriangle, color: '#f43f5e' },
    { label: 'Evidence Quotes', value: `${allQuotes.length}`, icon: Quote, color: '#06b6d4' },
    { label: 'AI Signal', value: isNoHire ? 'No Hire' : isStrong ? 'Strong' : 'Lean Hire', icon: Brain, color: isNoHire ? '#f43f5e' : isStrong ? '#10b981' : '#f59e0b' },
  ];

  return (
    <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />

      {/* ── Header */}
      <div className="p-6 sm:p-8 border-b border-white/[0.06]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[10px] text-purple-300 bg-purple-500/10 px-3 py-0.5 rounded-full border border-purple-500/20 mb-2">
              ✦ AI INTERVIEW PANEL EVALUATION REPORT
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Final Candidate Scorecard</h3>
            <p className="text-white/40 text-xs mt-0.5">Objective multi-agent behavioral and technical assessment report</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">Advisory Signal</div>
            <div className={`px-5 py-2.5 rounded-full font-mono font-bold text-sm tracking-wider border ${verdictBg}`}>
              {scorecard.overall_recommendation?.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Human authority banner */}
      <div className="px-6 sm:px-8 pt-6">
        <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
          <span className="text-indigo-400 text-base shrink-0 mt-0.5">ℹ️</span>
          <p className="text-xs text-indigo-200/90 leading-relaxed">
            <strong className="text-indigo-300">Human Decision Authority: </strong>
            This report compiles transcript-grounded candidate evidence and competency scores to support your evaluation. The AI does not auto-select or auto-reject candidates; the hiring committee retains final hiring authority.
          </p>
        </div>
      </div>

      {/* ── Overall Score + Radar */}
      <div className="px-6 sm:px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Score ring + stat cards */}
          <div className="bg-[#030304] border border-white/[0.06] rounded-2xl p-6">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/40 mb-5">Overall Performance</h4>
            <div className="flex items-center gap-6">
              <OverallScoreRing score={overallScore} verdict={scorecard.overall_recommendation || ''} />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Strong pillars</span>
                    <span className="font-mono font-bold text-emerald-400">{rubric.filter((e: any) => getScore(e) >= 70).length}/{rubric.length}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(rubric.filter((e: any) => getScore(e) >= 70).length / Math.max(1, rubric.length)) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Weak pillars</span>
                    <span className="font-mono font-bold text-rose-400">{rubric.filter((e: any) => getScore(e) < 50).length}/{rubric.length}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(rubric.filter((e: any) => getScore(e) < 50).length / Math.max(1, rubric.length)) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Evidence found</span>
                    <span className="font-mono font-bold text-cyan-400">{allQuotes.length} quotes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Radar chart */}
          {radarData.length > 2 && (
            <div className="bg-[#030304] border border-white/[0.06] rounded-2xl p-6">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-cyan-400 mb-2 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Competency Radar
              </h4>
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
        </div>
      </div>

      {/* ── Stat grid */}
      <div className="px-6 sm:px-8 pt-6">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#030304] border border-white/[0.06] rounded-2xl p-3 text-center">
              <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
              <div className="text-base font-bold text-white">{value}</div>
              <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider leading-tight mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Executive Summary */}
      <div className="px-6 sm:px-8 pt-6">
        <h4 className="font-mono text-xs font-bold text-white/40 mb-3 uppercase tracking-widest">Executive Summary</h4>
        <p className="text-white/80 text-xs leading-relaxed bg-[#030304] p-5 rounded-2xl border border-white/[0.08]">
          {scorecard.overall_summary || scorecard.summary}
        </p>
      </div>

      {/* ── Strengths & Weaknesses */}
      <div className="px-6 sm:px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
            <h4 className="font-mono text-xs font-bold text-emerald-300 mb-3 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5" /> Key Strengths & Demonstrated Mastery
            </h4>
            <ul className="space-y-2">
              {scorecard.strengths?.map((s: string, i: number) => (
                <li key={i} className="flex gap-2.5 text-xs text-white/80 leading-relaxed">
                  <span className="text-emerald-400 font-bold shrink-0">✦</span><span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5 bg-rose-950/20 border border-rose-500/20 rounded-2xl">
            <h4 className="font-mono text-xs font-bold text-rose-300 mb-3 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Areas of Concern & Development Needs
            </h4>
            <ul className="space-y-2">
              {scorecard.weaknesses?.map((s: string, i: number) => (
                <li key={i} className="flex gap-2.5 text-xs text-white/80 leading-relaxed">
                  <span className="text-rose-400 font-bold shrink-0">✦</span><span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Competency Rubric Breakdown */}
      <div className="px-6 sm:px-8 pt-6">
        <h4 className="font-mono text-xs font-bold text-white/40 mb-4 uppercase tracking-widest border-b border-white/[0.06] pb-2">
          Competency & Evidence Rubric Breakdown
        </h4>
        <div className="space-y-4">
          {rubric.map((evalItem: any, i: number) => {
            const scoreNum = typeof evalItem.competencyScore === 'number'
              ? evalItem.competencyScore
              : (typeof evalItem.score === 'number' ? evalItem.score * 20 : 50);
            const quality = evalItem.evidenceQuality || (scoreNum >= 75 ? 'STRONG' : scoreNum >= 50 ? 'PARTIAL' : 'NONE');
            const barColor = scoreNum >= 75 ? '#10b981' : scoreNum >= 55 ? '#f59e0b' : '#f43f5e';
            return (
              <div key={i} className="bg-[#030304] rounded-2xl p-5 border border-white/[0.08]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <h5 className="font-bold text-white text-sm">{evalItem.pillar}</h5>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      quality === 'STRONG' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : quality === 'PARTIAL' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {quality} EVIDENCE
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">{scoreNum}/100</span>
                    <div className="w-28 bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(4, scoreNum))}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/60 mb-3 leading-relaxed">{evalItem.feedback}</p>

                {/* Evidence quotes — what interviewers observed */}
                {evalItem.evidence?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                      <Quote className="w-3 h-3" /> Verbatim Transcript Evidence
                    </div>
                    {evalItem.evidence.map((quote: string, qIdx: number) => (
                      <div key={qIdx} className="bg-indigo-950/20 border-l-2 border-indigo-400 pl-3 pr-3 py-2.5 rounded-r-xl text-xs text-white/70 italic leading-relaxed">
                        &ldquo;{quote}&rdquo;
                      </div>
                    ))}
                  </div>
                )}

                {evalItem.missingEvidence?.length > 0 && (
                  <div className="mt-2 text-[11px] text-rose-300/80 font-mono bg-rose-950/20 px-3 py-2 rounded-lg border border-rose-500/20">
                    <strong className="text-rose-300">Missing Evidence: </strong>
                    {Array.isArray(evalItem.missingEvidence) ? evalItem.missingEvidence.join('; ') : evalItem.missingEvidence}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── All Interviewer Quote Roll-up */}
      {allQuotes.length > 0 && (
        <div className="px-6 sm:px-8 pt-6">
          <h4 className="font-mono text-xs font-bold text-white/40 mb-4 uppercase tracking-widest border-b border-white/[0.06] pb-2 flex items-center gap-2">
            <Quote className="w-3.5 h-3.5 text-cyan-400" /> Key Transcript Moments (What the Panel Heard)
          </h4>
          <div className="space-y-3">
            {allQuotes.map((q, i) => (
              <div key={i} className="p-4 bg-cyan-950/15 border border-cyan-500/15 rounded-2xl">
                <div className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1.5">{q.pillar}</div>
                <p className="text-xs text-white/75 italic leading-relaxed">&ldquo;{q.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Final Recommendation block (summary before action buttons) */}
      <div className="px-6 sm:px-8 pt-6 pb-8">
        <div className={`p-5 rounded-2xl border ${
          isNoHire ? 'bg-rose-950/20 border-rose-500/20' : isStrong ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-amber-950/20 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <Star className={`w-4 h-4 ${isNoHire ? 'text-rose-400' : isStrong ? 'text-emerald-400' : 'text-amber-400'}`} />
            <h4 className={`font-mono text-xs font-bold uppercase tracking-wider ${
              isNoHire ? 'text-rose-300' : isStrong ? 'text-emerald-300' : 'text-amber-300'
            }`}>
              AI Panel Advisory — {scorecard.overall_recommendation?.toUpperCase()}
            </h4>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            {isNoHire
              ? 'The multi-agent panel assessed insufficient evidence across key competency pillars. The hiring committee should review the evidence above before making a final determination.'
              : isStrong
              ? 'The multi-agent panel found strong, corroborated evidence across most competency pillars. This candidate is recommended for advancement to the next hiring stage.'
              : 'The multi-agent panel found mixed evidence. The hiring committee should weigh the strengths against the gaps before making a final determination.'}
          </p>
          <p className="text-[10px] font-mono text-white/30 mt-2">
            ⚠️ This is an AI advisory signal only. Final hiring authority rests with the human hiring committee.
          </p>
        </div>
      </div>
    </div>
  );
}
