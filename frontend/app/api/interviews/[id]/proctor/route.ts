import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, resolveInterview } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    const body = await req.json();
    const { type, details, severity, duration, score_impact, currentScores } = body;

    const db = getDb();
    const interview = resolveInterview(db, interviewId);

    if (!interview.suspiciousEvents) {
      interview.suspiciousEvents = [];
    }

    // Only log non-heartbeat events into suspiciousEvents list
    if (type !== 'TELEMETRY_HEARTBEAT') {
      interview.suspiciousEvents.push({
        timestamp: new Date().toISOString(),
        type: type || 'BEHAVIORAL_FLAG',
        details: details || 'Behavioral anomaly detected',
        severity: severity || 'MEDIUM',
        score_impact: score_impact || 0
      });
    }

    // Update proctoring report snapshot if provided
    if (currentScores) {
      interview.proctoringReport = {
        ...(interview.proctoringReport || {}),
        ...currentScores,
        lastUpdated: new Date().toISOString(),
        totalEventsRecorded: interview.suspiciousEvents.length
      };
    }

    saveDb(db);

    return NextResponse.json({ 
      success: true, 
      eventsCount: interview.suspiciousEvents.length,
      proctoringReport: interview.proctoringReport
    });
  } catch (error: any) {
    console.error('Proctor API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;

    const db = getDb();
    const interview = resolveInterview(db, interviewId);

    return NextResponse.json({ 
      success: true, 
      events: interview.suspiciousEvents || [],
      proctoringReport: interview.proctoringReport || null
    });
  } catch (error: any) {
    console.error('Proctor GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
