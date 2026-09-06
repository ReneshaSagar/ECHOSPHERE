'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle, AlertTriangle, Shield, ShieldAlert, Quote, TrendingUp, User, Github, Linkedin,
  ExternalLink, Activity, Brain, Star, BarChart2, Clock, MessageSquare, ChevronRight, Eye,
} from 'lucide-react';

interface SuspiciousEvent {
  timestamp: string;
  type: string;
  details: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  score_impact: number;
}

interface ReportData {
  interviewId: string;
  sessionId: string;
  status: string;
  completedAt: string | null;
  applicationId: string | null;
  candidate: { name: string; email: string; linkedinUrl?: string; githubUrl?: string; portfolioUrl?: string } | null;
  job: { id: string; title: string; description: string } | null;
  candidateContext: any;
  resumeText: string | null;
  scorecard: any;
  suspiciousEvents: SuspiciousEvent[];
  proctoringReport: any;
  transcript: { speaker: string; text: string }[];
  interview_rounds: any[];
}

const SEVERITY_CONFIG = {
  HIGH:   { color: 'text-rose-300',  bg: 'bg-rose-950/40',  border: 'border-rose-500/30',  dot: 'bg-rose-400' },
  MEDIUM: { color: 'text-amber-300', bg: 'bg-amber-950/30', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  LOW:    { color: 'text-blue-300',  bg: 'bg-blue-950/30',  border: 'border-blue-500/30',  dot: 'bg-blue-400' },
  INFO:   { color: 'text-white/40',  bg: 'bg-white/[0.02]', border: 'border-white/[0.06]', dot: 'bg-white/20' },
};

function deduplicateEvents(events: SuspiciousEvent[]) {
  const groups: { event: SuspiciousEvent; count: number }[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.event.type === ev.type && last.event.severity === ev.severity) last.count++;
    else groups.push({ event: ev, count: 1 });
  }
  return groups;
}

function getScore(e: any): number {
  if (typeof e.competencyScore === 'number') return e.competencyScore;
  if (typeof e.score === 'number') return e.score * 20;
  return 50;
}

