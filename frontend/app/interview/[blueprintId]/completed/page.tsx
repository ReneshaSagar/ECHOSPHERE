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
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-gray-900 to-slate-950 text-white flex flex-col pt-12 pb-16 px-4">
      {/* mr.technologies Brand Nav */}
      <div className="max-w-3xl mx-auto w-full mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-blue-500/30">
            M
          </div>
          <div>
            <div className="font-extrabold text-white text-base tracking-tight">mr.technologies AI</div>
            <div className="text-xs text-gray-400">Autonomous Technical Interviews</div>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Session Concluded
        </span>
      </div>

      {/* Main Card */}
      <div className="max-w-3xl mx-auto w-full bg-gray-800/60 backdrop-blur-md rounded-2xl border border-gray-700/60 p-8 sm:p-10 shadow-2xl space-y-8">
        {/* Hero Success Badge */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Interview Session Completed!
          </h1>
          <p className="text-gray-300 text-base max-w-xl mx-auto leading-relaxed">
            Thank you, <strong className="text-white font-semibold">{candidate?.name || 'Candidate'}</strong>. Your multi-round conversational voice interview for <strong className="text-blue-400 font-semibold">{job?.title || 'the target role'}</strong> has concluded successfully.
          </p>
        </div>

        {/* Telemetry / Submission Receipt Box */}
        <div className="bg-gray-900/70 rounded-xl p-5 border border-gray-700/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <FileCheck className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
            <div className="text-xs text-gray-400">Audio & Dialogue</div>
            <div className="text-sm font-bold text-white mt-0.5">Captured & Saved</div>
          </div>
          <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <div className="text-xs text-gray-400">Integrity Proctor</div>
            <div className="text-sm font-bold text-white mt-0.5">Telemetry Verified</div>
          </div>
          <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
            <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
            <div className="text-xs text-gray-400">Evaluation Phase</div>
            <div className="text-sm font-bold text-white mt-0.5">Synthesis in Progress</div>
          </div>
        </div>

        {/* What Happens Next Steps */}
        <div className="space-y-4 pt-2 border-t border-gray-700/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            What Happens Next?
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/40 border border-gray-700/40">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
                1
              </div>
              <div className="text-sm">
                <div className="font-bold text-white">Automated Multi-Agent Synthesis</div>
                <div className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  Our evaluation arbiter synthesizes your responses, technical depth, system architecture trade-offs, and communication clarity against the standardized rubric.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/40 border border-gray-700/40">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
                2
              </div>
              <div className="text-sm">
                <div className="font-bold text-white">Hiring Committee & Recruiter Review</div>
                <div className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  The engineering leads review the full session transcript and corroborated findings to make final stage determinations.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/40 border border-gray-700/40">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 border border-blue-500/40">
                3
              </div>
              <div className="text-sm">
                <div className="font-bold text-white">Email Notification with Next Steps</div>
                <div className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                  You will receive an official email update at <strong className="text-gray-200">{candidate?.email || 'your registered email address'}</strong> regarding your application status and any follow-up steps.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-700/50">
          <div className="text-xs text-gray-500">
            Session Reference: <span className="font-mono text-gray-400">{interview?.id || targetId}</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/jobs"
              className="flex-1 sm:flex-none text-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Explore More Roles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
