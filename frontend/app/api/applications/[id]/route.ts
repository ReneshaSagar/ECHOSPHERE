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

    const appIndex = db.applications.findIndex(a => a.id === resolvedParams.id);
    if (appIndex === -1) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // ─── Safety Gate ────────────────────────────────────────────────────────────
    // SELECTED status triggers the final offer email.
    // It must NEVER fire before the interview is completed.
    // Reject the request if no COMPLETED interview exists for this application.
    if (status === 'SELECTED') {
      const completedInterview = db.interviews.find(
        i => i.applicationId === resolvedParams.id && i.status === 'COMPLETED'
      );
      if (!completedInterview) {
        return NextResponse.json(
          {
            error:
              'Cannot mark candidate as Selected before their interview is completed. ' +
              'The offer email will only be dispatched after the interview has been evaluated.',
            code: 'INTERVIEW_NOT_COMPLETED'
          },
          { status: 422 }
        );
      }
    }
    // ────────────────────────────────────────────────────────────────────────────

    if (status !== undefined) db.applications[appIndex].status = status;
    if (decisionStage !== undefined) db.applications[appIndex].decisionStage = decisionStage;
    if (decisionReason !== undefined) db.applications[appIndex].decisionReason = decisionReason;
    if (recommendedAlternativeRoles !== undefined) db.applications[appIndex].recommendedAlternativeRoles = recommendedAlternativeRoles;
    if (evaluationScore !== undefined) db.applications[appIndex].evaluationScore = evaluationScore;
    if (evaluationSummary !== undefined) db.applications[appIndex].evaluationSummary = evaluationSummary;

    saveDb(db);

    // Trigger automated email on status change
    try {
      const app = db.applications[appIndex];
      const candidate = db.candidates.find(c => c.id === app.candidateId);
      const job = db.jobs.find(j => j.id === app.jobId);

      if (candidate && job) {
        const { sendRejectionEmail, sendSelectionOfferEmail, sendWaitlistAltRoleEmail } = await import('@/lib/email');

        if (status === 'REJECTED') {
          await sendRejectionEmail(candidate, job, decisionStage, decisionReason);
        } else if (status === 'SELECTED') {
          // Guard above already confirmed interview is COMPLETED before we reach here
          await sendSelectionOfferEmail(candidate, job, evaluationScore, evaluationSummary || decisionReason);
        } else if (status === 'CONSIDER_FOR_OTHER_ROLES') {
          await sendWaitlistAltRoleEmail(candidate, job, recommendedAlternativeRoles, decisionReason);
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
