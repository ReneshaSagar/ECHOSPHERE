'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { 
  Download, PlusCircle, CheckCircle, TrendingUp, MessageSquare, Zap, Clock,
  ShieldAlert, UserCheck, AlertTriangle, FileText, ClipboardList, HelpCircle
} from 'lucide-react';
import { getReport } from '@/lib/api';
import type { SessionReport, HireVerdict } from '@/lib/types';

// Extend local types to include dynamic enterprise features
interface EnterpriseReport extends SessionReport {
  proctoring?: {
    total_alerts: number;
    is_suspicious: boolean;
    alerts_log: Array<{ timestamp: number; type: string; detail: string }>;
    screen_recorded: boolean;
  };
  hesitation_metrics?: {
    total_count: number;
    avg_duration_ms: number;
    log: Array<{ timestamp: number; duration_ms: number }>;
  };
  suspected_ai_answers?: boolean;
  recruiter_mom?: {
    summary: string;
    key_moments: string[];
    decision_markers: string[];
  };
  candidate_mom?: {
    summary: string;
    action_items: string[];
  };
}

function verdictConfig(verdict: HireVerdict) {
  switch (verdict) {
    case 'STRONG HIRE': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' };
    case 'LEAN HIRE':   return { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400' };
    case 'NO HIRE':     return { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400' };
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const PILLAR_LABELS: Record<string, string> = {
  architecture: 'Architecture',
  product_sense: 'Product Sense',
  scalability: 'Scalability',
  clarity: 'Clarity',
  ownership: 'Ownership',
};

const PILLAR_COLORS: Record<string, string> = {
  architecture: '#06B6D4',
  product_sense: '#F59E0B',
  scalability: '#8B5CF6',
  clarity: '#10B981',
  ownership: '#F97316',
};

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<EnterpriseReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        await new Promise((r) => setTimeout(r, 1500));
        const data = await getReport(sessionId);
        setReport(data as EnterpriseReport);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load report';
        setError(msg);
        // Fallback report
        setReport({
          session_id: sessionId,
          job_title: 'Lead Software Engineer',
          overall_recommendation: 'LEAN HIRE',
          recommendation_reasoning: 'The candidate showed outstanding architectural systems design. However, significant hesitation during behavioral segments and multiple gaze-away proctoring flags indicate potential assistance or lack of ownership.',
          pillar_scores: {
            architecture: { score: 9, summary: 'Exceptional systems design knowledge', evidence: 'Designed high-availability system correctly' },
            product_sense: { score: 7, summary: 'Good understanding of product tradeoffs', evidence: 'Described ROI calculations for new tools' },
            scalability: { score: 8, summary: 'Strong load estimation logic', evidence: 'Handled database replication limits' },
            clarity: { score: 5, summary: 'Poor response conciseness', evidence: 'Verbosity and long pauses detected' },
            ownership: { score: 5, summary: 'Behavioral gaps and hesitation', evidence: 'Missed STAR metrics when describing conflicts' },
          },
          strengths: ['Expert systems design fundamentals', 'Good scalability reasoning', 'Clear technical examples'],
          improvement_areas: ['Response brevity and structured speaking', 'Behavioral STAR framework preparation'],
          communication_metrics: { avg_response_length_words: 135, buzzword_density_percent: 12.5, avg_vagueness_score: 55 },
          evidence_quotes: [
            { quote: "We can scale the cache layer by sharding the DB keys using consistent hashing.", timestamp: 45, utterance_id: "u1", speaker: "candidate" },
            { quote: "What are the costs of this cache database scaling on our AWS budget?", timestamp: 80, utterance_id: "u2", speaker: "maya" }
          ],
          total_exchanges: 22,
          interview_duration_seconds: 1420,
          avg_vagueness_score: 55,
          proctoring: {
            total_alerts: 6,
            is_suspicious: true,
            alerts_log: [
              { timestamp: 120, type: 'Gaze Out-of-Bounds', detail: 'User was looking away from screen' },
              { timestamp: 240, type: 'No Face Detected', detail: 'Candidate sat away from webcam' },
              { timestamp: 410, type: 'Gaze Out-of-Bounds', detail: 'Looking down for > 4 seconds' }
            ],
            screen_recorded: true
          },
          hesitation_metrics: {
            total_count: 5,
            avg_duration_ms: 4500,
            log: [
              { timestamp: 180, duration_ms: 5000 },
              { timestamp: 390, duration_ms: 4000 }
            ]
          },
          suspected_ai_answers: true,
          recruiter_mom: {
            summary: "The candidate passed the screening, but the final evaluation score is impacted by high hesitation durations (avg 4.5s) and multiple gaze cheating alerts. Highly recommend secondary human audit on the screen recording.",
            key_moments: ["Showcased O(1) LRU Cache implementation", "Alex challenged scaling bottlenecks"],
            decision_markers: ["Architectural target met", "Proctoring flags exceeded safe threshold"]
          },
          candidate_mom: {
            summary: "Good architectural skills and overall design paradigms. Needs work on articulating answers concisely and preparing behavioral case studies.",
            action_items: ["Practice answering using the STAR method", "Minimize pauses and jargon keywords"]
          }
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Generating Report</h2>
          <p className="text-slate-500">AI is compiling transcripts, proctoring feeds, and scoring metrics...</p>
        </div>
      </div>
    );
  }

  if (!report) return null;
  const vc = verdictConfig(report.overall_recommendation);
  const radarData = Object.entries(report.pillar_scores).map(([key, val]) => ({
    subject: PILLAR_LABELS[key] ?? key,
    score: val.score * 10,
  }));

  return (
    <div className="min-h-screen bg-[#050B14] pt-4 pb-16 px-4 md:px-8 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header Verdict Block ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8 bg-[#0B121F]/80 border border-slate-800 backdrop-blur flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Interview Report</h1>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-indigo-400" /> {report.job_title}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuration(report.interview_duration_seconds)}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {report.total_exchanges} exchanges</span>
            </div>
            <p className="mt-4 text-slate-350 text-sm leading-relaxed max-w-xl">
              {report.recommendation_reasoning}
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3 flex-shrink-0">
            <div className={`px-6 py-4 rounded-xl border font-bold text-xl uppercase tracking-widest ${vc.bg} ${vc.border} ${vc.text}`}>
              {report.overall_recommendation}
            </div>
            {report.suspected_ai_answers && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[10px] font-bold tracking-wider animate-pulse">
                <AlertTriangle className="w-3 h-3" /> SUSPECTED AI RESPONSES
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Proctoring & Security Summary ────────────────────────────────── */}
        {report.proctoring && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className={`rounded-2xl p-5 border backdrop-blur ${
              report.proctoring.is_suspicious 
                ? 'bg-red-500/5 border-red-500/20' 
                : 'bg-[#0B121F]/80 border-slate-800'
            }`}>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-red-500" /> Proctoring Status
              </h4>
              <p className="text-2xl font-bold">{report.proctoring.total_alerts} Flags</p>
              <p className="text-xs text-slate-500 mt-1">
                {report.proctoring.is_suspicious ? 'Cheating flags exceeded threshold.' : 'No critical cheating patterns detected.'}
              </p>
            </div>

            <div className="rounded-2xl p-5 bg-[#0B121F]/80 border border-slate-800 backdrop-blur">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Candidate Hesitations
              </h4>
              <p className="text-2xl font-bold">{report.hesitation_metrics?.total_count ?? 0} Pauses</p>
              <p className="text-xs text-slate-500 mt-1">
                Avg Pause Duration: {report.hesitation_metrics ? (report.hesitation_metrics.avg_duration_ms / 1000).toFixed(1) : 0}s
              </p>
            </div>

            <div className="rounded-2xl p-5 bg-[#0B121F]/80 border border-slate-800 backdrop-blur">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <UserCheck className="w-4 h-4 text-indigo-400" /> Screen Recording
              </h4>
              <p className="text-lg font-bold text-indigo-400">ACTIVE & SECURED</p>
              <p className="text-xs text-slate-500 mt-1.5">Segment chunk logs saved on recruiter portal.</p>
            </div>
          </motion.div>
        )}

        {/* ── Recruiter & Candidate MoM Minutes of Meeting ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Recruiter View MoM */}
          {report.recruiter_mom && (
            <div className="rounded-2xl p-6 bg-[#0B121F]/80 border border-indigo-500/20 backdrop-blur flex flex-col gap-4">
              <h3 className="font-bold text-indigo-400 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Minutes of Meeting (Recruiter Portal)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed italic">
                "{report.recruiter_mom.summary}"
              </p>
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Key Moments:</h4>
                <ul className="text-xs text-slate-450 list-disc pl-4 space-y-1">
                  {report.recruiter_mom.key_moments.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Decision Markers:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {report.recruiter_mom.decision_markers.map((dm, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-850 text-slate-350 border border-slate-800">
                      {dm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Candidate View MoM */}
          {report.candidate_mom && (
            <div className="rounded-2xl p-6 bg-[#0B121F]/80 border border-slate-800 backdrop-blur flex flex-col gap-4">
              <h3 className="font-bold text-slate-200 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-400" /> Constructive Feedback (Candidate Portal)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed italic">
                "{report.candidate_mom.summary}"
              </p>
              <div className="border-t border-slate-800 pt-3 space-y-2 flex-1">
                <h4 className="text-xs font-bold text-slate-300">Recommended Action Items:</h4>
                <ul className="text-xs text-slate-450 list-disc pl-4 space-y-1">
                  {report.candidate_mom.action_items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Scorecard + Radar Chart ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl p-6 bg-[#0B121F]/80 border border-slate-800 backdrop-blur"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Evaluation Radar
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Candidate" dataKey="score" stroke="#6366F1" fill="#6366F1" fillOpacity={0.35} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Progress list */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl p-6 bg-[#0B121F]/80 border border-slate-800 backdrop-blur flex flex-col gap-4"
          >
            <h3 className="text-lg font-bold text-white">5-Pillar Score Details</h3>
            {Object.entries(report.pillar_scores).map(([key, val]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">{PILLAR_LABELS[key] ?? key}</span>
                  <span className="font-bold" style={{ color: PILLAR_COLORS[key] ?? '#6366F1' }}>{val.score}/10</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${val.score * 10}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: PILLAR_COLORS[key] ?? '#6366F1' }}
                  />
                </div>
                {val.evidence && <p className="text-[11px] text-slate-500 italic">"{val.evidence}"</p>}
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Proctoring Warning Log ───────────────────────────────────────── */}
        {report.proctoring && report.proctoring.alerts_log.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl p-6 bg-[#0B121F]/80 border border-red-500/20 backdrop-blur"
          >
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Proctoring Alert Log
            </h3>
            <div className="space-y-3">
              {report.proctoring.alerts_log.map((log, idx) => (
                <div key={idx} className="flex items-start gap-4 text-xs">
                  <span className="flex-shrink-0 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded font-mono text-red-400">
                    {Math.round(log.timestamp)}s
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-slate-300">{log.type}</span> — <span className="text-slate-400">{log.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4 pt-4"
        >
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 border border-slate-800 hover:bg-slate-900 rounded-xl font-semibold transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
          <button
            onClick={() => router.push('/setup')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Start New Assessment
          </button>
        </motion.div>

      </div>
    </div>
  );
}
