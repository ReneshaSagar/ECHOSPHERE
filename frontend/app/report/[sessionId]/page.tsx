'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, FileCheck,
  User, Github, Linkedin, ExternalLink, Activity, Brain, BarChart2, Clock,
  Eye, Cpu, ArrowRight, Home, Terminal
} from 'lucide-react';
import ScorecardDisplay from '@/components/ScorecardDisplay';

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

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'interview' | 'candidate'>('interview');
  const [showProctorLogs, setShowProctorLogs] = useState(false);

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
    <div className="min-h-screen bg-[#030304] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-purple-400 border-t-transparent animate-spin mx-auto" />
        <p className="text-white/50 font-mono text-sm">Loading session dossier…</p>
      </div>
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen bg-[#030304] flex items-center justify-center p-4">
      <div className="text-center space-y-3 max-w-md p-8 bg-[#0a0a0d] border border-white/[0.08] rounded-3xl shadow-2xl">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <p className="text-white font-bold text-lg">Report not found</p>
        <p className="text-white/50 text-xs leading-relaxed">{error}</p>
        <p className="text-white/30 text-xs font-mono">Session ID: {sessionId}</p>
        {error?.includes('404') && (
          <p className="text-amber-300/80 text-xs mt-2">The interview may not have completed yet, or the session ID is invalid.</p>
        )}
        <div className="pt-2">
          <button onClick={() => router.back()} className="px-6 py-2.5 bg-white text-black font-bold text-xs rounded-full hover:bg-neutral-200 transition cursor-pointer">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );

  const sc = report.scorecard;
  const suspiciousEvents = report.suspiciousEvents || [];
  const dedupedEvents = deduplicateEvents(suspiciousEvents);
  const highCount = suspiciousEvents.filter(e => e.severity === 'HIGH').length;
  const integrityScore = Math.max(0, 100 - suspiciousEvents.reduce((s, e) => s + Math.abs(e.score_impact || 0), 0));
  const hasViolations = suspiciousEvents.length > 0;

  const completedAt = report.completedAt
    ? new Date(report.completedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Live Session Recorded';

  const cc = report.candidateContext;

  const tabs = [
    { id: 'interview', label: 'Interview Evaluation', icon: Brain },
    { id: 'candidate', label: 'Candidate Profile', icon: User },
  ] as const;

  return (
    <div className="min-h-screen bg-[#030304] text-[#f5f5f7] font-sans flex flex-col pt-10 pb-20 px-4 sm:px-6">
      {/* Brand Nav & Action Toolbar */}
      <div className="max-w-4xl mx-auto w-full mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/25 to-pink-500/25 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            O
          </div>
          <div>
            <div className="font-sans font-bold text-white text-base tracking-tight flex items-center gap-2">
              <span>OMNIPANEL</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                LIVE SESSION REPORT
              </span>
            </div>
            <div className="text-xs font-mono text-white/40">Plantra Labs · Autonomous Evaluation Debrief</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {report.applicationId && (
            <Link
              href={`/admin/applications/${report.applicationId}`}
              className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-sans font-semibold text-xs transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] group"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Admin Application Review</span>
            </Link>
          )}
          <Link
            href="/jobs"
            className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/80 hover:text-white font-sans text-xs border border-white/[0.1] transition flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Jobs</span>
          </Link>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        {/* Session Info Banner */}
        <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE SESSION RECORDED
                </span>
                <span className="text-xs font-mono text-white/40">
                  {completedAt}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight">
                Evaluation Report: {report.candidate?.name || 'Candidate'}
              </h1>
              <p className="text-white/60 text-sm mt-1">
                Target Role: <strong className="text-white">{report.job?.title || 'Target Position'}</strong> at <strong>Plantra Labs</strong>
              </p>
            </div>

            <div className="p-3 bg-[#030304] border border-white/[0.06] rounded-2xl text-right shrink-0">
              <div className="text-[10px] font-mono text-white/40 uppercase">Session Record</div>
              <div className="text-xs font-mono font-bold text-purple-300">/report/{report.sessionId?.slice(0, 12)}</div>
              <div className="text-[9px] font-mono text-white/30 mt-0.5">Status: {report.status || 'COMPLETED'}</div>
            </div>
          </div>

          {/* Telemetry Receipt Box */}
          <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <FileCheck className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <div className="text-[10px] font-mono text-white/40">Dialogue Log</div>
              <div className="text-xs font-sans font-bold text-white mt-0.5">{report.transcript?.length || 0} Utterances</div>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-[10px] font-mono text-white/40">Proctor Integrity</div>
              <div className="text-xs font-sans font-bold text-white mt-0.5">
                {hasViolations ? `${suspiciousEvents.length} Flags (${integrityScore}% Score)` : 'Verified / Clear'}
              </div>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <Cpu className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <div className="text-[10px] font-mono text-white/40">Multi-Agent Panel</div>
              <div className="text-xs font-sans font-bold text-white mt-0.5">3 Specialized Agents</div>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-[10px] font-mono text-white/40">Rounds Assessed</div>
              <div className="text-xs font-sans font-bold text-white mt-0.5">Coding • Tech • HR</div>
            </div>
          </div>
        </div>

        {/* ── Exact Proctoring Violation Banner Component (Matches uploaded design) */}
        <div className="space-y-4">
          <div className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
            hasViolations
              ? 'bg-[#180509] border-rose-900/60 shadow-[0_0_30px_rgba(244,63,94,0.12)]'
              : 'bg-[#051811] border-emerald-900/60 shadow-[0_0_30px_rgba(16,185,129,0.12)]'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${
                hasViolations ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]'
              }`} />
              {hasViolations ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className={`font-bold text-sm sm:text-base tracking-tight ${
                hasViolations ? 'text-rose-200' : 'text-emerald-200'
              }`}>
                {hasViolations
                  ? 'Proctoring Violations Detected During Interview'
                  : 'Proctor Integrity Verified (Clean Session)'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                hasViolations
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                  : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              }`}>
                {highCount} HIGH SEVERITY
              </span>
              <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-white/60">
                {suspiciousEvents.length} total
              </span>
              <button
                type="button"
                onClick={() => setShowProctorLogs(!showProctorLogs)}
                className="px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.2] text-white text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>{showProctorLogs ? 'Hide Logs ↑' : 'View Logs →'}</span>
              </button>
            </div>
          </div>

          {/* ── Collapsible Proctoring Logs Drawer (ONLY visible when clicking View Logs) */}
          {showProctorLogs && (
            <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              
              {/* Quick Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Integrity Score', value: `${integrityScore}/100`, color: integrityScore >= 80 ? 'text-emerald-400' : integrityScore >= 60 ? 'text-amber-400' : 'text-rose-400' },
                  { label: 'High Violations', value: String(highCount), color: highCount > 0 ? 'text-rose-400' : 'text-white/60' },
                  { label: 'Total Events', value: String(suspiciousEvents.length), color: 'text-amber-300' },
                  { label: 'Surveillance Status', value: 'AUDITED', color: 'text-purple-300' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 bg-[#030304] border border-white/[0.06] rounded-2xl text-center">
                    <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* Active Monitoring Constraints */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-rose-400" /> Active Surveillance Constraints
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
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Granular Telemetry & Event Timeline
                </h3>
                {dedupedEvents.length === 0 ? (
                  <div className="text-center py-6 bg-[#030304] rounded-2xl border border-white/[0.06]">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                    <p className="text-white/70 text-xs font-sans font-medium">No violations detected — completely clean session</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
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
                            <p className="text-[11px] text-white/70 mt-1 leading-relaxed">{ev.details}</p>
                            <p className="text-[10px] font-mono text-white/30 mt-0.5" suppressHydrationWarning>{ev.timestamp}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── Tab Navigation */}
        <div className="flex gap-2 border-b border-white/[0.06] pb-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-5 py-2.5 text-xs font-bold font-mono tracking-widest uppercase rounded-full transition-all flex items-center gap-2 border cursor-pointer ${
                activeTab === id
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab 1: Interview Evaluation (Scorecard) */}
        {activeTab === 'interview' && (
          <div className="space-y-6">
            {sc ? (
              <ScorecardDisplay scorecard={sc} />
            ) : (
              <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-10 text-center space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Brain className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white">Scorecard Synthesis In Progress</h2>
                <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed">
                  The multi-agent evaluation dossier for this session is being processed or can be generated from the admin review console.
                </p>
                {report.applicationId && (
                  <div className="pt-2">
                    <Link
                      href={`/admin/applications/${report.applicationId}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] transition"
                    >
                      <span>Generate in Admin Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Candidate Profile */}
        {activeTab === 'candidate' && (
          <div className="space-y-6">
            {/* Identity Card */}
            <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shrink-0 text-white/50">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{report.candidate?.name || 'Candidate'}</h2>
                  {cc?.headline && <p className="text-sm text-cyan-300 mt-0.5">{cc.headline}</p>}
                  <p className="text-xs text-white/40 font-mono mt-1">{report.candidate?.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {report.candidate?.linkedinUrl && (
                      <a
                        href={report.candidate.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs hover:bg-blue-500/20 transition-all"
                      >
                        <Linkedin className="w-3.5 h-3.5" /> <span>LinkedIn</span> <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                    {report.candidate?.githubUrl && (
                      <a
                        href={report.candidate.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs hover:bg-purple-500/20 transition-all"
                      >
                        <Github className="w-3.5 h-3.5" /> <span>GitHub</span> <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-[10px] font-mono text-white/40 mb-1 uppercase tracking-wider">Target Position</div>
                  <div className="font-bold text-white text-sm">{report.job?.title}</div>
                </div>
              </div>
            </div>

            {/* GitHub Engineering Profile */}
            {cc?.githubContext && (
              <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8">
                <div className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.18em] mb-4 flex items-center gap-2">
                  <Github className="w-3.5 h-3.5 text-purple-400" /> GitHub Engineering Profile
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total Commits', value: cc.githubContext.totalCommits ?? 'N/A', color: 'text-cyan-300', border: 'border-cyan-500/20' },
                    { label: 'Past 30 Days', value: cc.githubContext.recentCommits30Days ?? 'N/A', color: 'text-emerald-300', border: 'border-emerald-500/20' },
                    { label: 'Public Repos', value: cc.githubContext.publicReposCount ?? 'N/A', color: 'text-amber-300', border: 'border-amber-500/20' },
                    { label: 'Pinned Projects', value: cc.githubProjects?.filter((p: any) => p.isPinned).length ?? 0, color: 'text-purple-300', border: 'border-purple-500/20' },
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

            {/* Cross-source Skills */}
            {cc?.crossSourceContext?.corroboratedSkills?.length > 0 && (
              <div className="bg-[#0a0a0d] border border-purple-500/20 rounded-3xl p-6 sm:p-8">
                <div className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-[0.18em] mb-4 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Cross-Source Verified Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {cc.crossSourceContext.corroboratedSkills.map((s: any, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/20 text-purple-200 border border-purple-500/20 rounded-xl text-xs font-medium">
                      {s.skill}
                      <span className="font-mono text-[9px] bg-purple-500/20 px-1.5 py-0.5 rounded font-bold text-purple-300">{s.sources?.join('+')}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Resume Text Extraction */}
            {report.resumeText && (
              <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8">
                <div className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-[0.18em] mb-3">Resume Extraction</div>
                <pre className="bg-[#030304] p-5 rounded-2xl border border-white/[0.06] text-xs font-mono text-white/60 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto custom-scrollbar">
                  {report.resumeText}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Footer info box */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono text-white/40">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>OmniPanel Autonomous Interview Engine</span>
          </div>
          <div className="text-right">
            <span>Session ID: <strong className="text-white/70">{report.sessionId || sessionId}</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
}
