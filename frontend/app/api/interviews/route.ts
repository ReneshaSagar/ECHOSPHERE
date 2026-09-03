import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, Interview } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { applicationId, scheduledAt } = await req.json();
    
    if (!applicationId || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getDb();
    
    // Find the application
    const appIndex = db.applications.findIndex(a => a.id === applicationId);
    if (appIndex === -1) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Check if interview already exists for this application
    const existing = db.interviews.find(i => i.applicationId === applicationId);
    if (existing) {
      return NextResponse.json({ error: "Interview already scheduled" }, { status: 400 });
    }

    const newInterview: Interview = {
      id: `int_${Math.random().toString(36).substring(2, 9)}`,
      applicationId,
      scheduledAt,
      status: 'PENDING'
    };

    db.interviews.push(newInterview);
    
    // Update Application Status to INTERVIEW_SCHEDULED
    db.applications[appIndex].status = 'INTERVIEW_SCHEDULED';

    saveDb(db);

    return NextResponse.json({ success: true, interview: newInterview });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
