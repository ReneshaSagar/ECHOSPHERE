import { NextRequest, NextResponse } from 'next/server';
import { getDb, resolveInterview } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const interview = resolveInterview(db, id);

    const application = db.applications.find(a => a.id === interview.applicationId);
    const candidate = db.candidates.find(c => c.id === application?.candidateId);
    const job = db.jobs.find(j => j.id === application?.jobId);
    const blueprint = db.blueprints.find(b => b.interviewId === interview.id);

    let parsedBlueprint: any = null;
    if (blueprint?.blueprintJson) {
      try { parsedBlueprint = JSON.parse(blueprint.blueprintJson); } catch {}
    }

    return NextResponse.json({
      interviewId: interview.id,
      sessionId: interview.id,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      completedAt: (interview as any).completedAt || null,

      // Candidate & Job context
      candidate: candidate ? {
        name: candidate.name,
        email: candidate.email,
        linkedinUrl: candidate.linkedinUrl,
        githubUrl: candidate.githubUrl,
        portfolioUrl: candidate.portfolioUrl,
      } : null,
      job: job ? {
        id: job.id,
        title: job.title,
        description: job.description,
      } : null,
      applicationId: application?.id,
      resumeText: application?.resumeText || null,
      candidateContext: application?.candidateContext || candidate?.candidateContext || null,

      // Scorecard (AI evaluation)
      scorecard: interview.scorecard || null,

      // Proctoring
      suspiciousEvents: interview.suspiciousEvents || [],
      proctoringReport: interview.proctoringReport || null,

      // Transcript
      transcript: interview.transcript || [],

      // Blueprint rounds (for round-level context)
      interview_rounds: parsedBlueprint?.interview_rounds || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
