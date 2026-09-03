import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, InterviewBlueprint } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    
    const db = getDb();
    const interview = db.interviews.find(i => i.id === interviewId);
    if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

    const application = db.applications.find(a => a.id === interview.applicationId);
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const job = db.jobs.find(j => j.id === application.jobId);
    const candidate = db.candidates.find(c => c.id === application.candidateId);

    if (!job || !candidate) {
      return NextResponse.json({ error: "Job or Candidate data missing" }, { status: 400 });
    }

    // Retrieve CandidateContext (enriched from LinkedIn)
    const candidateContext = application.candidateContext || candidate.candidateContext;

    // Connect to Gemini 3.5 Flash
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Convert the Job Stages into a required structure format
    const stages = JSON.parse(job.stagesJson || '["Technical", "HR"]');
    const expectedRounds = stages.map((s: string) => `
    {
      "round_name": "${s} Interview",
      "purpose": "...",
      "interviewer": {
        "name": "Alex",
        "role": "${s} Lead",
        "instructions": "...",
        "greeting_message": "..."
      },
      "topics": []
    }`).join(',');

    const systemInstruction = `You are an expert AI Interview Orchestrator for EchoSphere.
Your job is to analyze a Job Description, a Candidate's Resume, and their CandidateContext (from verified LinkedIn enrichment), and design a personalized multi-round interview blueprint.
You MUST return ONLY valid JSON matching this exact structure containing the requested rounds:

{
  "interview_rounds": [
    ${expectedRounds}
  ],
  "rubric": {
    "Criteria 1": "What to look for",
    "Criteria 2": "What to look for"
  }
}

The instructions for the AI interviewers MUST explicitly tell them to:
- speak naturally and concisely
- ask one question at a time and listen carefully
- ask relevant follow-up questions based on the candidate's answers
- use the candidate's specific background context naturally
- maintain a professional interviewer personality

CRITICAL RULES FOR LINKEDIN CONTEXT PERSONALIZATION:
- If CandidateContext from LinkedIn is provided, use it to personalize the interviewer's opening greeting message, topic selection, and follow-up probes (e.g., asking about specific career milestones, past projects, or notable claims).
- The LinkedIn information MUST be used ONLY to personalize questions, build conversational rapport, and guide technical discussions.
- NEVER use LinkedIn information to directly score, penalize, or reject the candidate. Evaluation is based strictly on candidate answers during the live interview.`;

    const candidateContextStr = candidateContext ? `
--- CANDIDATE LINKEDIN CONTEXT ---
Headline: ${candidateContext.headline || 'N/A'}
About: ${candidateContext.about || 'N/A'}
Career Progression: ${candidateContext.careerProgression || 'N/A'}
Key Skills: ${(candidateContext.skills || []).join(', ') || 'N/A'}
Notable Claims: ${(candidateContext.notableClaims || []).join('; ') || 'N/A'}
Personalized Interview Hooks: ${(candidateContext.interviewHooks || []).join('; ') || 'N/A'}
Experience Details: ${JSON.stringify(candidateContext.experience || [], null, 2)}
` : '';

    const userPrompt = `
Job Title: ${job.title}
Job Description:
${job.description}

Requirements:
${job.requirements}

Candidate Name: ${candidate.name}
Candidate Resume:
${application.resumeText}
${application.relevantExperience ? `\nHighlighted Experience:\n${application.relevantExperience}` : ''}
${candidateContextStr}

Generate the personalized JSON Interview Blueprint containing EXACTLY the requested rounds for ${job.title}, using the candidate's background context and LinkedIn hooks for natural personalization.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      generationConfig: { responseMimeType: "application/json" },
    });

    let result: any = null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        result = await model.generateContent(userPrompt);
        break;
      } catch (e: any) {
        attempts++;
        if (attempts >= 3) throw e;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    const blueprintJsonText = result.response.text();
    
    // Check if a blueprint already exists to overwrite or create new
    let blueprint = db.blueprints.find(b => b.interviewId === interviewId);
    
    if (blueprint) {
      blueprint.blueprintJson = blueprintJsonText;
    } else {
      blueprint = {
        id: `bp_${Math.random().toString(36).substring(2, 9)}`,
        interviewId,
        blueprintJson: blueprintJsonText
      };
      db.blueprints.push(blueprint);
    }
    
    saveDb(db);
    return NextResponse.json({ success: true, blueprintId: blueprint.id });
    
  } catch (error: any) {
    console.error('Blueprint Generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
