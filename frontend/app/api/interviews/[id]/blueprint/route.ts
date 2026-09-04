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

CRITICAL RULES FOR FACTUAL GROUNDING & TOPIC RELEVANCE:
- ZERO-ASSUMPTIONS: The AI interviewers must NEVER pretend, assume, or hallucinate that the candidate used tools, frameworks, or cloud providers that are NOT in their verified background.
- DO NOT ASK ABOUT IRRELEVANT RESUME TOPICS: Just because an item appears on the candidate's resume (for example: Blockchain, Solidity, Web3, Smart Contracts, Crypto, unrelated game scripts, or obsolete university homework) does NOT mean Alex should ask about it! If it does not directly relate to the core responsibilities of ${job.title}, DO NOT ask about it unless the candidate specifically brings it up themselves.
- RESPECT "ignoredOrLowRelevanceTopics": Never formulate questions around topics flagged as low-relevance or irrelevant.
- If the target job requires a technology the candidate has not used (e.g. Kafka or WebRTC), the interviewer must NEVER falsely claim the candidate used it. Instead, probe general architectural fundamentals (e.g., "Our stack relies on Kafka for streaming; how do you think about message ordering and backpressure?").
- Use the provided "interviewContext" (high-relevance evidence, technical interview hooks, behavioral hooks, projects worth probing) to deeply personalize the interviewer's questions and follow-ups.
- Prioritize high-relevance evidence specific to ${job.title}. Focus 100% of technical time on core role competencies, architecture, data flow, concurrency, and corroborated projects.
- GitHub and LinkedIn information MUST be used ONLY to personalize questions, build conversational rapport, and guide deep technical discussions.
- Do NOT mention commit counts, commit frequencies, stars, or follower metrics. They are not quality signals.
- STRICT: NEVER use external profile data to directly score, rank, penalize, or reject the candidate. Evaluation is based strictly on candidate answers during the live interview.`;

    const crossSourceStr = candidateContext?.crossSourceContext ? `
--- CORROBORATED CROSS-SOURCE CONTEXT ---
Corroborated Skills: ${candidateContext.crossSourceContext.corroboratedSkills?.map(s => `${s.skill} (${s.confidence} confidence across ${s.sources.join(', ')})`).join('; ') || 'N/A'}
Corroborated Projects: ${candidateContext.crossSourceContext.corroboratedProjects?.map(p => `${p.projectName}: ${p.details}`).join('; ') || 'N/A'}
Corroborated Experience: ${candidateContext.crossSourceContext.corroboratedExperience?.map(e => `${e.role} at ${e.company} (${e.corroborationNotes || ''})`).join('; ') || 'N/A'}
Career Progression: ${candidateContext.crossSourceContext.careerProgressionSummary || candidateContext.careerProgression || 'N/A'}
Notable Claims to Probe: ${candidateContext.crossSourceContext.notableClaims?.map(c => `${c.claim} -> ${c.verificationFocus}`).join('; ') || 'N/A'}
` : '';

    const interviewContextStr = candidateContext?.interviewContext ? `
--- JD-SPECIFIC INTERVIEW CONTEXT (TARGET: ${job.title}) ---
High Relevance Evidence:
${candidateContext.interviewContext.highRelevanceEvidence?.map(e => `• [${e.relevance}] ${e.topic}: ${e.reason} (Source: ${e.evidenceSources?.join(', ')})`).join('\n')}

High-Value Technical Interview Hooks:
${candidateContext.interviewContext.technicalInterviewHooks?.map(h => `• ${h}`).join('\n')}

Behavioral & Ownership Hooks:
${candidateContext.interviewContext.behavioralInterviewHooks?.map(h => `• ${h}`).join('\n')}

Projects Specifically Worth Probing:
${candidateContext.interviewContext.projectsWorthProbing?.map(p => `• Project "${p.name}" (${p.relevanceLevel} relevance): ${p.reasonToProbe}\n  Questions: ${p.suggestedQuestions?.join(' | ')}`).join('\n')}

Low Relevance / Ignored Topics:
${candidateContext.interviewContext.ignoredOrLowRelevanceTopics?.map(t => `• (Skipped) ${t}`).join('\n') || 'None'}
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
${crossSourceStr}
${interviewContextStr}

Generate the personalized JSON Interview Blueprint containing EXACTLY the requested rounds for ${job.title}, prioritizing the high-relevance evidence, technical interview hooks, and corroborated projects for deep, natural technical probing.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction,
      generationConfig: { responseMimeType: "application/json" },
    });

    let blueprintJsonText = '';
    try {
      let result: any = null;
      let attempts = 0;
      while (attempts < 2) {
        try {
          result = await model.generateContent(userPrompt);
          break;
        } catch (e: any) {
          attempts++;
          if (attempts >= 2) throw e;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      blueprintJsonText = result.response.text();
    } catch (genErr: any) {
      console.warn('[Blueprint Route] Gemini API limit reached. Utilizing personalized deterministic blueprint fallback:', genErr.message);
      const topProjects = (candidateContext?.interviewContext?.projectsWorthProbing || candidateContext?.githubProjects || []).slice(0, 3).map((p: any) => `'${p.name}'`).join(' and ') || 'your recent technical projects';

      const fallbackBlueprint = {
        interview_rounds: stages.map((s, idx) => {
          let role = `${s} Lead`;
          let greeting = `Hello ${candidate.name}, welcome! I've been reviewing your background and your relevant technical projects like ${topProjects}. Today, we will focus on ${s}. Let's dive in.`;
          if (idx === 1) {
            greeting = `Hi ${candidate.name}, welcome to the System Design round. Looking at your architecture in projects like ${topProjects}, I'm keen to discuss how you approach scaling systems and managing concurrency. Let's get started.`;
          } else if (idx === 2) {
            greeting = `Hi ${candidate.name}, great to meet you. Today we'll talk about engineering leadership, team communication, and your experiences collaborating on projects. How are you doing today?`;
          }

          return {
            round_name: `${s} Interview`,
            purpose: `Evaluate ${candidate.name}'s capabilities in ${s} with personalized questions grounded in their background.`,
            interviewer: {
              name: "Alex",
              role,
              instructions: `Speak naturally and concisely. Ask one question at a time. Actively listen to ${candidate.name}. Explore their technical depth in projects like ${topProjects} and validate their real-world problem solving. Maintain a professional, encouraging interviewer tone.`,
              greeting_message: greeting
            },
            topics: ["Core Architecture", "Data Structures", "System Scale", "Engineering Trade-offs"]
          };
        }),
        rubric: {
          "Technical Problem Solving": "Evaluates candidate's analytical reasoning and architectural clarity",
          "System Architecture": "Evaluates understanding of concurrency, scalability, and maintainability",
          "Communication & Craft": "Evaluates structured technical explanation and codecraft"
        }
      };
      blueprintJsonText = JSON.stringify(fallbackBlueprint, null, 2);
    }
    
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
