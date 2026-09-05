import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { CheckCircle2, ShieldCheck, Clock, FileCheck, ArrowRight, Home, Sparkles } from 'lucide-react';

export default async function InterviewCompletedPage({ params }: { params: Promise<{ blueprintId: string }> }) {
  const resolvedParams = await params;
  const targetId = resolvedParams.blueprintId;
  const db = getDb();

  // Find blueprint or interview by ID
  const blueprint = db.blueprints.find(b => 
    b.id === targetId || 
    b.interviewId === targetId
  );

  const interview = blueprint 
    ? db.interviews.find(i => i.id === blueprint.interviewId)
    : db.interviews.find(i => i.id === targetId);

  const application = interview ? db.applications.find(a => a.id === interview.applicationId) : null;
  const candidate = application ? db.candidates.find(c => c.id === application.candidateId) : null;
  const job = application ? db.jobs.find(j => j.id === application.jobId) : null;

  return (
    <div className="min-h-screen bg-[#030304] text-[#f5f5f7] font-sans flex flex-col pt-12 pb-16 px-4">
      {/* Nexora Labs Brand Nav */}
      <div className="max-w-3xl mx-auto w-full mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            N
          </div>
          <div>
            <div className="font-sans font-bold text-white text-base tracking-tight flex items-center gap-2">
              <span>nexora labs</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-white/70 border border-white/[0.08]">
                omnipanel
              </span>
            </div>
            <div className="text-xs font-mono text-white/40">autonomous technical evaluation</div>
          </div>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          session concluded
        </span>
      </div>

      {/* Main Card */}
      <div className="max-w-3xl mx-auto w-full bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-8 sm:p-12 shadow-[0_0_50px_rgba(0,0,0,0.6)] space-y-10">
        {/* Hero Success Badge */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight">
            interview session completed!
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-sans">
            Thank you, <strong className="text-white font-semibold">{candidate?.name || 'Candidate'}</strong>. Your multi-round conversational interview for <strong className="text-white font-semibold">{job?.title || 'the target position'}</strong> at <strong>Nexora Labs</strong> has concluded successfully.
          </p>
        </div>

        {/* Telemetry / Submission Receipt Box */}
        <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            <FileCheck className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
            <div className="text-xs font-mono text-white/40">audio & dialogue</div>
            <div className="text-sm font-sans font-bold text-white mt-0.5">captured & saved</div>
          </div>
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <div className="text-xs font-mono text-white/40">integrity proctor</div>
            <div className="text-sm font-sans font-bold text-white mt-0.5">telemetry verified</div>
          </div>
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
            <div className="text-xs font-mono text-white/40">evaluation phase</div>
            <div className="text-sm font-sans font-bold text-white mt-0.5">synthesis in progress</div>
          </div>
        </div>

        {/* What Happens Next Steps */}
        <div className="space-y-4 pt-2 border-t border-white/[0.08]">
          <h2 className="text-lg font-sans font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>what happens next?</span>
          </h2>

          <div className="space-y-3 font-sans">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-7 h-7 rounded-full bg-white/[0.05] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-white/[0.1]">
                1
              </div>
              <div className="text-sm space-y-1">
                <div className="font-bold text-white">OmniPanel Multi-Agent Synthesis</div>
                <div className="text-white/50 text-xs leading-relaxed">
                  The evaluation arbiter synthesizes your responses, technical depth, system architecture trade-offs, and communication clarity against our standardized engineering rubric.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-7 h-7 rounded-full bg-white/[0.05] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-white/[0.1]">
                2
              </div>
              <div className="text-sm space-y-1">
                <div className="font-bold text-white">Nexora Labs Hiring Committee Review</div>
                <div className="text-white/50 text-xs leading-relaxed">
                  Engineering and product leads review the complete session scorecard, verified telemetry, and corroborated background to make stage determinations.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-7 h-7 rounded-full bg-white/[0.05] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-white/[0.1]">
                3
              </div>
              <div className="text-sm space-y-1">
                <div className="font-bold text-white">Direct Email Notification with Next Steps</div>
                <div className="text-white/50 text-xs leading-relaxed">
                  You will receive an official email update at <strong className="text-white">{candidate?.email || 'your registered email address'}</strong> regarding your evaluation outcome and interview debrief.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-white/[0.08]">
          <div className="text-xs font-mono text-white/40">
            session id: <span className="text-white/70">{interview?.id || targetId}</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/jobs"
              className="flex-1 sm:flex-none text-center px-8 py-3.5 rounded-full bg-white text-black hover:bg-neutral-200 font-sans font-bold text-sm shadow-[0_0_25px_rgba(255,255,255,0.2)] transition flex items-center justify-center gap-2 group"
            >
              <Home className="w-4 h-4" />
              <span>explore more roles</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

