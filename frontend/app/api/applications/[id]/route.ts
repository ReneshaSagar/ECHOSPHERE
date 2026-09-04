import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { 
      status, 
      decisionStage, 
      decisionReason, 
      recommendedAlternativeRoles, 
      evaluationScore,
      evaluationSummary 
    } = body;

    const resolvedParams = await params;
    const db = getDb();
    
    console.log("Looking for application:", resolvedParams.id);
    const appIndex = db.applications.findIndex(a => a.id === resolvedParams.id);
    if (appIndex === -1) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (status !== undefined) db.applications[appIndex].status = status;
    if (decisionStage !== undefined) db.applications[appIndex].decisionStage = decisionStage;
    if (decisionReason !== undefined) db.applications[appIndex].decisionReason = decisionReason;
    if (recommendedAlternativeRoles !== undefined) db.applications[appIndex].recommendedAlternativeRoles = recommendedAlternativeRoles;
    if (evaluationScore !== undefined) db.applications[appIndex].evaluationScore = evaluationScore;
    if (evaluationSummary !== undefined) db.applications[appIndex].evaluationSummary = evaluationSummary;

    saveDb(db);

    // Trigger Automated Email on Status Change
    try {
      const app = db.applications[appIndex];
      const candidate = db.candidates.find(c => c.id === app.candidateId);
      const job = db.jobs.find(j => j.id === app.jobId);

      if (candidate && job) {
        const { sendRejectionEmail, sendInterviewInvitationEmail } = await import('@/lib/email');
        if (status === 'REJECTED') {
          await sendRejectionEmail(candidate, job, decisionStage, decisionReason);
        } else if (status === 'SELECTED') {
          // If interview exists, send room link, otherwise general congrats
          const existingInt = db.interviews.find(i => i.applicationId === app.id);
          const interviewLink = existingInt ? `http://localhost:3000/interview/${existingInt.id}` : `http://localhost:3000/jobs/${job.id}`;
          const scheduledAt = existingInt?.scheduledAt || new Date(Date.now() + 86400000).toISOString();
          await sendInterviewInvitationEmail(candidate, job, scheduledAt, interviewLink);
        }
      }
    } catch (mailErr: any) {
      console.warn('[Application PATCH] Failed to dispatch status email:', mailErr.message);
    }

    return NextResponse.json({ success: true, application: db.applications[appIndex] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
