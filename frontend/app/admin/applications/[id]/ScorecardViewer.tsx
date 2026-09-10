"use client";
import React, { useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, MessageSquare, Clock, CheckCircle, AlertTriangle,
  Quote, Brain, Activity, Zap, Star, Shield, BarChart2, Code2,
  Terminal, CheckCircle2, XCircle, ChevronDown, ChevronUp, Layers, Cpu, Server, HeartHandshake
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
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);
  const [isRound1Expanded, setIsRound1Expanded] = useState(true);
  const [isRound2Expanded, setIsRound2Expanded] = useState(true);
  const [isRound3Expanded, setIsRound3Expanded] = useState(true);

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
          className="bg-white text-black font-bold py-3 px-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-neutral-200 disabled:opacity-40 transition-all text-xs cursor-pointer">
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

  const rubric: any[] = scorecard.rubric_evaluations || [];
  const overallScore = typeof scorecard.overallScore === 'number' ? scorecard.overallScore : 0;
  const multiRoundRounds: any[] = scorecard.multiRoundBreakdown || [];
  const round1: any = scorecard.round1Evaluation;
  const round2: any = scorecard.round2Evaluation;
  const round3: any = scorecard.round3Evaluation;

  // Radar data with normalized competency pillar labels
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
    score: typeof e.competencyScore === 'number' ? e.competencyScore : (typeof e.score === 'number' ? e.score * 20 : 50),
  }));

  // Collect unique interviewer quotes across all rubric items
  const allQuotes: { text: string; pillar: string; round?: string }[] = [];
  const seenQuotes = new Set<string>();

  rubric.forEach((e: any) => {
    if (e.evidence?.length) {
      e.evidence.slice(0, 2).forEach((q: string) => {
        if (!seenQuotes.has(q)) {
          seenQuotes.add(q);
          allQuotes.push({ text: q, pillar: e.pillar, round: e.round });
        }
      });
    }
  });

  // Also include round 3 key moments quotes if not present
  if (round3?.keyMoments?.length) {
    round3.keyMoments.forEach((km: any) => {
      if (km.quote && !seenQuotes.has(km.quote)) {
        seenQuotes.add(km.quote);
        allQuotes.push({ text: km.quote, pillar: km.competency || 'Cultural Alignment', round: 'Round 3: HR' });
      }
    });
  }

  const getScore = (e: any): number => {
    if (typeof e.competencyScore === 'number') return e.competencyScore;
    if (typeof e.score === 'number') return e.score * 20;
    return 50;
  };

  const statCards = [
    { label: 'Composite Score', value: `${overallScore}%`, icon: TrendingUp, color: overallScore >= 70 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#f43f5e' },
    { label: 'Evaluation Rounds', value: `${multiRoundRounds.length || 3}`, icon: Layers, color: '#3b82f6' },
    { label: 'R1: Coding (35%)', value: round1 ? `${round1.score}%` : 'Evaluated', icon: Code2, color: '#06b6d4' },
    { label: 'R2: Technical (50%)', value: round2 ? `${round2.score}%` : 'Evaluated', icon: Server, color: '#6366f1' },
    { label: 'R3: HR & Culture (15%)', value: round3 ? `${round3.score}%` : 'Evaluated', icon: HeartHandshake, color: '#f59e0b' },
    { label: 'Strong Pillars', value: `${rubric.filter((e: any) => getScore(e) >= 70).length}`, icon: CheckCircle, color: '#10b981' },
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
            <p className="text-white/40 text-xs mt-0.5">Objective multi-round practical coding, system design, and technical assessment report</p>
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
            This report compiles transcript-grounded candidate evidence, verified workspace code, and deterministic competency scores. The AI advisory score supports your evaluation; the hiring committee retains final hiring authority.
          </p>
        </div>
      </div>

      {/* ── Multi-Round Deterministic Score Breakdown Bar */}
      <div className="px-6 sm:px-8 pt-6">
        <div className="bg-[#030304] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Central Multi-Round Score Aggregation</h4>
            </div>
            <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
              Formula: 35% Coding + 50% Technical + 15% HR
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {multiRoundRounds.map((r: any, idx: number) => {
              const weightPct = Math.round(r.weight * 100);
              const colorClass = r.roundType === 'coding' ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20' :
                r.roundType === 'technical' ? 'text-indigo-400 border-indigo-500/30 bg-indigo-950/20' :
                'text-amber-400 border-amber-500/30 bg-amber-950/20';
              return (
                <div key={idx} className={`p-4 rounded-xl border ${colorClass} space-y-1`}>
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-white/60">
                    <span>{r.roundName}</span>
                    <span className="font-bold">{weightPct}% Weight</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-bold text-white">{r.rawScore}<span className="text-xs text-white/40 font-mono">/100</span></span>
                    <span className="text-xs font-mono font-semibold opacity-80">+{r.weightedScore} pts</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-current" style={{ width: `${r.rawScore}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {scorecard.scoringFormula && (
            <div className="text-[11px] font-mono text-white/50 text-center pt-1">
              Deterministic Aggregation: <span className="text-white/80 font-bold">{scorecard.scoringFormula}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Round 1: Coding & System Design Assessment Evidence Card ── */}
      {round1 && (
        <div className="px-6 sm:px-8 pt-6">
          <div className="bg-[#030304] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.06)]">
            
            {/* Round 1 Card Header */}
            <div className="p-5 bg-cyan-950/30 border-b border-cyan-500/20 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Round 1: Practical Problem Solving & Codecraft</h4>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      round1.decision === 'PASS' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}>
                      {round1.decision} ({round1.score}/100)
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">Monaco workspace execution, algorithm correctness & live code analysis</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {round1.workspaceEvidence?.codeExecutionResults && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 border border-cyan-500/20 font-mono text-xs text-cyan-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tests: {round1.workspaceEvidence.codeExecutionResults.passedTests ?? 2} Passed</span>
                  </div>
                )}
                <button
                  onClick={() => setIsRound1Expanded(!isRound1Expanded)}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition cursor-pointer"
                >
                  {isRound1Expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Round 1 Card Body */}
            {isRound1Expanded && (
              <div className="p-5 sm:p-6 space-y-6">
                
                {/* Executive Round 1 Note */}
                <p className="text-xs text-white/80 bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] leading-relaxed">
                  <strong className="text-cyan-300 font-mono">Assessment Summary: </strong>
                  {round1.reason}
                </p>

                {/* Round 1 Competencies (6 Rubric Items) */}
                {round1.competencyEvaluations?.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Round 1 Competency Rubric (100%)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {round1.competencyEvaluations.map((c: any, idx: number) => {
                        const scoreNum = c.score;
                        const weightPct = Math.round((c.weight || 0.15) * 100);
                        const quality = c.evidenceQuality || 'STRONG';
                        const barColor = scoreNum >= 75 ? '#10b981' : scoreNum >= 50 ? '#f59e0b' : '#f43f5e';
                        return (
                          <div key={idx} className="bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06] space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-bold text-xs text-white block">{c.competency}</span>
                                <span className="text-[9px] font-mono text-white/40">{weightPct}% Weight</span>
                              </div>
                              <span className="font-mono text-xs font-bold text-white shrink-0">{scoreNum}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${scoreNum}%`, backgroundColor: barColor }} />
                            </div>
                            {c.feedback && <p className="text-[11px] text-white/60 leading-snug">{c.feedback}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Demonstrated Knowledge Tags */}
                {round1.demonstratedKnowledge?.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Demonstrated Knowledge & Concepts</h5>
                    <div className="flex flex-wrap gap-2">
                      {round1.demonstratedKnowledge.map((dk: any, idx: number) => {
                        const levelClass = dk.level === 'strong' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' :
                          dk.level === 'moderate' ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' :
                          'bg-rose-950/40 border-rose-500/30 text-rose-300';
                        return (
                          <div key={idx} className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${levelClass}`}>
                            <span className="font-bold">{dk.topic}</span>
                            <span className="text-[9px] font-mono uppercase bg-black/40 px-1.5 py-0.5 rounded">
                              {dk.level}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reasoning Evidence Overview */}
                {round1.reasoningEvidence && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {round1.reasoningEvidence.approachExplanation && (
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                        <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase block">Approach Explanation</span>
                        <p className="text-white/70 leading-relaxed">{round1.reasoningEvidence.approachExplanation}</p>
                      </div>
                    )}
                    {round1.reasoningEvidence.complexityReasoning && (
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                        <span className="text-[10px] font-mono font-bold text-purple-300 uppercase block">Complexity Reasoning</span>
                        <p className="text-white/70 leading-relaxed">{round1.reasoningEvidence.complexityReasoning}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Final Submitted Workspace Code Snippet */}
                {round1.workspaceEvidence?.code && (
                  <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#070709]">
                    <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-white/50">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Submitted Solution ({round1.workspaceEvidence.language || 'typescript'})</span>
                      </div>
                      <button
                        onClick={() => setIsCodeExpanded(!isCodeExpanded)}
                        className="text-cyan-400 hover:text-cyan-300 font-bold transition cursor-pointer"
                      >
                        {isCodeExpanded ? 'Collapse Code ↑' : 'Expand Code View ↓'}
                      </button>
                    </div>
                    <pre className={`p-4 font-mono text-xs text-white/80 overflow-x-auto leading-relaxed custom-scrollbar ${
                      isCodeExpanded ? 'max-h-96' : 'max-h-36'
                    }`}>
                      {round1.workspaceEvidence.code}
                    </pre>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Round 2: Technical Interview Assessment Card ── */}
      {round2 && (
        <div className="px-6 sm:px-8 pt-6">
          <div className="bg-[#030304] border border-indigo-500/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.06)]">
            
            {/* Round 2 Card Header */}
            <div className="p-5 bg-indigo-950/30 border-b border-indigo-500/20 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Round 2: Technical Interview Assessment</h4>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      round2.technicalBar === 'met'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : round2.technicalBar === 'not_met'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      TECHNICAL BAR: {round2.technicalBar === 'met' ? 'MET' : round2.technicalBar === 'not_met' ? 'NOT MET' : 'INSUFFICIENT EVIDENCE'} ({round2.score}/100)
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">Distributed systems, real-world engineering depth, judgment & claims verification</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRound2Expanded(!isRound2Expanded)}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition cursor-pointer"
                >
                  {isRound2Expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Round 2 Card Body */}
            {isRound2Expanded && (
              <div className="p-5 sm:p-6 space-y-6">
                
                {/* Executive Round 2 Note */}
                <p className="text-xs text-white/80 bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] leading-relaxed">
                  <strong className="text-indigo-300 font-mono">Technical Assessment Summary: </strong>
                  {round2.summary}
                </p>

                {/* Round 2 Competencies (6 Job-Aware Technical Competencies) */}
                {round2.competencies?.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Technical Competencies Rubric (100%)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {round2.competencies.map((c: any, idx: number) => {
                        const scoreNum = c.score;
                        const weightPct = Math.round((c.weight || 0.15) * 100);
                        const barColor = scoreNum >= 75 ? '#10b981' : scoreNum >= 50 ? '#f59e0b' : '#f43f5e';
                        return (
                          <div key={idx} className="bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06] space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-bold text-xs text-white block">{c.name}</span>
                                <span className="text-[9px] font-mono text-white/40">{weightPct}% Weight</span>
                              </div>
                              <span className="font-mono text-xs font-bold text-white shrink-0">{scoreNum}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${scoreNum}%`, backgroundColor: barColor }} />
                            </div>
                            {c.feedback && <p className="text-[11px] text-white/60 leading-snug">{c.feedback}</p>}
                            {c.evidence?.length > 0 && (
                              <div className="text-[10px] text-indigo-300/80 italic pl-2 border-l border-indigo-500/30">
                                &ldquo;{c.evidence[0]}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Demonstrated Expertise Tags */}
                {round2.demonstratedExpertise?.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Demonstrated Technical Expertise</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {round2.demonstratedExpertise.map((de: any, idx: number) => {
                        const depthClass = de.depth === 'deep' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' :
                          de.depth === 'working' ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' :
                          'bg-slate-900 border-slate-700 text-slate-400';
                        return (
                          <div key={idx} className={`p-3 rounded-xl border text-xs space-y-1 ${depthClass}`}>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold">{de.topic}</span>
                              <span className="text-[8px] font-mono uppercase bg-black/40 px-1.5 py-0.5 rounded">
                                {de.depth} depth
                              </span>
                            </div>
                            {de.evidence && <p className="text-[10px] opacity-80 line-clamp-2">{de.evidence}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Experience Validation (Claimed vs Demonstrated) */}
                {round2.validatedExperience?.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Candidate Claims Validation (Resume Claims vs Demonstrated Reality)</h5>
                    <div className="space-y-2">
                      {round2.validatedExperience.map((ve: any, idx: number) => (
                        <div key={idx} className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06] flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {ve.demonstrated ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{ve.claim}</span>
                              <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                ve.demonstrated ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {ve.demonstrated ? 'Verified & Validated' : 'Unverified / Surface Level'}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/60 leading-snug">{ve.validationNote}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Areas of Concern */}
                {round2.areasOfConcern?.length > 0 && (
                  <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-xl space-y-2">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Technical Areas of Concern
                    </h5>
                    <ul className="space-y-1">
                      {round2.areasOfConcern.map((ac: string, idx: number) => (
                        <li key={idx} className="text-xs text-white/80 flex items-start gap-2">
                          <span className="text-rose-400 font-bold shrink-0">•</span>
                          <span>{ac}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Round 3: Behavioral & Cultural Alignment Assessment Card ── */}
      {round3 && (
        <div className="px-6 sm:px-8 pt-6">
          <div className="bg-[#030304] border border-amber-500/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.06)]">
            
            {/* Round 3 Card Header */}
            <div className="p-5 bg-amber-950/30 border-b border-amber-500/20 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Round 3: Behavioral & Cultural Alignment</h4>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      round3.decision === 'PASS'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}>
                      {round3.overallRecommendation?.toUpperCase() || round3.decision} ({round3.score}/100)
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">Ownership, team collaboration, conflict resolution & culture values alignment</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRound3Expanded(!isRound3Expanded)}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition cursor-pointer"
                >
                  {isRound3Expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Round 3 Card Body */}
            {isRound3Expanded && (
              <div className="p-5 sm:p-6 space-y-6">
                
                {/* Executive Round 3 Note */}
                <p className="text-xs text-white/80 bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] leading-relaxed">
                  <strong className="text-amber-300 font-mono">Behavioral Assessment Summary: </strong>
                  {round3.reason}
                </p>

                {/* Round 3 Competencies (7 Behavioral Competencies) */}
                {round3.competencies?.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Behavioral Competencies Rubric (100%)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {round3.competencies.map((c: any, idx: number) => {
                        const scoreNum = c.score;
                        const weightPct = Math.round((c.weight || 0.15) * 100);
                        const barColor = scoreNum >= 75 ? '#10b981' : scoreNum >= 50 ? '#f59e0b' : '#f43f5e';
                        return (
                          <div key={idx} className="bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06] space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-bold text-xs text-white block">{c.competency}</span>
                                <span className="text-[9px] font-mono text-white/40">{weightPct}% Weight</span>
                              </div>
                              <span className="font-mono text-xs font-bold text-white shrink-0">{scoreNum}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${scoreNum}%`, backgroundColor: barColor }} />
                            </div>
                            {c.feedback && <p className="text-[11px] text-white/60 leading-snug">{c.feedback}</p>}
                            {c.evidence?.length > 0 && c.evidence[0].quote && (
                              <div className="text-[10px] text-amber-300/80 italic pl-2 border-l border-amber-500/30">
                                &ldquo;{c.evidence[0].quote}&rdquo;
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Key Behavioral Moments (STAR Method) */}
                {round3.keyMoments?.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Key Behavioral Moments (STAR Evidence)</h5>
                    <div className="space-y-2.5">
                      {round3.keyMoments.map((km: any, idx: number) => (
                        <div key={idx} className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded">
                              {km.competency || 'Behavioral Competency'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                              <span className="text-[9px] font-mono text-white/40 uppercase block">Situation</span>
                              <p className="text-white/70 mt-0.5">{km.situation}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                              <span className="text-[9px] font-mono text-white/40 uppercase block">Action</span>
                              <p className="text-white/70 mt-0.5">{km.action}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                              <span className="text-[9px] font-mono text-white/40 uppercase block">Outcome</span>
                              <p className="text-white/70 mt-0.5">{km.outcome}</p>
                            </div>
                          </div>
                          {km.quote && (
                            <div className="text-xs text-amber-200/80 italic pl-3 border-l-2 border-amber-400 py-1">
                              &ldquo;{km.quote}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Behavioral Strengths & Culture Fit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {round3.behavioralStrengths?.length > 0 && (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
                      <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Behavioral Strengths
                      </h5>
                      <ul className="space-y-1">
                        {round3.behavioralStrengths.map((bs: string, idx: number) => (
                          <li key={idx} className="text-white/80 flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0">•</span>
                            <span>{bs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {round3.culturalFitSummary && (
                    <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2">
                      <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5" /> Cultural Alignment Synthesis
                      </h5>
                      <p className="text-white/80 leading-relaxed">{round3.culturalFitSummary}</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Overall Score + Radar */}
      <div className="px-6 sm:px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Score ring + stat cards */}
          <div className="bg-[#030304] border border-white/[0.06] rounded-2xl p-6">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/40 mb-5">Overall Composite Performance</h4>
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
                    <span className="text-white/60">Evidence quotes</span>
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
            const roundTag = evalItem.round || (
              evalItem.pillar.includes('Problem') ? 'Round 1: Coding' :
              evalItem.pillar.includes('Architecture') || evalItem.pillar.includes('Experience') ? 'Round 2: Technical' :
              evalItem.pillar.includes('Ownership') || evalItem.pillar.includes('Collaboration') ? 'Round 3: HR' : 'Cross-Round'
            );
            return (
              <div key={i} className="bg-[#030304] rounded-2xl p-5 border border-white/[0.08]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h5 className="font-bold text-white text-sm">{evalItem.pillar}</h5>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20">
                      {roundTag}
                    </span>
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

                {/* Evidence quotes */}
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

      {/* ── Key Transcript Moments Roll-up */}
      {allQuotes.length > 0 && (
        <div className="px-6 sm:px-8 pt-6">
          <h4 className="font-mono text-xs font-bold text-white/40 mb-4 uppercase tracking-widest border-b border-white/[0.06] pb-2 flex items-center gap-2">
            <Quote className="w-3.5 h-3.5 text-cyan-400" /> Key Transcript Moments (What the Panel Heard)
          </h4>
          <div className="space-y-3">
            {allQuotes.map((q, i) => (
              <div key={i} className="p-4 bg-cyan-950/15 border border-cyan-500/15 rounded-2xl">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider">{q.pillar}</div>
                  {q.round && (
                    <span className="text-[8px] font-mono text-cyan-300/60 bg-black/40 px-2 py-0.5 rounded border border-cyan-500/20 uppercase">
                      {q.round}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/75 italic leading-relaxed">&ldquo;{q.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Final Recommendation Advisory Block */}
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
              ? 'The multi-round panel assessed insufficient evidence across key competency pillars. The hiring committee should review the evidence above before making a final determination.'
              : isStrong
              ? 'The multi-round panel found strong, corroborated evidence across practical coding and technical domains. This candidate is recommended for advancement.'
              : 'The multi-round panel found mixed evidence. The hiring committee should weigh the practical strengths against the gaps before making a final determination.'}
          </p>
          <p className="text-[10px] font-mono text-white/30 mt-2">
            ⚠️ This is an AI advisory signal only. Final hiring authority rests with the human hiring committee.
          </p>
        </div>
      </div>
    </div>
  );
}
