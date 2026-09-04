import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const { job_description, resume, candidate_context } = await req.json();

    const systemInstruction = `You are an expert AI Interview Orchestrator. 
Your job is to analyze a Job Description, a Candidate Resume, and optional CandidateContext (from verified LinkedIn enrichment), and design a technical interview blueprint.
You MUST return ONLY valid JSON matching this exact structure:

{
  "interview_rounds": [
    {
      "round_name": "Technical Interview",
      "purpose": "Evaluate technical skills and experience match",
      "interviewer": {
        "name": "Alex",
        "role": "Senior Software Engineer",
        "instructions": "<highly specific instructions for the LLM voice agent>",
        "greeting_message": "<the exact opening line Alex will speak>"
      },
      "topics": ["topic 1", "topic 2"]
    }
  ],
  "rubric": {
    "Problem Solving": "What to look for",
    "Technical Depth": "What to look for"
  }
}

The instructions for Alex MUST explicitly tell him to:
- speak naturally and concisely
- ask one question at a time and listen carefully
- ask relevant follow-up questions based on the candidate's answers
- avoid unnecessarily repeating questions
- stay within the scope of the provided JD and Resume
- use the candidate's resume, JD context, and LinkedIn context naturally in conversation
- never reveal the evaluation rubric
- never give the candidate the answers
- maintain a professional interviewer personality

CRITICAL RULES FOR RELEVANCE & EVALUATION BOUNDARIES:
- If CandidateContext (crossSourceContext or interviewContext) is present, use high-relevance evidence, technical interview hooks, and corroborated projects to personalize questions.
- Prioritize high-relevance evidence specific to the Job Description. Ignore or deprioritize unrelated tech or generic tutorial repos.
- Do NOT use GitHub commit count, commit frequency, stars, or follower metrics as quality signals.
- STRICT: NEVER use external profile data to directly score, rank, penalize, or reject the candidate. Candidate live interview responses are the primary evidence for evaluation.

Keep the instructions highly contextual to the specific JD, Resume, and CandidateContext provided.`;

    const contextPart = candidate_context ? `\n\nCandidateContext (LinkedIn & GitHub):\n${JSON.stringify(candidate_context, null, 2)}` : '';
    const userPrompt = `Job Description:\n${job_description}\n\nCandidate Resume:\n${resume}${contextPart}\n\nGenerate the JSON Interview Blueprint.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(userPrompt);
    const blueprint = JSON.parse(result.response.text());
    
    return NextResponse.json(blueprint);
  } catch (error: any) {
    console.error('Orchestrator error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