function ScoreRing({ score, color = '#06b6d4', size = 100 }: { score: number; color?: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, score) / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{score}</span>
        <span className="text-[9px] font-mono text-white/40">/100</span>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'interview' | 'candidate'>('interview');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/interviews/${sessionId}/report`);
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        const data = await res.json();
        setReport(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-purple-400 border-t-transparent animate-spin mx-auto" />
        <p className="text-white/50 font-mono text-sm">Loading report…</p>
      </div>
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3 max-w-md p-8">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <p className="text-white font-bold">Report not found</p>
        <p className="text-white/50 text-xs">{error}</p>
        <p className="text-white/30 text-xs font-mono">Session: {sessionId}</p>
        {error?.includes('404') && (
          <p className="text-amber-300/80 text-xs mt-2">The interview may not have completed yet, or the session ID is invalid.</p>
        )}
        <button onClick={() => router.back()} className="mt-4 px-5 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-neutral-200 transition">Go Back</button>
      </div>
    </div>
  );

  const sc = report.scorecard;
  const rubric: any[] = sc?.rubric_evaluations || [];
  const overallScore = sc?.overallScore ?? (rubric.length > 0
    ? Math.round(rubric.reduce((s: number, e: any) => s + getScore(e), 0) / rubric.length) : 0);

  const isStrong = sc?.overall_recommendation?.toLowerCase().includes('strong');
  const isNoHire = sc?.overall_recommendation?.toLowerCase().includes('no hire') || sc?.overall_recommendation?.toLowerCase().includes('no_hire');
  const verdictColor = isNoHire ? '#f43f5e' : isStrong ? '#10b981' : '#f59e0b';
  const verdictBg = isNoHire
    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
    : isStrong
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
    : 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]';

  const radarData = rubric.map((e: any) => ({
    subject: (e.pillar || 'Skill').split(' ').slice(0, 2).join(' '),
    score: getScore(e),
  }));

  const allQuotes: { text: string; pillar: string }[] = [];
  rubric.forEach((e: any) => {
    if (e.evidence?.length) e.evidence.slice(0, 2).forEach((q: string) => allQuotes.push({ text: q, pillar: e.pillar }));
  });

  const suspiciousEvents = report.suspiciousEvents || [];
  const dedupedEvents = deduplicateEvents(suspiciousEvents);
  const highCount = suspiciousEvents.filter(e => e.severity === 'HIGH').length;
  const integrityScore = Math.max(0, 100 - suspiciousEvents.reduce((s, e) => s + Math.abs(e.score_impact || 0), 0));

  const cc = report.candidateContext;

  const tabs = [
    { id: 'interview', label: 'Interview Intelligence', icon: Brain },
    { id: 'candidate', label: 'Candidate Profile', icon: User },
  ] as const;

  return (
    <div className="min-h-screen bg-[#030304]">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* ── Header Dossier Card */}
        <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-5">
              <div>
                <div className="text-[10px] font-mono font-bold text-purple-300 tracking-[0.2em] uppercase mb-1">Final Interview Evaluation</div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Comprehensive Candidate Dossier</h1>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/40 font-mono">
                  {report.job && <span>Target Role: <strong className="text-white/80">{report.job.title}</strong></span>}
                  <span>Session: <strong className="text-white/60">{sessionId?.slice(0, 10)}</strong></span>
                  {report.status && <span>Status: <strong className="text-white/60">{report.status}</strong></span>}
                </div>
              </div>
              {sc && (
                <div className={`px-5 py-2.5 rounded-full font-mono font-bold text-sm tracking-wider border whitespace-nowrap ${verdictBg}`}>
                  {sc.overall_recommendation?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Score stat cards */}
            {sc && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="bg-[#030304] border border-white/[0.06] rounded-2xl p-5">
                  <div className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest mb-1">Overall AI Score</div>
                  <div className="text-3xl font-bold" style={{ color: verdictColor }}>{overallScore}%</div>
                  <div className="text-xs text-white/40 mt-0.5">Across all competency pillars</div>
                </div>
                {rubric.slice(0, 2).map((e: any, i: number) => (
                  <div key={i} className="bg-[#030304] border border-white/[0.06] rounded-2xl p-5">
                    <div className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest mb-1">{e.pillar}</div>
                    <div className="text-3xl font-bold text-cyan-400">{getScore(e)}%</div>
                    <div className="text-xs text-white/40 mt-0.5">{e.evidenceQuality || 'Evaluated'} evidence</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Navigation */}
        <div className="flex gap-2 border-b border-white/[0.06] pb-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`px-5 py-2.5 text-xs font-bold font-mono tracking-widest uppercase rounded-full transition-all flex items-center gap-2 border ${
                activeTab === id
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* ══════════ TAB 1: INTERVIEW INTELLIGENCE ══════════ */}
        {activeTab === 'interview' && (
          <div className="space-y-6">

            {/* No scorecard state */}
            {!sc && (
              <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-10 text-center">
                <Brain className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <p className="text-white font-bold mb-2">Scorecard not generated yet</p>
                <p className="text-white/40 text-xs mb-5">The interview may still be in progress, or the final evaluation hasn't been triggered yet.</p>
                <Link href={`/admin/applications/${report.applicationId}`}
                  className="px-5 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-neutral-200 transition">
                  Go to Admin → Generate Scorecard
                </Link>
              </div>
            )}

            {sc && (
              <>
                {/* Radar + Strengths/Growth */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Evaluation Radar */}
                  {radarData.length > 2 && (
                    <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6">
                      <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.18em] mb-4">Evaluation Radar</div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.07)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Score" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Key Strengths + Growth Areas */}
                  <div className="space-y-4">
                    {sc.strengths?.length > 0 && (
                      <div className="bg-[#0a0a0d] border border-emerald-500/20 rounded-3xl p-5">
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-[0.18em] mb-3">
                          <CheckCircle className="w-3.5 h-3.5" /> Key Verified Strengths
                        </div>
                        <ul className="space-y-2">
                          {sc.strengths.map((s: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-white/80 leading-relaxed">
                              <span className="text-emerald-400 mt-0.5">•</span><span>{s}</span>
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
                              <span className="text-amber-400 mt-0.5">•</span><span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Executive Recruiter MoM */}
                {sc.overall_summary && (
                  <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-purple-400 uppercase tracking-[0.18em] mb-3">
                      <MessageSquare className="w-3.5 h-3.5" /> Executive Recruiter Minutes of Meeting (MoM)
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed mb-4">{sc.overall_summary}</p>
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
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                                quality === 'STRONG' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : quality === 'PARTIAL' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              }`}>{quality}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-bold text-white">{scoreNum}/100</span>
                              <div className="w-28 bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
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

                {/* Proctoring / Anti-Cheating Full Section */}
                <div className="bg-[#0a0a0d] border border-rose-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(244,63,94,0.08)] space-y-6">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-rose-400 uppercase tracking-[0.18em] mb-1">
                        <Shield className="w-3.5 h-3.5" /> OmniPanel AI Proctor
                      </div>
                      <h2 className="text-lg font-bold text-white">Behavioral Integrity Audit</h2>
                      <p className="text-xs text-white/40 mt-0.5">Real-time surveillance report generated during the interview session</p>
                    </div>
                    {/* Integrity score ring */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="relative">
                        <ScoreRing
                          score={integrityScore}
                          color={integrityScore >= 80 ? '#10b981' : integrityScore >= 60 ? '#f59e0b' : '#f43f5e'}
                          size={72}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-white">{integrityScore}</span>
                          <span className="text-[8px] text-white/30 font-mono">/100</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Integrity</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Status', value: 'COMPLETED', color: 'text-emerald-400' },
                      { label: 'High Violations', value: String(highCount), color: highCount > 0 ? 'text-rose-400' : 'text-white/60' },
                      { label: 'Total Events', value: String(suspiciousEvents.length), color: 'text-amber-300' },
                      { label: 'Integrity Score', value: `${integrityScore}/100`, color: integrityScore >= 80 ? 'text-emerald-400' : integrityScore >= 60 ? 'text-amber-400' : 'text-rose-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-4 bg-[#030304] border border-white/[0.06] rounded-2xl text-center">
                        <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-1">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Anti-cheat constraint checklist */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-rose-400" /> Monitoring Constraints Active
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { label: 'Face Presence Detection', desc: 'Continuous webcam monitoring for candidate visibility', active: true },
                        { label: 'Tab Switch Detection', desc: 'Tracks focus loss and window minimization events', active: true },
                        { label: 'Multiple Person Detection', desc: 'Flags additional faces in the camera frame', active: true },
                        { label: 'Camera Obstruction Check', desc: 'Detects covered or blocked camera lens via luminance sampling', active: true },
                        { label: 'Gaze Tracking', desc: 'MediaPipe face landmark gaze direction analysis', active: true },
                        { label: 'Keyboard Activity Monitor', desc: 'Flags heavy typing during an oral interview session', active: true },
                        { label: 'Clipboard Paste Detection', desc: 'Logs any paste events during the session', active: true },
                        { label: 'AI Assistance Suspicion', desc: 'Heuristic scoring for suspiciously polished answers', active: (report as any).suspected_ai_answers ?? false },
                      ].map(({ label, desc, active }) => (
                        <div key={label} className={`flex items-start gap-3 p-3 rounded-xl border ${active ? 'bg-emerald-950/20 border-emerald-500/15' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${active ? 'border-emerald-400 bg-emerald-500/20' : 'border-white/20'}`}>
                            {active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white/90">{label}</div>
                            <div className="text-[11px] text-white/40 mt-0.5">{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Violation Timeline */}
                  <div>
                    <h3 className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Violation Timeline
                    </h3>
                    {dedupedEvents.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-white/60 text-sm">No violations detected — clean session</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dedupedEvents.map(({ event: ev, count }, i) => {
                          const sc2 = SEVERITY_CONFIG[ev.severity] || SEVERITY_CONFIG.INFO;
                          return (
                            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${sc2.bg} ${sc2.border}`}>
                              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sc2.dot}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${sc2.bg} ${sc2.border} ${sc2.color}`}>{ev.severity}</span>
                                  <span className="text-xs font-bold text-white">{ev.type.replace(/_/g, ' ')}</span>
                                  {count > 1 && (
                                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-white/[0.06] border border-white/[0.1] text-white/60 rounded-full">×{count}</span>
                                  )}
                                  {ev.score_impact !== 0 && (
                                    <span className="text-[9px] font-mono text-rose-400 ml-auto shrink-0">{ev.score_impact} pts</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-white/60 mt-0.5">{ev.details}</p>
                                <p className="text-[10px] font-mono text-white/30 mt-0.5" suppressHydrationWarning>{ev.timestamp}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>


                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 justify-between items-center">
                  {report.applicationId && (
                    <Link href={`/admin/applications/${report.applicationId}`}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 rounded-full font-mono text-xs font-bold transition-all">
                      <BarChart2 className="w-4 h-4" /> View in Admin Priority Leaderboard
                    </Link>
                  )}
                  <button onClick={() => router.back()}
                    className="px-6 py-3 bg-white/[0.05] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] rounded-full font-mono text-xs transition-all">
                    Start Another Interview
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ TAB 2: CANDIDATE PROFILE ══════════ */}
        {activeTab === 'candidate' && (
          <div className="space-y-6">
            {/* Identity */}
            <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-white/50" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{report.candidate?.name || 'Candidate'}</h2>
                  {cc?.headline && <p className="text-sm text-cyan-300 mt-0.5">{cc.headline}</p>}
                  <p className="text-xs text-white/40 font-mono mt-1">{report.candidate?.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {report.candidate?.linkedinUrl && (
                      <a href={report.candidate.linkedinUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs hover:bg-blue-500/20 transition-all">
                        <Linkedin className="w-3.5 h-3.5" /> LinkedIn <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                    {report.candidate?.githubUrl && (
                      <a href={report.candidate.githubUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs hover:bg-purple-500/20 transition-all">
                        <Github className="w-3.5 h-3.5" /> GitHub <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-white/40 mb-1">Applied For</div>
                  <div className="font-bold text-white text-sm">{report.job?.title}</div>
                </div>
              </div>
            </div>

            {/* GitHub stats */}
            {cc?.githubContext && (
              <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6">
                <div className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.18em] mb-4 flex items-center gap-2">
                  <Github className="w-3.5 h-3.5" /> GitHub Engineering Profile
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total Commits', value: cc.githubContext.totalCommits ?? 'N/A', color: 'text-cyan-300', border: 'border-cyan-500/20' },
                    { label: 'Past 30 Days', value: cc.githubContext.recentCommits30Days ?? 'N/A', color: 'text-emerald-300', border: 'border-emerald-500/20' },
                    { label: 'Public Repos', value: cc.githubContext.publicReposCount ?? 'N/A', color: 'text-amber-300', border: 'border-amber-500/20' },
                    { label: 'Pinned', value: cc.githubProjects?.filter((p: any) => p.isPinned).length ?? 0, color: 'text-purple-300', border: 'border-purple-500/20' },
                  ].map(({ label, value, color, border }) => (
                    <div key={label} className={`bg-[#030304] border ${border} p-4 rounded-2xl text-center`}>
                      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                      <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                {cc.githubProjects?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cc.githubProjects.map((p: any, i: number) => (
                      <div key={i} className="p-4 bg-[#030304] border border-white/[0.08] hover:border-white/20 transition-all rounded-2xl">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <a href={p.url} target="_blank" rel="noreferrer" className="font-bold text-sm text-cyan-400 hover:underline">{p.name}</a>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-white/50">
                            {p.language && <span className="px-2 py-0.5 bg-white/[0.05] text-white/60 rounded-full border border-white/[0.08]">{p.language}</span>}
                            {p.stars > 0 && <span>⭐ {p.stars}</span>}
                          </div>
                        </div>
                        {p.description && <p className="text-xs text-white/60 leading-relaxed">{p.description}</p>}
                        {p.keyInsights && <p className="text-[11px] text-amber-200/80 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl italic mt-2">💡 {p.keyInsights}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cross-source skills */}
            {cc?.crossSourceContext?.corroboratedSkills?.length > 0 && (
              <div className="bg-[#0a0a0d] border border-purple-500/20 rounded-3xl p-6">
                <div className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-[0.18em] mb-4 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Cross-Source Verified Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {cc.crossSourceContext.corroboratedSkills.map((s: any, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/20 text-purple-200 border border-purple-500/20 rounded-xl text-xs">
                      {s.skill}
                      <span className="font-mono text-[9px] bg-purple-500/20 px-1.5 py-0.5 rounded font-bold text-purple-300">{s.sources?.join('+')}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Resume text */}
            {report.resumeText && (
              <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6">
                <div className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.18em] mb-3">Resume Extraction</div>
                <pre className="bg-[#030304] p-5 rounded-2xl border border-white/[0.06] text-xs font-mono text-white/60 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {report.resumeText}
                </pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
