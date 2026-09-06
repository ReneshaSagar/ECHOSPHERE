'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import {
  User, FileText, Github, Linkedin, Shield, Brain, Zap,
  CheckCircle, AlertTriangle, ExternalLink,
  Code2, Briefcase, Activity, MessageSquare,
  TrendingUp, Quote, BarChart2
} from 'lucide-react';

interface SuspiciousEvent {
  timestamp: string;
  type: string;
  details: string;
  severity?: string;
  score_impact?: number;
}

interface ApplicationTabViewProps {
  application: any;
  candidate: any;
  candidateContext: any;
  job: any;
  interview: any;
  blueprint: any;
  parsedBlueprint: any;
  hasSuspiciousEvents: boolean;
}

function formatTimeIST(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST';
  } catch { return timestamp; }
}

function deduplicateEvents(events: SuspiciousEvent[]) {
  const groups: { ev: SuspiciousEvent; count: number }[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.ev.type === ev.type && last.ev.severity === ev.severity) {
      last.count++;
    } else {
      groups.push({ ev, count: 1 });
    }
  }
  return groups;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  HIGH: { color: 'text-rose-300', bg: 'bg-rose-950/40', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  MEDIUM: { color: 'text-amber-300', bg: 'bg-amber-950/30', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  LOW: { color: 'text-blue-300', bg: 'bg-blue-950/30', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  INFO: { color: 'text-white/40', bg: 'bg-white/[0.02]', border: 'border-white/[0.06]', dot: 'bg-white/20' },
};

export default function ApplicationTabView({
  application, candidate, candidateContext, job, interview, blueprint, parsedBlueprint, hasSuspiciousEvents
}: ApplicationTabViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'intelligence' | 'session'>('profile');

  const suspiciousEvents: SuspiciousEvent[] = interview?.suspiciousEvents || [];
  const dedupedEvents = deduplicateEvents(suspiciousEvents);
  const highCount = suspiciousEvents.filter((e: SuspiciousEvent) => e.severity === 'HIGH').length;

  const tabs = [
    { id: 'profile', label: 'Candidate Profile', icon: User, color: 'cyan' },
    { id: 'intelligence', label: 'Interview Intelligence', icon: Brain, color: 'purple' },
    ...(interview ? [{ id: 'session', label: 'Live Session', icon: Shield, color: 'rose' }] : []),
  ] as const;

  return (
    <div className="space-y-6">
      {/* Proctoring Banner */}
      {hasSuspiciousEvents && (
        <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 text-rose-300 font-bold text-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            ⚠️ Proctoring Violations Detected During Interview
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full font-mono text-[10px] font-bold">{highCount} HIGH SEVERITY</span>
            <span className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] text-white/50 rounded-full font-mono text-[10px]">{suspiciousEvents.length} total</span>
            <button onClick={() => setActiveTab('session')} className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 rounded-full font-mono text-[10px] font-bold transition-colors">
              View Logs →
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-4 flex-wrap">
        {tabs.map(({ id, label, icon: Icon, color }) => {
          const isActive = activeTab === id;
          const activeClasses = {
            cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          }[color];
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-5 py-2.5 text-xs font-bold font-mono tracking-widest uppercase rounded-full transition-all flex items-center gap-2 border ${
                isActive ? activeClasses : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'session' && hasSuspiciousEvents && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════ TAB 1: Candidate Profile ═══════════ */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Identity Card */}
          <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-white/[0.06]">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="w-7 h-7 text-white/50" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{candidate?.name}</h2>
                  {candidateContext?.headline && (
                    <p className="text-sm text-cyan-300 mt-1">{candidateContext.headline}</p>
                  )}
                  <p className="text-xs text-white/50 font-mono mt-1">{candidate?.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {candidate?.linkedinUrl && (
                      <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-all text-xs font-medium">
                        <Linkedin className="w-3.5 h-3.5" /> LinkedIn <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                    {candidate?.githubUrl && (
                      <a href={candidate.githubUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all text-xs font-medium">
                        <Github className="w-3.5 h-3.5" /> GitHub <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                    {candidate?.portfolioUrl && (
                      <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/70 hover:bg-white/[0.08] transition-all text-xs font-medium">
                        <ExternalLink className="w-3 h-3" /> Portfolio
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl min-w-[200px]">
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1">Applying For</div>
                <div className="font-bold text-white">{job?.title}</div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/[0.06] border border-white/[0.12] text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {application.status}
                </div>
              </div>
            </div>

            {/* LinkedIn narrative */}
            {candidateContext?.linkedin && (
              <div className="mt-6 space-y-4">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-cyan-400 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" /> LinkedIn Profile
                </h3>
                {candidateContext.linkedin.about && (
                  <p className="text-xs text-white/70 bg-[#030304] p-4 rounded-2xl border border-white/[0.06] leading-relaxed">
                    {candidateContext.linkedin.about}
                  </p>
                )}
                {candidateContext.linkedin.careerProgression && (
                  <p className="text-xs text-purple-200/90 bg-purple-950/20 border border-purple-500/20 p-4 rounded-2xl leading-relaxed">
                    {candidateContext.linkedin.careerProgression}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Resume */}
          <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/40 mb-4 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Resume Extraction
            </h3>
            <pre className="bg-[#030304] p-5 rounded-2xl border border-white/[0.06] text-xs font-mono text-white/70 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {application.resumeText || 'No resume text extracted.'}
            </pre>
            {application.relevantExperience && (
              <div className="mt-4 p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl text-xs text-cyan-100/90 leading-relaxed">
                <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">⚡ Relevant Experience Highlight</div>
                {application.relevantExperience}
              </div>
            )}
          </div>

          {/* GitHub */}
          {(candidateContext?.githubContext || candidateContext?.githubProjects) && (
            <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/40 mb-4 flex items-center gap-2">
                <Github className="w-3.5 h-3.5" /> GitHub Engineering Profile
              </h3>
              {candidateContext.githubContext && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Total Commits', value: candidateContext.githubContext.totalCommits ?? 'N/A', color: 'text-cyan-300', border: 'border-cyan-500/20' },
                    { label: 'Past 30 Days', value: candidateContext.githubContext.recentCommits30Days ?? 'N/A', color: 'text-emerald-300', border: 'border-emerald-500/20' },
                    { label: 'Public Repos', value: candidateContext.githubContext.publicReposCount ?? 'N/A', color: 'text-amber-300', border: 'border-amber-500/20' },
                    { label: 'Pinned Projects', value: candidateContext.githubProjects?.filter((p: any) => p.isPinned).length ?? 0, color: 'text-purple-300', border: 'border-purple-500/20' },
                  ].map(({ label, value, color, border }) => (
                    <div key={label} className={`bg-[#030304] border ${border} p-4 rounded-2xl text-center`}>
                      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                      <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-white/40 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              )}
              {candidateContext.githubProjects?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {candidateContext.githubProjects.map((p: any, i: number) => (
                    <div key={i} className="p-4 bg-[#030304] border border-white/[0.08] hover:border-white/20 transition-all rounded-2xl">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <a href={p.url} target="_blank" rel="noreferrer" className="font-bold text-sm text-cyan-400 hover:underline">{p.name}</a>
                          {p.isPinned && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-mono text-[10px] font-bold border border-purple-500/30">📌 Pinned</span>}
                          {p.isRecent && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono text-[10px] border border-emerald-500/30">🕒 Active</span>}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px] text-white/50">
                          {p.candidateCommits > 0 && <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/20">⚡ {p.candidateCommits}</span>}
                          {p.language && <span className="px-2 py-0.5 bg-white/[0.05] text-white/60 rounded-full border border-white/[0.08]">{p.language}</span>}
                          {p.stars > 0 && <span>⭐ {p.stars}</span>}
                        </div>
                      </div>
                      {p.description && <p className="text-xs text-white/60 mb-2 leading-relaxed">{p.description}</p>}
                      {p.keyInsights && (
                        <p className="text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl italic">💡 {p.keyInsights}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cross-Source Correlation */}
          {candidateContext?.crossSourceContext && (
            <div className="bg-[#0a0a0d] rounded-3xl border border-purple-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(168,85,247,0.08)]">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-purple-400 mb-1 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Cross-Source Corroboration
              </h3>
              <p className="text-xs text-white/40 mb-5">Skills & experience verified across Resume + LinkedIn + GitHub</p>
              {candidateContext.crossSourceContext.corroboratedSkills?.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 mb-2">Verified Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {candidateContext.crossSourceContext.corroboratedSkills.map((s: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/20 text-purple-200 border border-purple-500/20 rounded-xl text-xs">
                        {s.skill}
                        <span className="font-mono text-[9px] bg-purple-500/20 px-1.5 py-0.5 rounded font-bold text-purple-300">{s.sources.join('+')}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {candidateContext.crossSourceContext.notableClaims?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 mb-2">Notable Claims to Probe</h4>
                  <ul className="space-y-2">
                    {candidateContext.crossSourceContext.notableClaims.map((c: any, i: number) => (
                      <li key={i} className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-2xl text-xs">
                        <span className="font-semibold text-amber-200">"{c.claim}"</span>
                        <div className="text-[11px] text-amber-300/80 mt-1 font-mono"><strong>Probe: </strong>{c.verificationFocus}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB 2: Interview Intelligence ═══════════ */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {/* ── POST-INTERVIEW SCORECARD ── */}
          {interview?.scorecard ? (() => {
            const sc = interview.scorecard;
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
            const verdictColor = isNoHire ? '#f43f5e' : isStrong ? '#10b981' : '#f59e0b';
            const verdictBg = isNoHire
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
              <div className="space-y-5">
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
                      <div className="text-2xl font-bold" style={{ color: verdictColor }}>{overallScore}</div>
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

                {/* Divider before briefing */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Pre-Interview Agent Briefing</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              </div>
            );
          })() : interview && (
            <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-8 text-center">
              <Brain className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <p className="text-white font-bold text-sm mb-1">Scorecard not yet generated</p>
              <p className="text-white/40 text-xs">The interview is complete — scroll down to generate the AI scorecard.</p>
            </div>
          )}


          {candidateContext?.interviewContext && (
            <div className="bg-[#0a0a0d] rounded-3xl border border-emerald-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400 mb-1 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> JD-Specific Relevance Analysis
              </h3>
              <p className="text-xs text-white/40 mb-5">Targeted for <strong className="text-white">{candidateContext.interviewContext.targetRole}</strong></p>

              {candidateContext.interviewContext.highRelevanceEvidence?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 mb-3">High-Relevance Evidence</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {candidateContext.interviewContext.highRelevanceEvidence.map((ev: any, i: number) => (
                      <div key={i} className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-emerald-200">{ev.topic}</span>
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${ev.relevance === 'HIGH' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'}`}>
                            {ev.relevance}
                          </span>
                        </div>
                        <p className="text-white/70 leading-relaxed">{ev.reason}</p>
                        {ev.evidenceSources?.length > 0 && (
                          <div className="mt-2 text-[10px] font-mono text-white/30">via: {ev.evidenceSources.join(' + ')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidateContext.interviewContext.technicalInterviewHooks?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 mb-3">Technical Interview Hooks</h4>
                  <ul className="space-y-2">
                    {candidateContext.interviewContext.technicalInterviewHooks.map((hook: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 bg-cyan-950/20 p-3.5 rounded-2xl border border-cyan-500/20 text-xs text-white/80">
                        <span className="text-cyan-400 font-bold shrink-0">⚡</span>
                        <span className="leading-relaxed">{hook}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {candidateContext.interviewContext.projectsWorthProbing?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 mb-3">Projects Worth Probing</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {candidateContext.interviewContext.projectsWorthProbing.map((p: any, i: number) => (
                      <div key={i} className="p-4 bg-[#030304] border border-white/[0.08] rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white text-sm">{p.name}</span>
                          <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full font-mono text-[9px] font-bold">{p.relevanceLevel}</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3 leading-relaxed">{p.reasonToProbe}</p>
                        {p.suggestedQuestions?.length > 0 && (
                          <div className="border-t border-white/[0.06] pt-2.5 space-y-1.5">
                            <span className="font-mono text-[9px] font-bold text-white/30 uppercase tracking-wider">Suggested Questions:</span>
                            {p.suggestedQuestions.map((q: string, qi: number) => (
                              <div key={qi} className="text-xs text-white/70 flex items-start gap-1.5">
                                <span className="text-cyan-400 font-bold">›</span><span>{q}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GitHub Interview Hooks */}
          {candidateContext?.githubInterviewHooks?.length > 0 && (
            <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-purple-400 mb-4 flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5" /> GitHub Codecraft Interview Hooks
              </h3>
              <ul className="space-y-2">
                {candidateContext.githubInterviewHooks.map((hook: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 bg-purple-950/20 p-3.5 rounded-2xl border border-purple-500/20 text-xs text-white/80">
                    <span className="text-purple-400 font-bold shrink-0">💻</span>
                    <span className="leading-relaxed">{hook}</span>
                  </li>
                ))}
              </ul>
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
                <p className="text-white/50 text-xs mt-1">System instructions and evaluation rubrics dispatched to Priya & Arjun</p>
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
      )}

      {/* ═══════════ TAB 3: Live Session ═══════════ */}
      {activeTab === 'session' && interview && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Session Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Status', value: interview.status || 'SCHEDULED', color: 'text-white' },
              { label: 'High Violations', value: `${highCount}`, color: highCount > 0 ? 'text-rose-400' : 'text-emerald-400' },
              { label: 'Total Events', value: `${suspiciousEvents.length}`, color: 'text-amber-400' },
              { label: 'Integrity Score', value: `${Math.max(0, 100 - suspiciousEvents.reduce((s: number, e: SuspiciousEvent) => s + Math.abs(e.score_impact || 0), 0))}/100`, color: 'text-cyan-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0a0a0d] border border-white/[0.08] rounded-2xl p-4 text-center">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Dedup Event Log */}
          {dedupedEvents.length > 0 ? (
            <div className="bg-[#0a0a0d] rounded-3xl border border-rose-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-rose-400 mb-5 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Violation Timeline
              </h3>
              <div className="space-y-2.5">
                {dedupedEvents.map(({ ev, count }, i) => {
                  const sc = SEVERITY_CONFIG[ev.severity || 'INFO'] || SEVERITY_CONFIG.INFO;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl border ${sc.bg} ${sc.border}`}>
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.border} ${sc.color}`}>{ev.severity || 'INFO'}</span>
                          <span className="text-xs font-bold text-white">{ev.type.replace(/_/g, ' ')}</span>
                          {count > 1 && (
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-white/[0.06] border border-white/[0.1] text-white/60 rounded-full">×{count}</span>
                          )}
                          {ev.score_impact !== 0 && ev.score_impact !== undefined && (
                            <span className="text-[9px] font-mono text-rose-400 ml-auto">{ev.score_impact} pts</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/60 mt-0.5">{ev.details}</p>
                        <p className="text-[10px] font-mono text-white/30 mt-0.5" suppressHydrationWarning>{formatTimeIST(ev.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-[#0a0a0d] rounded-3xl border border-emerald-500/20 p-10 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-bold">No violations detected</p>
              <p className="text-xs text-white/40 mt-1">Interview session completed with clean behavioral telemetry.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
