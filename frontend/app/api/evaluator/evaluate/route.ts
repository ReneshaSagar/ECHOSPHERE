import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAiClient } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  try {
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

    const formattedTranscript = transcript.map((t: any) => {
      const prefix = t.round ? `[${t.round}] ` : '';
      return `${prefix}${t.speaker}: ${t.text}`;
    }).join("\n");

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

    const { client: openai, model } = getAiClient();

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const resultText = response.choices[0].message.content || '{}';
    const scorecard = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());
    
    return NextResponse.json(scorecard);
  } catch (error: any) {
    console.error('Evaluator error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
