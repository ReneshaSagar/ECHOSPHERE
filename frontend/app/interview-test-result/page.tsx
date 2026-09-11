import React from 'react';
import Link from 'next/link';
import { getDb, resolveInterview } from '@/lib/db';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  FileCheck, 
  ArrowRight, 
  Home, 
  Sparkles, 
  RefreshCw, 
  Cpu, 
  Terminal 
} from 'lucide-react';
import ScorecardDisplay from '@/components/ScorecardDisplay';

export default async function InterviewTestResultPage() {
  const db = getDb();

  // Retrieve dedicated test interview or fallback to latest interview with a scorecard
  let interview = db.interviews.find(i => i.id === 'demo-interview-test');
  
  if (!interview || !interview.scorecard) {
    // Check if there is another completed interview with a scorecard
    const alternative = db.interviews.slice().reverse().find(i => i.scorecard);
    if (alternative) {
      interview = alternative;
    } else {
      interview = resolveInterview(db, 'demo-interview-test');
    }
  }

  const application = interview ? db.applications.find(a => a.id === interview.applicationId) || db.applications[0] : db.applications[0];
  const candidate = application ? db.candidates.find(c => c.id === application.candidateId) || db.candidates[0] : db.candidates[0];
  const job = application ? db.jobs.find(j => j.id === application.jobId) || db.jobs[0] : db.jobs[0];

  const scorecard = interview?.scorecard;
  const transcript = interview?.transcript || [];
  const completedAt = (interview as any)?.completedAt 
    ? new Date((interview as any).completedAt).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) 
    : 'Just now (Live Test Run)';

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
                TEST BENCH RESULT
              </span>
            </div>
            <div className="text-xs font-mono text-white/40">Plantra Labs · Autonomous Evaluation Debrief</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/interview-test"
            className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-sans font-semibold text-xs transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)] group"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            <span>Retake / Run New Test</span>
          </Link>
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
        {/* Test Run Info Banner */}
        <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LATEST TEST SESSION RECORDED
                </span>
                <span className="text-xs font-mono text-white/40">
                  {completedAt}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight">
                Evaluation Report: {candidate?.name || 'Alex Rivera'}
              </h1>
              <p className="text-white/60 text-sm mt-1">
                Target Role: <strong className="text-white">{job?.title || 'Senior Backend Engineer — Distributed Systems'}</strong> at <strong>Plantra Labs</strong>
              </p>
            </div>

            <div className="p-3 bg-[#030304] border border-white/[0.06] rounded-2xl text-right shrink-0">
              <div className="text-[10px] font-mono text-white/40 uppercase">Storage Target</div>
              <div className="text-xs font-mono font-bold text-purple-300">/interview-test-result</div>
              <div className="text-[9px] font-mono text-white/30 mt-0.5">Overwrites on each test run</div>
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
                {(interview?.suspiciousEvents?.length || 0) === 0 ? 'Verified / Clear' : `${interview?.suspiciousEvents?.length} Flags`}
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

        {/* Dynamic Multi-Round Scorecard Report */}
        {scorecard ? (
          <ScorecardDisplay scorecard={scorecard} />
        ) : (
          <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-10 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">No Test Evaluation Recorded Yet</h2>
            <p className="text-white/60 text-sm max-w-md mx-auto">
              Launch your first test interview on the test bench to evaluate coding, technical architecture, and HR rounds. The full multi-round report will appear here automatically.
            </p>
            <div className="pt-2">
              <Link
                href="/interview-test"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] transition"
              >
                <span>Launch Test Interview</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Footer info box */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono text-white/40">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>OmniPanel Autonomous Interview Engine</span>
          </div>
          <div className="text-right">
            <span>Session ID: <strong className="text-white/70">{interview?.id || 'demo-interview-test'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
