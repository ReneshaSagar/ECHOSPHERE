import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { job_description, resume, candidate_context } = await req.json();

    const systemInstruction = `You are an expert AI Interview Orchestrator. 
Your job is to analyze a Job Description, a Candidate Resume, and optional CandidateContext (from verified LinkedIn enrichment), and design a single-agent technical interview blueprint.
You MUST return ONLY valid JSON matching this exact structure:

{
  "interview_rounds": [
    {
      "round_name": "Technical Interview",
      "round_type": "technical",
      "purpose": "Evaluate technical skills and experience match",
      "interviewers": [
        {
          "name": "Alex",
          "role": "Senior Software Engineer",
          "voice": "Aoede",
          "agent_uid": 9991,
          "instructions": "<highly specific instructions for the LLM voice agent>",
          "greeting_message": "<the exact opening line Alex will speak>"
        }
      ],
      "topics": ["topic 1", "topic 2"]
    },
    {
      "round_name": "HR & Culture Round",
      "round_type": "behavioral",
      "purpose": "Evaluate behavioral skills and culture fit",
      "interviewers": [
        {
          "name": "Taylor (HR)",
          "role": "Talent Acquisition Manager",
          "voice": "Puck",
          "agent_uid": 9993,
          "instructions": "<instructions for the HR LLM voice agent>",
          "greeting_message": "<the exact opening line Taylor will speak>"
        }
      ],
      "topics": ["teamwork", "leadership"]
    }
  ],
  "rubric": {
    "Problem Solving": "What to look for",
    "Technical Depth": "What to look for"
  }
}

The instructions for the agents MUST explicitly enforce:
- Speak naturally, concisely, and with technical rigor (2-3 sentences max per turn).
- Ask one question at a time and listen carefully.
- NEVER reveal the rubric or feed the candidate answers.
- Strict Answer Validation: evaluate every answer. NEVER say "makes sense" to vague answers, incorrect claims, or gibberish. Challenge incorrect reasoning and redirect irrelevant answers.

CRITICAL RULES FOR RELEVANCE & EVALUATION BOUNDARIES:
- If CandidateContext is present, use verified projects and corroborated technical skills from the Knowledge Base to formulate sharp, tailored questions.
- Strictly ground all questions in verifiable factual data. Do not invent candidate experiences.
- Candidate live technical responses are the sole ground truth for evaluation.

Keep the instructions highly contextual to the specific JD, Resume, and CandidateContext provided.`;

    const contextPart = candidate_context ? `\n\nCandidateContext (LinkedIn & GitHub):\n${JSON.stringify(candidate_context, null, 2)}` : '';
    const userPrompt = `Job Description:\n${job_description}\n\nCandidate Resume:\n${resume}${contextPart}\n\nGenerate the JSON Interview Blueprint.`;

    const openai = new OpenAI({
      apiKey: process.env.GEMINI_DIRECT_API_KEY || process.env.REQUESTY_API_KEY || process.env.GEMINI_API_KEY || '',
      baseURL: 'https://router.requesty.ai/v1'
    });

    const response = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-exp",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const resultText = response.choices[0].message.content || '{}';
    const blueprint = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());
    
    return NextResponse.json(blueprint);
  } catch (error: any) {
    console.error('Orchestrator error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
