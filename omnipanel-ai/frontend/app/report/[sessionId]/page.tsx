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
  ShieldAlert, UserCheck, AlertTriangle, FileText, ClipboardList
} from 'lucide-react';
import { getReport } from '@/lib/api';
import type { SessionReport, HireVerdict } from '@/lib/types';

interface EnterpriseReport extends SessionReport {
  ats_score?: number;
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
  architecture: 'Architecture & Design',
  product_sense: 'Product Alignment',
  scalability: 'Scalability',
  clarity: 'Clarity & Delivery',
  ownership: 'STAR Behavioral',
};

const PILLAR_COLORS: Record<string, string> = {
  architecture: '#06B6D4',
  product_sense: '#F59E0B',
  scalability: '#6366F1',
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
        const data = await getReport(sessionId);
        setReport(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch report';
        setError(msg);
        // Fallback simulated report
        setReport({
          session_id: sessionId,
          job_title: 'Lead Software Architect',
          overall_recommendation: 'LEAN HIRE',
          recommendation_reasoning: 'The candidate exhibited deep systems engineering knowledge, especially in caching protocols and sharding boundaries. However, suspicious face count anomalies and gaze deviations require recruiter audit before confirmation.',
          ats_score: 87.0,
          pillar_scores: {
            architecture: { score: 9, summary: 'Highly structured system design logic.', evidence: 'Explained CAP tradeoffs and database replication bounds.' },
            product_sense: { score: 7, summary: 'Good understanding of delivery timelines.', evidence: 'Proposed progressive feature rollouts.' },
            scalability: { score: 8, summary: 'Accurate database indexing estimates.', evidence: 'Calculated latency targets based on SLA constraint.' },
            clarity: { score: 6, summary: 'Moderate clarity. Some pause segments.', evidence: 'Noticeable speech delay during STAR scenarios.' },
            ownership: { score: 6, summary: 'Basic alignment on organizational values.', evidence: 'Described project delivery under crunch time.' }
          },
          strengths: ['Expert systems architecture logic', 'Detailed scalability estimations', 'Clear domain specifications'],
          improvement_areas: ['STAR framework structure', 'Consistent camera positioning'],
          communication_metrics: { avg_response_length_words: 110, buzzword_density_percent: 11.2, avg_vagueness_score: 48 },
          evidence_quotes: [
            { quote: "We can scale the cache layer by sharding the DB keys using consistent hashing.", timestamp: 45, utterance_id: "u1", speaker: "candidate" },
            { quote: "What are the costs of this cache database scaling on our AWS budget?", timestamp: 80, utterance_id: "u2", speaker: "maya" }
          ],
          total_exchanges: 16,
          interview_duration_seconds: 940,
          avg_vagueness_score: 48,
          proctoring: {
            total_alerts: 4,
            is_suspicious: true,
            alerts_log: [
              { timestamp: 120, type: 'Gaze Out-of-Bounds', detail: 'User looked away from screen for > 4s' },
              { timestamp: 310, type: 'No Face Detected', detail: 'Candidate sat away from camera frame' }
            ],
            screen_recorded: true
          },
          hesitation_metrics: {
            total_count: 3,
            avg_duration_ms: 3800,
            log: [
              { timestamp: 140, duration_ms: 4000 }
            ]
          },
          suspected_ai_answers: false,
          recruiter_mom: {
            summary: "ATS resume score matched at 87%. Screening completed, but proctoring gaze tracking flags were triggered 4 times. Highly recommend human review of the screen capture recordings.",
            key_moments: ["Presented scale estimates for caching layers", "Clarified CAP Theorem edge conditions"],
            decision_markers: ["Highly compatible technical skills", "Auditable gaze behaviors detected"]
          },
          candidate_mom: {
            summary: "Good architectural skills and overall design paradigms. Needs work on minimizing response delays and structuring behavioral situations using STAR.",
            action_items: ["Revise mock behavioral situations", "Minimize technical buzzwords during general product summaries"]
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
      <div className="min-h-screen bg-[#040508] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-lg font-bold text-slate-200 mb-1">Compiling Final Report</h2>
          <p className="text-xs text-slate-500">Evaluating ATS parsed profiles, proctor files, and scorecards...</p>
        </div>
      </div>
    );
  }

  if (!report) return null;
  const vc = verdictConfig(report.overall_recommendation);
  const radarData = Object.entries(report.pillar_scores).map(([key, val]) => ({
    subject: PILLAR_LABELS[key] || key,
    score: val.score * 10,
  }));

  const compositeScore = Math.round(
    ((report.ats_score || 0) * 0.3) + 
    ((100 - (report.avg_vagueness_score || 0)) * 0.7)
  );

  return (
    <div className="min-h-screen bg-[#040508] pt-4 pb-16 px-4 md:px-8 text-slate-100 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header Verdict Block */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Interview Summary Report</span>
            <h1 className="text-3xl font-bold text-white tracking-tight mt-1">{report.job_title}</h1>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-2 font-mono">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuration(report.interview_duration_seconds)}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {report.total_exchanges} exchanges</span>
            </div>
            <p className="mt-4 text-slate-400 text-xs leading-relaxed max-w-xl">
              {report.recommendation_reasoning}
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3 flex-shrink-0">
            <div className={`px-5 py-3.5 rounded-xl border font-bold text-lg uppercase tracking-widest ${vc.bg} ${vc.border} ${vc.text}`}>
              {report.overall_recommendation}
            </div>
            {report.suspected_ai_answers && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[9px] font-bold tracking-wider animate-pulse">
                <AlertTriangle className="w-3 h-3" /> SUSPECTED AI RESPONSES
              </span>
            )}
          </div>
        </motion.div>

        {/* Evaluation Metrics Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-center">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-1">ATS Profile Match</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white font-mono">{report.ats_score || 0}%</span>
              <span className="text-xs text-slate-500">parsed cv match</span>
            </div>
          </div>
          <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-center">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-1">Vagueness Index</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white font-mono">{report.avg_vagueness_score || 0}%</span>
              <span className="text-xs text-slate-500">average response vagueness</span>
            </div>
          </div>
          <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-center border-indigo-500/20">
            <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 mb-1">Composite Score</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-indigo-400 font-mono">{compositeScore}%</span>
              <span className="text-xs text-slate-500">ATS (30%) + Oral (70%)</span>
            </div>
          </div>
        </div>

        {/* Proctoring & Security Summary */}
        {report.proctoring && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className={`glass-panel p-5 ${
              report.proctoring.is_suspicious 
                ? 'border-red-500/25 bg-red-500/5' 
                : 'border-slate-800'
            }`}>
              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> Proctoring Status
              </h4>
              <p className="text-2xl font-bold">{report.proctoring.total_alerts} Flagged Events</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {report.proctoring.is_suspicious ? 'Cheating flags exceeded threshold.' : 'No major anomalies flagged.'}
              </p>
            </div>

            <div className="glass-panel p-5">
              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Speech Pauses
              </h4>
              <p className="text-2xl font-bold">{report.hesitation_metrics?.total_count || 0} Pauses</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Avg Pause Duration: {report.hesitation_metrics ? (report.hesitation_metrics.avg_duration_ms / 1000).toFixed(1) : 0}s
              </p>
            </div>

            <div className="glass-panel p-5">
              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Screen Recording
              </h4>
              <p className="text-lg font-bold text-indigo-400 font-mono">SECURED CHUNK FEED</p>
              <p className="text-[10px] text-slate-500 mt-1.5">Segment video saved to recruiter dashboard.</p>
            </div>
          </motion.div>
        )}

        {/* Recruiter & Candidate MoM Minutes of Meeting */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Recruiter View MoM */}
          {report.recruiter_mom && (
            <div className="glass-panel p-6 flex flex-col gap-4 border-indigo-500/20">
              <h3 className="font-bold text-indigo-400 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" /> Recruiter MoM Summary
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed italic">
                "{report.recruiter_mom.summary}"
              </p>
              <div className="border-t border-slate-900 pt-3 space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Interview Moments:</h4>
                <ul className="text-xs text-slate-350 list-disc pl-4 space-y-1">
                  {report.recruiter_mom.key_moments.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-slate-900 pt-3 space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Decision Markers:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {report.recruiter_mom.decision_markers.map((dm, i) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-900 font-mono">
                      {dm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Candidate View MoM */}
          {report.candidate_mom && (
            <div className="glass-panel p-6 flex flex-col gap-4">
              <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                <ClipboardList className="w-4 h-4 text-slate-400" /> Constructive Feedback & MoM
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed italic">
                "{report.candidate_mom.summary}"
              </p>
              <div className="border-t border-slate-900 pt-3 space-y-2 flex-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Targeted Action Items:</h4>
                <ul className="text-xs text-slate-350 list-disc pl-4 space-y-1">
                  {report.candidate_mom.action_items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.div>

        {/* Competency score breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel p-6"
          >
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Competency Blueprint
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 9 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Candidate" dataKey="score" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-panel p-6 flex flex-col gap-4"
          >
            <h3 className="text-sm font-bold text-white">5-Pillar Grading Metrics</h3>
            {Object.entries(report.pillar_scores).map(([key, val]) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">{PILLAR_LABELS[key] || key}</span>
                  <span className="font-bold font-mono" style={{ color: PILLAR_COLORS[key] || '#6366F1' }}>{val.score}/10</span>
                </div>
                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${val.score * 10}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: PILLAR_COLORS[key] || '#6366F1' }}
                  />
                </div>
                {val.evidence && <p className="text-[10px] text-slate-500 italic truncate">"{val.evidence}"</p>}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Proctoring Warning Logs */}
        {report.proctoring && report.proctoring.alerts_log.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel p-6 border-red-500/10 bg-red-500/[0.02]"
          >
            <h3 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Proctoring Log Details
            </h3>
            <div className="space-y-3 font-mono">
              {report.proctoring.alerts_log.map((log, idx) => (
                <div key={idx} className="flex items-start gap-4 text-[10px]">
                  <span className="flex-shrink-0 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-red-400">
                    {Math.round(log.timestamp)}s
                  </span>
                  <div className="flex-1 text-slate-350">
                    <span className="font-bold text-slate-200">{log.type}</span> — <span>{log.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4 pt-4"
        >
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-900 hover:bg-slate-950 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" /> Download Report
          </button>
          <button
            onClick={() => router.push('/setup')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" /> New Interview Session
          </button>
        </motion.div>

      </div>
    </div>
  );
}
