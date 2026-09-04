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

    return NextResponse.json({ success: true, application: db.applications[appIndex] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
