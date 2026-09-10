import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import ApplicationActions from './ApplicationActions';
import ScorecardViewer from './ScorecardViewer';
import ApplicationTabView from './ApplicationTabView';

export default async function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  const application = db.applications.find(a => a.id === resolvedParams.id);

  if (!application) {
    return (
      <div className="p-8 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        Application not found
      </div>
    );
  }

  const job = db.jobs.find(j => j.id === application.jobId);
  const candidate = db.candidates.find(c => c.id === application.candidateId);
  const candidateContext = {
    ...(application.candidateContext || {}),
    ...(candidate?.candidateContext || {}),
    interviewBrief: candidate?.candidateContext?.interviewBrief || application.candidateContext?.interviewBrief
  };

  const interview = db.interviews.find(i => i.applicationId === application.id);
  const blueprint = interview ? db.blueprints.find(b => b.interviewId === interview.id) : undefined;

  let parsedBlueprint: any = null;
  if (blueprint) {
    try {
      parsedBlueprint = JSON.parse(blueprint.blueprintJson);
    } catch (e) {
      console.error('Error parsing blueprintJson:', e);
    }
  }

  const hasSuspiciousEvents = !!(interview?.suspiciousEvents && interview.suspiciousEvents.length > 0);

  // Serialize only what's needed (no circular refs)
  const safeInterview = interview
    ? {
        id: interview.id,
        status: interview.status,
        scheduledAt: interview.scheduledAt,
        suspiciousEvents: interview.suspiciousEvents || [],
        proctoringReport: interview.proctoringReport || null,
        scorecard: interview.scorecard || null,
      }
    : null;

  const safeBlueprint = blueprint ? { id: blueprint.id } : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">

      {/* ── Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/jobs/${job?.id}`}
            className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all font-mono text-xs flex items-center gap-1.5"
          >
            ← Back to Job
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Review Application</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/40 uppercase tracking-widest">App ID:</span>
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/80">
            {application.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* ── Tabbed content (client component) */}
      <ApplicationTabView
        application={application}
        candidate={candidate ?? null}
        candidateContext={candidateContext ?? null}
        job={job ?? null}
        interview={safeInterview}
        blueprint={safeBlueprint}
        parsedBlueprint={parsedBlueprint}
        hasSuspiciousEvents={hasSuspiciousEvents}
      />

      {/* ── AI Scorecard (post-interview) — shown first */}
      {interview && (interview.status === 'COMPLETED' || !!interview.scorecard || application.evaluationScore !== undefined) && (
        <ScorecardViewer interviewId={interview.id} initialScorecard={interview.scorecard} />
      )}

      {/* ── Hiring Decision — always last */}
      <ApplicationActions applicationId={application.id} currentStatus={application.status} />

    </div>
  );
}
