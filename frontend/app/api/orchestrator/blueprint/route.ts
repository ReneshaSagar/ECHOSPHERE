import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const { job_description, resume, candidate_context } = await req.json();

    const systemInstruction = `You are an expert AI Interview Orchestrator. 
Your job is to analyze a Job Description, a Candidate Resume, and optional CandidateContext (from verified LinkedIn enrichment), and design a multi-agent technical interview blueprint.
You MUST return ONLY valid JSON matching this exact structure:

{
  "interview_rounds": [
    {
      "round_name": "Technical Panel Interview",
      "round_type": "technical",
      "purpose": "Evaluate technical skills and experience match",
      "interviewers": [
        {
          "name": "Alex (Primary)",
          "role": "Senior Software Engineer",
          "voice": "Aoede",
          "agent_uid": 9991,
          "instructions": "<highly specific instructions for the primary LLM voice agent>",
          "greeting_message": "<the exact opening line Alex will speak>"
        },
        {
          "name": "Jordan (Challenger)",
          "role": "Staff Engineer - Technical Prober",
          "voice": "Charon",
          "agent_uid": 9992,
          "instructions": "<highly specific instructions for the challenger LLM voice agent>"
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

The instructions for the agents MUST explicitly tell them to:
- speak naturally and concisely
- ask one question at a time and listen carefully
- avoid unnecessarily repeating questions
- stay within the scope of the provided JD and Resume
- never reveal the evaluation rubric or give the candidate the answers

CRITICAL RULES FOR MULTI-AGENT PANEL COORDINATION (Technical Round):
- Emphasize to BOTH agents that there are 3 PEOPLE on this live voice call: the Candidate, Alex (Primary Lead), and Jordan (Challenger Specialist).
- The CANDIDATE is the center of the interview. Both interviewers are evaluating the candidate, NOT chatting with each other.
- Every single question asked MUST be directed to the Candidate, followed by COMPLETE SILENCE to wait for the candidate's answer.
- Alex leads the conversation and hands off to Jordan naturally (e.g., "Jordan, do you want to ask the candidate about their caching model?").
- When handed the floor, Jordan immediately asks the Candidate one sharp technical question, waits in silence for the candidate's answer, and then yields back to Alex (e.g. "Thanks candidate, that makes sense. Back to you, Alex.").
- Never talk over anyone. Yield the floor immediately if someone else is speaking.

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
