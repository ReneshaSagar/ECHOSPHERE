import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, Job } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { title, description, requirements, stages, mcpServerUrl } = await req.json();
    
    if (!title || !description || !requirements) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getDb();
    const newJob: Job = {
      id: `j_${Math.random().toString(36).substring(2, 9)}`,
      companyId: db.companies[0]?.id || 'c1',
      title,
      description,
      requirements,
      stagesJson: JSON.stringify(stages || ['Technical', 'HR']),
      ...(mcpServerUrl && { mcpServerUrl })
    };

    db.jobs.push(newJob);
    saveDb(db);

    return NextResponse.json({ success: true, job: newJob });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
