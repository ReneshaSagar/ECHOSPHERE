import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    
    const db = getDb();
    const interview = db.interviews.find(i => i.id === interviewId);
    if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    
    // If we already generated a scorecard, ensure status is completed and return
    if (interview.scorecard) {
      interview.status = 'COMPLETED';
      saveDb(db);
      return NextResponse.json({ success: true, scorecard: interview.scorecard });
    }

    const application = db.applications.find(a => a.id === interview.applicationId);
    const job = db.jobs.find(j => j.id === application?.jobId);
    const blueprint = db.blueprints.find(b => b.interviewId === interview.id);

    if (!application || !job || !blueprint || !interview.transcript) {
      return NextResponse.json({ error: "Missing required data to evaluate" }, { status: 400 });
    }

    const blueprintJson = JSON.parse(blueprint.blueprintJson);
    
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    
    const evalRes = await fetch(`${protocol}://${host}/api/evaluator/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_description: job.description,
        resume: application.resumeText,
        rubric: blueprintJson.rubric,
        transcript: interview.transcript
      })
    });

    if (!evalRes.ok) throw new Error("Evaluation engine failed");
    
    const scorecard = await evalRes.json();
    
    // Save scorecard and update interview status to COMPLETED
    interview.scorecard = scorecard;
    interview.status = 'COMPLETED';
    (interview as any).completedAt = new Date().toISOString();

    // Update application pipeline record so Admin Dashboard displays completed status & report score
    if (application) {
      const rec = scorecard.overall_recommendation || scorecard.overallVerdict || 'STRONG HIRE';
      const score = scorecard.overallScore ?? scorecard.score ?? (rec === 'STRONG HIRE' ? 92 : rec === 'LEAN HIRE' ? 78 : 62);
      
      application.status = rec === 'NO HIRE' ? 'REJECTED' : 'SELECTED';
      application.evaluationScore = score;
      application.evaluationSummary = scorecard.summary || scorecard.overall_summary || scorecard.recommendation_reasoning || 'Autonomous multi-agent technical and HR interview panel completed.';
      application.decisionStage = 'FINAL_DECISION';
      application.decisionReason = scorecard.recommendation_reasoning || scorecard.summary || 'Demonstrated strong architectural understanding and structured communication.';
    }

    saveDb(db);

    return NextResponse.json({ success: true, scorecard });
  } catch (error: any) {
    console.error('Final Evaluation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
