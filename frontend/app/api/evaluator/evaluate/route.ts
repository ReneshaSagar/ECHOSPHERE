import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const { job_description, resume, rubric, transcript } = await req.json();

    const systemInstruction = `You are an expert AI Technical Interview Evaluator.
Your job is to deeply analyze an interview transcript and evaluate the candidate's performance against the provided Job Description and Rubric.

You MUST return ONLY valid JSON matching this exact structure:

{
  "overall_recommendation": "Strong Hire | Hire | Leaning Hire | Leaning No Hire | No Hire",
  "overall_summary": "A concise 2-3 sentence summary of the candidate's performance.",
  "strengths": ["Key strength 1", "Key strength 2"],
  "weaknesses": ["Key weakness 1", "Key weakness 2"],
  "rubric_evaluations": [
    {
      "pillar": "Name of the rubric pillar",
      "score": 4, 
      "feedback": "Detailed feedback on why they received this score for this pillar.",
      "evidence": ["Exact quote from the candidate in the transcript demonstrating this."]
    }
  ]
}

Instructions:
1. Ensure the 'score' is an integer between 1 and 5.
2. Provide concrete 'evidence' quotes directly from the transcript to justify your scores.
3. Be objective, fair, and highly critical just like a real Senior Engineering Manager.`;

    const formattedTranscript = transcript.map((t: any) => `${t.speaker}: ${t.text}`).join("\n");

    const userPrompt = `
--- JOB DESCRIPTION ---
${job_description}

--- CANDIDATE RESUME ---
${resume}

--- EVALUATION RUBRIC ---
${JSON.stringify(rubric, null, 2)}

--- INTERVIEW TRANSCRIPT ---
${formattedTranscript}

Analyze the transcript and generate the JSON Scorecard.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(userPrompt);
    const scorecard = JSON.parse(result.response.text());
    
    return NextResponse.json(scorecard);
  } catch (error: any) {
    console.error('Evaluator error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
