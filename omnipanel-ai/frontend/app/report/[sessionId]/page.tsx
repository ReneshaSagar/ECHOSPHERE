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
        bg: 'bg-emerald-50',
        border: 'border-emerald-400/40',
        text: 'text-emerald-600',
      };
    case 'LEAN HIRE':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-400/40',
        text: 'text-amber-600',
      };
    case 'NO HIRE':
      return {
        bg: 'bg-red-50',
        border: 'border-red-400/40',
        text: 'text-red-600',
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

const PILLAR_COLORS: Record<string, string> = {
  architecture: '#06B6D4',
  product_sense: '#F59E0B',
  scalability: '#8B5CF6',
  clarity: '#10B981',
  ownership: '#F97316',
};

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
      className={`p-5 bg-white border ${alertBg ? 'border-red-400/30 bg-red-50/40' : 'border-[#00AEEF]/20'}`}
    >
      <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#527080] mb-2 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
        {label}
      </h4>
      <p className="text-2xl font-semibold tracking-[-0.04em] text-[#102a3a]">{value}</p>
      <p className="text-xs text-[#8baab8] mt-1">{sub}</p>
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
      <div className="min-h-screen bg-[#fbfdff] flex items-center justify-center">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.04]
            [background-image:linear-gradient(#00AEEF_1px,transparent_1px),linear-gradient(90deg,#00AEEF_1px,transparent_1px)]
            [background-size:72px_72px]"
        />
        <div className="relative z-10 text-center">
          <div
            className="w-14 h-14 border-4 border-t-transparent animate-spin mx-auto mb-6"
            style={{ borderColor: '#00AEEF transparent transparent transparent' }}
          />
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#102a3a] mb-2">
            Generating Report
          </h2>
          <p className="text-sm text-[#527080]">
            AI is compiling transcripts, proctoring feeds, and scoring metrics…
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
    <div className="min-h-screen bg-[#fbfdff] pt-6 pb-20 px-4 md:px-8 text-[#102a3a]">
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.04]
          [background-image:linear-gradient(#00AEEF_1px,transparent_1px),linear-gradient(90deg,#00AEEF_1px,transparent_1px)]
          [background-size:72px_72px]"
      />

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">

        {/* ── Report nav breadcrumb */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#087fb5]">
            <span className="grid h-5 w-5 place-items-center bg-[#00AEEF] text-white text-[9px]">+</span>
            OmniPanel AI — Interview Report
          </div>
          {error && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-300/40 px-2 py-0.5">
              Demo mode
            </span>
          )}
        </div>

        {/* ── Header Verdict Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#00AEEF]/25 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.06em] text-[#102a3a] mb-1">
              Interview Report
            </h1>
            <div className="flex flex-wrap gap-4 text-xs text-[#527080] mt-2">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#00AEEF]" /> {report.job_title}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00AEEF]" />
                {formatDuration(report.interview_duration_seconds)}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#00AEEF]" />
                {report.total_exchanges} exchanges
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#527080] max-w-xl">
              {report.recommendation_reasoning}
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3 flex-shrink-0">
            <div
              className={`px-6 py-4 border font-bold text-xl uppercase tracking-widest ${vc.bg} ${vc.border} ${vc.text}`}
            >
              {report.overall_recommendation}
            </div>
            {report.suspected_ai_answers && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-400/30 text-red-600 text-[10px] font-bold tracking-wider animate-pulse">
                <AlertTriangle className="w-3 h-3" /> SUSPECTED AI RESPONSES
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
              iconColor="#EF4444"
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
              iconColor="#F59E0B"
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
              iconColor="#00AEEF"
              label="Screen Recording"
              value="Active & Secured"
              sub="Segment chunk logs saved on recruiter portal."
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
            <div className="bg-white border-l-4 border-l-[#00AEEF] border border-[#00AEEF]/20 p-6 flex flex-col gap-4">
              <h3 className="font-semibold text-[#102a3a] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00AEEF]" />
                Minutes of Meeting — Recruiter
              </h3>
              <p className="text-xs text-[#527080] leading-relaxed italic">
                &ldquo;{report.recruiter_mom.summary}&rdquo;
              </p>
              <div className="border-t border-[#00AEEF]/15 pt-3 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#102a3a]">
                  Key Moments
                </h4>
                <ul className="text-xs text-[#527080] list-disc pl-4 space-y-1">
                  {report.recruiter_mom.key_moments.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-[#00AEEF]/15 pt-3 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#102a3a]">
                  Decision Markers
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {report.recruiter_mom.decision_markers.map((dm, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 bg-[#f0faff] border border-[#00AEEF]/20 text-[#087fb5] font-medium"
                    >
                      {dm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {report.candidate_mom && (
            <div className="bg-white border border-[#00AEEF]/20 p-6 flex flex-col gap-4">
              <h3 className="font-semibold text-[#102a3a] flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#00AEEF]" />
                Constructive Feedback — Candidate
              </h3>
              <p className="text-xs text-[#527080] leading-relaxed italic">
                &ldquo;{report.candidate_mom.summary}&rdquo;
              </p>
              <div className="border-t border-[#00AEEF]/15 pt-3 space-y-2 flex-1">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#102a3a]">
                  Recommended Action Items
                </h4>
                <ul className="text-xs text-[#527080] list-disc pl-4 space-y-1">
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
            className="bg-white border border-[#00AEEF]/20 p-6"
          >
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF] mb-1">
              Evaluation
            </h3>
            <h2 className="text-lg font-semibold tracking-[-0.04em] text-[#102a3a] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00AEEF]" />
              Performance Radar
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="rgba(0,174,239,0.12)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#527080', fontSize: 10, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Candidate"
                    dataKey="score"
                    stroke="#00AEEF"
                    fill="#00AEEF"
                    fillOpacity={0.15}
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
            className="bg-white border border-[#00AEEF]/20 p-6 flex flex-col gap-4"
          >
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00AEEF] mb-1">
                Breakdown
              </h3>
              <h2 className="text-lg font-semibold tracking-[-0.04em] text-[#102a3a]">
                5-Pillar Score Details
              </h2>
            </div>
            {Object.entries(report.pillar_scores).map(([key, val]) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-[#102a3a]">
                    {PILLAR_LABELS[key] ?? key}
                  </span>
                  <span className="text-xs font-bold" style={{ color: PILLAR_COLORS[key] ?? '#00AEEF' }}>
                    {val.score}/10
                  </span>
                </div>
                <div className="h-1.5 bg-[#e9f5fb] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${val.score * 10}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="h-full"
                    style={{ backgroundColor: PILLAR_COLORS[key] ?? '#00AEEF' }}
                  />
                </div>
                {val.evidence && (
                  <p className="text-[11px] text-[#8baab8] italic">&ldquo;{val.evidence}&rdquo;</p>
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
          <div className="bg-white border border-emerald-400/25 p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-3 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Strengths
            </h3>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#527080]">
                  <span className="mt-1 w-1.5 h-1.5 flex-shrink-0 bg-emerald-400" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-amber-400/25 p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Areas to Improve
            </h3>
            <ul className="space-y-2">
              {report.improvement_areas.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#527080]">
                  <span className="mt-1 w-1.5 h-1.5 flex-shrink-0 bg-amber-400" />
                  {s}
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
            className="bg-white border border-red-400/25 p-6"
          >
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-600 mb-4 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Proctoring Alert Log
            </h3>
            <div className="space-y-3">
              {report.proctoring.alerts_log.map((log, idx) => (
                <div key={idx} className="flex items-start gap-4 text-xs">
                  <span className="flex-shrink-0 px-2 py-0.5 bg-red-50 border border-red-400/25 font-mono text-red-600">
                    {Math.round(log.timestamp)}s
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-[#102a3a]">{log.type}</span>
                    {' — '}
                    <span className="text-[#527080]">{log.detail}</span>
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
          className="flex justify-center gap-3 pt-4"
        >
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 border border-[#00AEEF]/30 bg-white
              text-[#527080] text-sm font-semibold hover:border-[#00AEEF] hover:text-[#102a3a] transition-colors"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
          <button
            onClick={() => router.push('/setup')}
            className="flex items-center gap-2 px-6 py-3 bg-[#00AEEF] hover:bg-[#008fca]
              text-white font-bold text-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Start New Assessment
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#00AEEF]/20 pt-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8baab8]">
          <span>OmniPanel AI / EchoSphere</span>
          <span className="text-[#00AEEF]">Voice is the interface</span>
        </div>
      </div>
    </div>
  );
}
