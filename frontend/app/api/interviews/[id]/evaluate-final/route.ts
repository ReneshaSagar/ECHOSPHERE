import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    
    const db = getDb();
    const interview = db.interviews.find(i => i.id === interviewId);
    if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    
    // If we already generated a scorecard, just return it
    if (interview.scorecard) {
      return NextResponse.json({ success: true, scorecard: interview.scorecard });
    }

    const application = db.applications.find(a => a.id === interview.applicationId);
    const job = db.jobs.find(j => j.id === application?.jobId);
    const blueprint = db.blueprints.find(b => b.interviewId === interview.id);

    if (!application || !job || !blueprint || !interview.transcript) {
      return NextResponse.json({ error: "Missing required data to evaluate" }, { status: 400 });
    }

    const blueprintJson = JSON.parse(blueprint.blueprintJson);

    // Call our own internal evaluator endpoint logic (or we can just fetch it natively via localhost, but calling fetch to self in Next.js can be tricky. Better to import the logic or just fetch from absolute URL if we have one. We will fetch from localhost)
    
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
    
    // Save locally
    interview.scorecard = scorecard;
    saveDb(db);

    return NextResponse.json({ success: true, scorecard });
  } catch (error: any) {
    console.error('Final Evaluation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
