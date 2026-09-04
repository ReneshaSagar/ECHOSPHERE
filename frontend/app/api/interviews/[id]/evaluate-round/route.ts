import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb, saveDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    const { roundName, transcript, rubric } = await req.json();

    const db = getDb();
    const interview = db.interviews.find(i => i.id === interviewId);
    
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const systemInstruction = `You are an expert AI Interview Evaluator.
Your job is to read a raw interview transcript for a specific round and evaluate the candidate against the rubric.
Return ONLY valid JSON in this exact structure:
{
  "decision": "PASS" | "FAIL",
  "score": <number 0-100>,
  "reason": "<A concise 2-sentence explanation of why they passed or failed based on evidence>"
}
Be rigorous. If the candidate fails to answer technical questions adequately or hallucinates, fail them.
If this is an HR/Behavioral round, evaluate their communication and alignment.`;

    const userPrompt = `
Round: ${roundName}
Rubric Context:
${JSON.stringify(rubric, null, 2)}

Transcript:
${transcript.map((t: any) => `[${t.speaker}]: ${t.text}`).join('\n')}

Evaluate this round and return the JSON decision.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(userPrompt);
    const evaluation = JSON.parse(result.response.text());

    // Save to DB
    if (!interview.evaluations) interview.evaluations = [];
    interview.evaluations.push({
      round: roundName,
      decision: evaluation.decision,
      score: evaluation.score,
      reason: evaluation.reason
    });

    // Also persist the partial transcript
    if (!interview.transcript) interview.transcript = [];
    interview.transcript.push(...transcript);

    if (evaluation.decision === 'FAIL') {
      interview.status = 'FAILED';
    }

    saveDb(db);

    return NextResponse.json({ success: true, evaluation });
  } catch (error: any) {
    console.error('Round Evaluation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
