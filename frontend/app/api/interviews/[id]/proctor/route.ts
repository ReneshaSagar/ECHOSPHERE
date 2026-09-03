import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    const { type, details } = await req.json();

    const db = getDb();
    const interview = db.interviews.find(i => i.id === interviewId);
    
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    if (!interview.suspiciousEvents) {
      interview.suspiciousEvents = [];
    }

    interview.suspiciousEvents.push({
      timestamp: new Date().toISOString(),
      type,
      details
    });

    saveDb(db);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Proctor API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
