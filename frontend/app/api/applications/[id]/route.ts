import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { status } = await req.json();
    const resolvedParams = await params;
    const db = getDb();
    
    console.log("Looking for application:", resolvedParams.id);
    const appIndex = db.applications.findIndex(a => a.id === resolvedParams.id);
    if (appIndex === -1) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    db.applications[appIndex].status = status;
    saveDb(db);

    return NextResponse.json({ success: true, application: db.applications[appIndex] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
