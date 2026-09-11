'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  FileCheck, 
  Clock, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Terminal, 
  ExternalLink 
} from 'lucide-react';
import ScorecardDisplay from '@/components/ScorecardDisplay';

interface SuspiciousEvent {
  timestamp: string;
  type: string;
  details: string;
  severity?: string;
  score_impact?: number;
}

function formatTimeIST(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST';
  } catch { return timestamp; }
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  HIGH: { color: 'text-rose-300', bg: 'bg-rose-950/40', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  MEDIUM: { color: 'text-amber-300', bg: 'bg-amber-950/30', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  LOW: { color: 'text-blue-300', bg: 'bg-blue-950/30', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  INFO: { color: 'text-white/40', bg: 'bg-white/[0.02]', border: 'border-white/[0.06]', dot: 'bg-white/20' },
};

interface LiveSessionTabProps {
  interview: any;
  candidate?: any;
  job?: any;
  suspiciousEvents: SuspiciousEvent[];
  dedupedEvents: { ev: SuspiciousEvent; count: number }[];
  highCount: number;
}

export default function LiveSessionTab({ 
  interview, 
  candidate, 
  job, 
  suspiciousEvents = [], 
  dedupedEvents = [], 
  highCount = 0 
}: LiveSessionTabProps) {
  const [showProctorLogs, setShowProctorLogs] = useState(false);
  const [scorecard, setScorecard] = useState<any>(interview?.scorecard || null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  if (!interview) {
    return (
      <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-10 text-center text-white/50 font-mono text-xs">
        No interview session found for this candidate.
      </div>
    );
  }

  const transcript = interview.transcript || [];
  const hasViolations = suspiciousEvents.length > 0;
  const integrityScore = Math.max(0, 100 - suspiciousEvents.reduce((s: number, e: SuspiciousEvent) => s + Math.abs(e.score_impact || 0), 0));

  const completedAt = interview.completedAt
    ? new Date(interview.completedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : interview.scheduledAt
    ? new Date(interview.scheduledAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Live Session Recorded';

  const handleGenerateScorecard = async () => {
    setLoadingScorecard(true);
    try {
      const res = await fetch(`/api/interviews/${interview.id}/evaluate-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });
      const data = await res.json();
      if (data.scorecard) {
        setScorecard(data.scorecard);
      } else {
        alert(data.error || 'Failed to synthesize scorecard.');
      }
    } catch (err: any) {
      alert('Error evaluating final scorecard: ' + err.message);
    } finally {
      setLoadingScorecard(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ── 1. Top Session Header Card (Matches interview-test-result & report) */}
      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SESSION RECORDED
              </span>
              <span className="text-xs font-mono text-white/40">
                {completedAt}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight">
              Evaluation Report: {candidate?.name || 'Candidate'}
            </h2>
            <p className="text-white/60 text-sm mt-1 font-sans">
              Target Role: <strong className="text-white">{job?.title || 'Target Role'}</strong> at <strong>Plantra Labs</strong>
            </p>
          </div>

          <div className="p-3 bg-[#030304] border border-white/[0.06] rounded-2xl text-right shrink-0">
            <div className="text-[10px] font-mono text-white/40 uppercase">Session Record</div>
            <Link 
              href={`/report/${interview.id}`} 
              target="_blank"
              className="text-xs font-mono font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1 justify-end transition-colors"
            >
              <span>/report/{interview.id?.slice(0, 10)}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <div className="text-[9px] font-mono text-white/30 mt-0.5">Status: {interview.status || 'COMPLETED'}</div>
          </div>
        </div>

        {/* Telemetry Receipt Box */}
        <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            <FileCheck className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-[10px] font-mono text-white/40">Dialogue Log</div>
            <div className="text-xs font-sans font-bold text-white mt-0.5">{transcript.length} Utterances</div>
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

      {/* ── 2. Proctoring Violation Banner (Matches screenshot media_1789162734922.png) */}
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
                ? '⚠️ Proctoring Violations Detected During Interview'
                : 'Proctor Integrity Verified (Clean Session)'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {hasViolations && (
              <>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border bg-rose-950/80 border-rose-500/40 text-rose-300">
                  {highCount} HIGH SEVERITY
                </span>
                <span className="text-[11px] font-mono text-white/50 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  {suspiciousEvents.length} total
                </span>
              </>
            )}
            <button
              onClick={() => setShowProctorLogs(!showProctorLogs)}
              className="text-xs font-mono text-rose-300 hover:text-white px-3.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>{showProctorLogs ? 'Hide Logs' : 'View Logs →'}</span>
              {showProctorLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Proctoring Event Log (Only shows when View Logs is clicked) */}
        {showProctorLogs && hasViolations && (
          <div className="bg-[#0a0a0d] rounded-3xl border border-rose-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(244,63,94,0.1)] space-y-4 animate-in fade-in duration-200">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-rose-400 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Violation Timeline
            </h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {dedupedEvents.map(({ ev, count }, i) => {
                const sc = SEVERITY_CONFIG[ev.severity || 'INFO'] || SEVERITY_CONFIG.INFO;
                return (
                  <div key={i} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${sc.bg} ${sc.border}`}>
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.border} ${sc.color}`}>
                          {ev.severity || 'INFO'}
                        </span>
                        <span className="text-xs font-bold text-white">{ev.type.replace(/_/g, ' ')}</span>
                        {count > 1 && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-white/[0.06] border border-white/[0.1] text-white/60 rounded-full">
                            ×{count}
                          </span>
                        )}
                        {ev.score_impact !== 0 && ev.score_impact !== undefined && (
                          <span className="text-[9px] font-mono text-rose-400 ml-auto">{ev.score_impact} pts</span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/60 mt-1">{ev.details}</p>
                      <p className="text-[10px] font-mono text-white/30 mt-0.5" suppressHydrationWarning>{formatTimeIST(ev.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Full Scorecard Display (Matching interview-test-result layout with radar & breakdown) */}
      {scorecard ? (
        <ScorecardDisplay scorecard={scorecard} />
      ) : (
        <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Synthesize Candidate Scorecard</h3>
          <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
            The interview session recorded {transcript.length} dialogue turns. Click below to run autonomous multi-round competency evaluation across Coding, Technical Architecture, and HR Culture.
          </p>
          <div className="pt-2">
            <button
              onClick={handleGenerateScorecard}
              disabled={loadingScorecard}
              className="bg-white text-black font-bold py-3 px-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-neutral-200 disabled:opacity-40 transition-all text-xs cursor-pointer inline-flex items-center gap-2"
            >
              {loadingScorecard ? 'Synthesizing Multi-Round Scores...' : 'Generate Comprehensive Scorecard →'}
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Footer Receipt */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono text-white/40">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span>OmniPanel Autonomous Interview Engine</span>
        </div>
        <div className="text-right">
          <span>Session ID: <strong className="text-white/70">{interview?.id}</strong></span>
        </div>
      </div>

    </div>
  );
}
