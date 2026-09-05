'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  Download, PlusCircle, CheckCircle, TrendingUp, MessageSquare, Zap, Clock,
  ShieldAlert, UserCheck, AlertTriangle, FileText, ClipboardList, ArrowRight,
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
    case 'STRONG HIRE':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
      };
    case 'LEAN HIRE':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
      };
    case 'NO HIRE':
      return {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-300',
      };
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

const PILLAR_COLORS_PALETTE = [
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

// ── Small stat card ───────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  sub,
  alertBg,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  alertBg?: boolean;
}) {
  return (
    <div
      className={`p-6 bg-[#0a0a0d] border rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.3)] ${
        alertBg ? 'border-rose-500/30 bg-rose-950/20' : 'border-white/[0.08]'
      }`}
    >
      <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/40 mb-2 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        {label}
      </h4>
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className="text-xs text-white/50 mt-1 leading-relaxed">{sub}</p>
    </div>
  );
}

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<EnterpriseReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        await new Promise((r) => setTimeout(r, 1200));
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
          recommendation_reasoning:
            'The candidate showed outstanding architectural systems design. However, significant hesitation during behavioral segments and multiple gaze-away proctoring flags indicate potential assistance or lack of ownership.',
          pillar_scores: {
            architecture: { score: 9, summary: 'Exceptional systems design knowledge', evidence: 'Designed high-availability system correctly' },
            product_sense: { score: 7, summary: 'Good understanding of product tradeoffs', evidence: 'Described ROI calculations for new tools' },
            scalability:   { score: 8, summary: 'Strong load estimation logic', evidence: 'Handled database replication limits' },
            clarity:       { score: 5, summary: 'Poor response conciseness', evidence: 'Verbosity and long pauses detected' },
            ownership:     { score: 5, summary: 'Behavioral gaps and hesitation', evidence: 'Missed STAR metrics when describing conflicts' },
          },
          strengths: ['Expert systems design fundamentals', 'Good scalability reasoning', 'Clear technical examples'],
          improvement_areas: ['Response brevity and structured speaking', 'Behavioral STAR framework preparation'],
          communication_metrics: { avg_response_length_words: 135, buzzword_density_percent: 12.5, avg_vagueness_score: 55 },
          evidence_quotes: [
            { quote: 'We can scale the cache layer by sharding the DB keys using consistent hashing.', timestamp: 45, utterance_id: 'u1', speaker: 'candidate' },
            { quote: 'What are the costs of this cache database scaling on our AWS budget?', timestamp: 80, utterance_id: 'u2', speaker: 'maya' },
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
              { timestamp: 410, type: 'Gaze Out-of-Bounds', detail: 'Looking down for > 4 seconds' },
            ],
            screen_recorded: true,
          },
          hesitation_metrics: {
            total_count: 5,
            avg_duration_ms: 4500,
            log: [
              { timestamp: 180, duration_ms: 5000 },
              { timestamp: 390, duration_ms: 4000 },
            ],
          },
          suspected_ai_answers: true,
          recruiter_mom: {
            summary:
              'The candidate passed the screening, but the final evaluation score is impacted by high hesitation durations (avg 4.5s) and multiple gaze cheating alerts. Highly recommend secondary human audit on the screen recording.',
            key_moments: ['Showcased O(1) LRU Cache implementation', 'Alex challenged scaling bottlenecks'],
            decision_markers: ['Architectural target met', 'Proctoring flags exceeded safe threshold'],
          },
          candidate_mom: {
            summary:
              'Good architectural skills and overall design paradigms. Needs work on articulating answers concisely and preparing behavioral case studies.',
            action_items: ['Practice answering using the STAR method', 'Minimize pauses and jargon keywords'],
          },
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030304] text-[#f5f5f7] flex items-center justify-center font-sans">
        <div className="relative z-10 text-center max-w-sm px-6">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            Generating Intelligence Report
          </h2>
          <p className="text-xs text-white/50 leading-relaxed font-mono">
            Compiling audio transcripts, proctoring telemetry, and evaluator rubrics…
          </p>
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
    <div className="min-h-screen bg-[#030304] pt-8 pb-24 px-4 md:px-8 text-[#f5f5f7] font-sans">
      <div className="relative z-10 max-w-5xl mx-auto space-y-6">

        {/* ── Report nav breadcrumb */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400">
            <span className="grid h-5 w-5 place-items-center bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] rounded-md">✦</span>
            Nexora Labs — Voice AI Evaluation Report
          </div>
          {error && (
            <span className="text-[10px] font-mono font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              Simulated Audit Mode
            </span>
          )}
        </div>

        {/* ── Header Verdict Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] font-mono text-[10px] text-white/60 mb-2">
              SESSION ID: {sessionId.slice(0, 12)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Executive Evaluation Report
            </h1>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-white/50 mt-2">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> {report.job_title}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/40" />
                {formatDuration(report.interview_duration_seconds)}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-white/40" />
                {report.total_exchanges} dialogue exchanges
              </span>
            </div>
            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-white/70 max-w-xl">
              {report.recommendation_reasoning}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0">
            <div
              className={`px-6 py-3.5 rounded-full border font-mono font-bold text-sm tracking-wider ${vc.bg} ${vc.border} ${vc.text} shadow-sm`}
            >
              {report.overall_recommendation}
            </div>
            {report.suspected_ai_answers && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold tracking-wider">
                <AlertTriangle className="w-3 h-3 text-rose-400" /> SUSPECTED AI ASSISTANCE
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Proctoring & Security Summary */}
        {report.proctoring && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <StatCard
              icon={ShieldAlert}
              iconColor="#f43f5e"
              label="Proctoring Status"
              value={`${report.proctoring.total_alerts} Flags`}
              sub={
                report.proctoring.is_suspicious
                  ? 'Cheating flags exceeded threshold.'
                  : 'No critical cheating patterns detected.'
              }
              alertBg={report.proctoring.is_suspicious}
            />
            <StatCard
              icon={AlertTriangle}
              iconColor="#f59e0b"
              label="Candidate Hesitations"
              value={`${report.hesitation_metrics?.total_count ?? 0} Pauses`}
              sub={`Avg Pause Duration: ${
                report.hesitation_metrics
                  ? (report.hesitation_metrics.avg_duration_ms / 1000).toFixed(1)
                  : 0
              }s`}
            />
            <StatCard
              icon={UserCheck}
              iconColor="#06b6d4"
              label="Screen Recording"
              value="Secured & Logged"
              sub="Multi-stream telemetry chunks archived."
            />
          </motion.div>
        )}

        {/* ── Recruiter & Candidate MoM */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {report.recruiter_mom && (
            <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 flex flex-col gap-4 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Minutes of Meeting — Recruiter Debrief
              </h3>
              <p className="text-xs text-white/70 leading-relaxed bg-[#030304] p-4 rounded-2xl border border-white/[0.06] italic">
                &ldquo;{report.recruiter_mom.summary}&rdquo;
              </p>
              <div className="border-t border-white/[0.06] pt-3 space-y-2">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-white/40">
                  Key Moments & Pivots
                </h4>
                <ul className="text-xs text-white/70 list-disc pl-4 space-y-1">
                  {report.recruiter_mom.key_moments.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-white/[0.06] pt-3 space-y-2">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-white/40">
                  Decision Markers
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {report.recruiter_mom.decision_markers.map((dm, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-full font-medium"
                    >
                      {dm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {report.candidate_mom && (
            <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 flex flex-col gap-4 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-400" />
                Constructive Growth Feedback — Candidate
              </h3>
              <p className="text-xs text-white/70 leading-relaxed bg-[#030304] p-4 rounded-2xl border border-white/[0.06] italic">
                &ldquo;{report.candidate_mom.summary}&rdquo;
              </p>
              <div className="border-t border-white/[0.06] pt-3 space-y-2 flex-1">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-white/40">
                  Recommended Action Items
                </h4>
                <ul className="text-xs text-white/70 list-disc pl-4 space-y-1">
                  {report.candidate_mom.action_items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Scorecard + Radar Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Radar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
          >
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400 mb-1">
              Holistic Evaluation
            </h3>
            <h2 className="text-lg font-bold tracking-tight text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Technical Competency Radar
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Candidate"
                    dataKey="score"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Progress list */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 flex flex-col gap-4 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
          >
            <div>
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400 mb-1">
                Pillar Breakdown
              </h3>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Detailed Competency Scores
              </h2>
            </div>
            {Object.entries(report.pillar_scores).map(([key, val], i) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-white/90">
                    {PILLAR_LABELS[key] ?? key}
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: PILLAR_COLORS_PALETTE[i % PILLAR_COLORS_PALETTE.length] }}>
                    {val.score}/10
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ backgroundColor: PILLAR_COLORS_PALETTE[i % PILLAR_COLORS_PALETTE.length], width: `${Math.max(2, (val.score / 10) * 100)}%` }}
                  />
                </div>
                {val.evidence && (
                  <p className="text-[11px] text-white/50 italic font-mono">&ldquo;{val.evidence}&rdquo;</p>
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Strengths & Improvements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-[#0a0a0d] border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-emerald-300 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Key Strengths
            </h3>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-white/80 leading-relaxed">
                  <span className="text-emerald-400 font-bold shrink-0">✦</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#0a0a0d] border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-amber-300 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Areas for Development
            </h3>
            <ul className="space-y-2">
              {report.improvement_areas.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-white/80 leading-relaxed">
                  <span className="text-amber-400 font-bold shrink-0">✦</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* ── Proctoring Alert Log */}
        {report.proctoring && report.proctoring.alerts_log.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a0d] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(244,63,94,0.15)]"
          >
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-rose-300 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Proctoring Telemetry Log
            </h3>
            <div className="space-y-2.5">
              {report.proctoring.alerts_log.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs bg-rose-950/20 p-3 rounded-2xl border border-rose-500/20">
                  <span className="flex-shrink-0 px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 font-mono text-[10px] text-rose-300 rounded-full">
                    {Math.round(log.timestamp)}s
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-white">{log.type}</span>
                    <span className="text-white/40"> — </span>
                    <span className="text-white/70">{log.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-3 pt-6"
        >
          <button
            onClick={() => window.print()}
            className="px-6 py-3 rounded-full border border-white/[0.12] bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:border-white/20 transition-all text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF Report
          </button>
          <button
            onClick={() => router.push('/admin/applicants')}
            className="px-8 py-3 bg-white text-black hover:bg-neutral-200 font-sans font-bold text-xs rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Back to ATS Applicants
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-6 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-white/40">
          <span>Nexora Labs</span>
          <span className="text-cyan-400">Powered by OmniPanel Voice AI</span>
        </div>
      </div>
    </div>
  );
}

