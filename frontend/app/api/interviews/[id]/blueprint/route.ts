import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { selectPanelForJob } from '@/lib/interview/interviewerPool';
import { createInitialInterviewState } from '@/lib/interview/interviewState';

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

    // Retrieve CandidateContext (enriched from LinkedIn and GitHub)
    const candidateContext = application.candidateContext || candidate.candidateContext;

    // Dynamically select 2-agent technical panel and 1 HR agent from company pool (No hardcoded Alex)
    const panel = selectPanelForJob(job.title);

    // Connect to Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    const systemInstruction = `You are an expert AI Interview Orchestrator for mr.technologies.
Your job is to analyze a Job Description, a Candidate's Resume, and their CandidateContext (from verified LinkedIn/GitHub enrichment), and design a personalized multi-round interview blueprint.

mr.technologies uses a multi-agent interview panel architecture:
- Round 1 (Technical Round): 2 AI interviewers in the session with strictly coordinated turn-taking:
  1. Primary Technical Interviewer: "${panel.technicalPrimary.name}" (${panel.technicalPrimary.role}) - leads core topic progression, welcomes the candidate, and introduces the panel.
  2. Technical Specialist / Challenger: "${panel.technicalChallenger.name}" (${panel.technicalChallenger.role}) - stays silent during opening; only speaks when handed the floor to probe scalability, trade-offs, and edge cases.
- Round 2 (HR Round): 1 AI interviewer:
  1. HR / Talent Lead: "${panel.hrInterviewer.name}" (${panel.hrInterviewer.role}) - evaluates engineering ownership, communication, team collaboration, and cultural alignment at mr.technologies.

You MUST return ONLY valid JSON matching this exact structure:
{
  "interview_rounds": [
    {
      "round_name": "Technical Architecture & Concurrency",
      "round_type": "technical",
      "purpose": "Evaluate ${candidate.name}'s capabilities in core engineering, system architecture, and trade-offs for mr.technologies.",
      "interviewers": [
        {
          "interviewer_id": "${panel.technicalPrimary.interviewerId}",
          "name": "${panel.technicalPrimary.name}",
          "role": "${panel.technicalPrimary.role}",
          "voice": "${panel.technicalPrimary.voice}",
          "color": "${panel.technicalPrimary.color}",
          "is_primary": true,
          "agent_uid": 9991,
          "instructions": "You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at mr.technologies leading this panel interview with your co-interviewer ${panel.technicalChallenger.name} (${panel.technicalChallenger.role}). Open the interview by warmly introducing yourself and ${panel.technicalChallenger.name}. Lead the technical architecture discussion. Both you and ${panel.technicalChallenger.name} can hear each other and the candidate in real-time. You can invite ${panel.technicalChallenger.name} to explore specific topics (e.g. '${panel.technicalChallenger.name}, do you want to dig into their scaling design?'). When ${panel.technicalChallenger.name} speaks, listen politely and do not interrupt. When ${panel.technicalChallenger.name} hands back to you, continue smoothly with the next topic. Keep responses concise (1-3 sentences).",
          "greeting_message": "Hello ${candidate.name}, welcome to mr.technologies! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}, and joining me today is ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}. We're excited to learn more about your technical background and architecture today. To get started, could you briefly introduce yourself and walk us through your recent engineering work?"
        },
        {
          "interviewer_id": "${panel.technicalChallenger.interviewerId}",
          "name": "${panel.technicalChallenger.name}",
          "role": "${panel.technicalChallenger.role}",
          "voice": "${panel.technicalChallenger.voice}",
          "color": "${panel.technicalChallenger.color}",
          "is_primary": false,
          "agent_uid": 9992,
          "instructions": "You are ${panel.technicalChallenger.name}, ${panel.technicalChallenger.role} at mr.technologies, co-interviewing with ${panel.technicalPrimary.name} (${panel.technicalPrimary.role}). You can hear both ${panel.technicalPrimary.name} and the candidate. DO NOT speak during the opening greeting—let ${panel.technicalPrimary.name} welcome the candidate. You are the Deep-Dive Specialist. When the candidate explains system architecture, scalability, concurrency, distributed systems, or when ${panel.technicalPrimary.name} invites you, step in naturally: 'Thanks ${panel.technicalPrimary.name}. ${candidate.name}, diving into that...'. Ask 1 sharp follow-up question. After the candidate answers, conclude your follow-up and hand the floor back to ${panel.technicalPrimary.name}: 'Makes sense, back to you ${panel.technicalPrimary.name}.' NEVER speak over ${panel.technicalPrimary.name}. Wait for natural pauses.",
          "greeting_message": ""
        }
      ],
      "interviewer": {
        "name": "${panel.technicalPrimary.name}",
        "role": "${panel.technicalPrimary.role}",
        "instructions": "You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at mr.technologies leading the technical interview. Guide the candidate conversationally through their verified architecture and projects.",
        "greeting_message": "Hello ${candidate.name}, welcome to mr.technologies! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}, and I'm joined by ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}. We're excited to learn more about your technical background today. To get started, could you briefly introduce yourself?"
      },
      "topics": ["Architecture & State", "Concurrency & Throughput", "Scalability Trade-offs"]
    },
    {
      "round_name": "Engineering Leadership & Culture",
      "round_type": "hr",
      "purpose": "Evaluate engineering ownership, cross-functional collaboration, and cultural alignment for mr.technologies.",
      "interviewers": [
        {
          "interviewer_id": "${panel.hrInterviewer.interviewerId}",
          "name": "${panel.hrInterviewer.name}",
          "role": "${panel.hrInterviewer.role}",
          "voice": "${panel.hrInterviewer.voice}",
          "color": "${panel.hrInterviewer.color}",
          "is_primary": true,
          "agent_uid": 9993,
          "instructions": "You are ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at mr.technologies. Explore the candidate's experiences leading engineering initiatives, collaborating with teams, and handling trade-offs.",
          "greeting_message": "Hi ${candidate.name}, great to meet you! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at mr.technologies. Today we'll explore your experiences leading projects, team collaboration, and how you navigate engineering challenges."
        }
      ],
      "interviewer": {
        "name": "${panel.hrInterviewer.name}",
        "role": "${panel.hrInterviewer.role}",
        "instructions": "You are ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at mr.technologies. Explore project ownership and culture.",
        "greeting_message": "Hi ${candidate.name}, great to meet you! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at mr.technologies."
      },
      "topics": ["Engineering Ownership", "Cross-Functional Collaboration", "Conflict Resolution"]
    }
  ],
  "rubric": {
    "Technical Depth": "Evaluates candidate's analytical reasoning and architectural clarity",
    "Scalability & Trade-offs": "Evaluates understanding of concurrency, edge cases, and failure modes",
    "Communication & Ownership": "Evaluates structured technical explanation and culture alignment"
  }
}

CRITICAL RULES FOR FACTUAL GROUNDING & TOPIC RELEVANCE:
- ZERO-ASSUMPTIONS: The AI interviewers must NEVER pretend, assume, or hallucinate that the candidate used tools, frameworks, or cloud providers that are NOT in their verified background.
- DO NOT ASK ABOUT IRRELEVANT RESUME TOPICS: Just because an item appears on the candidate's resume does NOT mean the panel should ask about it. If it does not directly relate to ${job.title}, DO NOT ask about it.
- Respect "ignoredOrLowRelevanceTopics": Never formulate questions around topics flagged as low-relevance.
- Use the provided "interviewContext" (high-relevance evidence, technical interview hooks, projects worth probing) to deeply personalize the questions.
- GitHub and LinkedIn information MUST be used ONLY to personalize questions, build conversational rapport, and guide deep technical discussions.
- STRICT: Evaluation is based strictly on candidate answers during the live interview.`;

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

Generate the personalized multi-agent JSON Interview Blueprint containing Round 1 (Technical with Primary: ${panel.technicalPrimary.name} and Challenger: ${panel.technicalChallenger.name}) and Round 2 (HR with ${panel.hrInterviewer.name}) for ${job.title}.`;

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
      console.warn('[Blueprint Route] Gemini API limit reached. Utilizing personalized deterministic multi-agent fallback:', genErr.message);
      const topProjects = (candidateContext?.interviewContext?.projectsWorthProbing || candidateContext?.githubProjects || []).slice(0, 3).map((p: any) => `'${p.name}'`).join(' and ') || 'your recent technical projects';

      const fallbackBlueprint = {
        interview_rounds: [
          {
            round_name: "Technical Architecture & Concurrency",
            round_type: "technical",
            purpose: `Evaluate ${candidate.name}'s capabilities in technical design, concurrency, and real-world system architecture for ${job.title}.`,
            interviewers: [
              {
                interviewer_id: panel.technicalPrimary.interviewerId,
                name: panel.technicalPrimary.name,
                role: panel.technicalPrimary.role,
                voice: panel.technicalPrimary.voice,
                color: panel.technicalPrimary.color,
                is_primary: true,
                agent_uid: 9991,
                instructions: `You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at mr.technologies leading this panel interview with your co-interviewer ${panel.technicalChallenger.name} (${panel.technicalChallenger.role}). Open the interview by warmly introducing yourself and ${panel.technicalChallenger.name}. Lead the technical architecture discussion on projects like ${topProjects}. You and ${panel.technicalChallenger.name} can hear each other and the candidate in real-time. Invite ${panel.technicalChallenger.name} to probe deep trade-offs when relevant. When ${panel.technicalChallenger.name} speaks, listen politely and do not interrupt. When ${panel.technicalChallenger.name} hands back to you, continue smoothly with the next topic. Keep responses concise (1-3 sentences).`,
                greeting_message: `Hello ${candidate.name}, welcome to mr.technologies! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}, and joining me today is ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}. We've been reviewing your background with ${topProjects}. Today we will explore your technical architecture and problem solving together. To get started, could you briefly introduce yourself?`
              },
              {
                interviewer_id: panel.technicalChallenger.interviewerId,
                name: panel.technicalChallenger.name,
                role: panel.technicalChallenger.role,
                voice: panel.technicalChallenger.voice,
                color: panel.technicalChallenger.color,
                is_primary: false,
                agent_uid: 9992,
                instructions: `You are ${panel.technicalChallenger.name}, ${panel.technicalChallenger.role} at mr.technologies, co-interviewing with ${panel.technicalPrimary.name} (${panel.technicalPrimary.role}). You can hear both ${panel.technicalPrimary.name} and the candidate. DO NOT speak during the opening greeting—let ${panel.technicalPrimary.name} welcome the candidate. You are the Deep-Dive Specialist. When the candidate explains system architecture, scalability, concurrency, distributed systems, or when ${panel.technicalPrimary.name} invites you, step in naturally: 'Thanks ${panel.technicalPrimary.name}. ${candidate.name}, diving into that...'. Ask 1 sharp follow-up question. After the candidate answers, conclude your follow-up and hand the floor back to ${panel.technicalPrimary.name}: 'Makes sense, back to you ${panel.technicalPrimary.name}.' NEVER speak over ${panel.technicalPrimary.name}. Wait for natural pauses.`,
                greeting_message: ""
              }
            ],
            interviewer: {
              name: panel.technicalPrimary.name,
              role: panel.technicalPrimary.role,
              instructions: `Speak naturally and concisely. Ask one question at a time. Explore ${candidate.name}'s technical depth in ${topProjects}.`,
              greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. Let's dive into technical architecture.`
            },
            topics: ["Core Architecture", "Data Structures & Concurrency", "System Scale", "Engineering Trade-offs"]
          },
          {
            round_name: "Engineering Leadership & Culture",
            round_type: "hr",
            purpose: `Evaluate ${candidate.name}'s team collaboration, leadership, communication, and cultural alignment.`,
            interviewers: [
              {
                interviewer_id: panel.hrInterviewer.interviewerId,
                name: panel.hrInterviewer.name,
                role: panel.hrInterviewer.role,
                voice: panel.hrInterviewer.voice,
                color: panel.hrInterviewer.color,
                is_primary: true,
                agent_uid: 9993,
                instructions: `Speak warmly and perceptive. Probe how ${candidate.name} handles team disagreements, engineering ownership, and product velocity. Validate alignment with engineering culture.`,
                greeting_message: `Hi ${candidate.name}, great to meet you! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role}. Today we'll talk about engineering leadership, team collaboration, and how you approach challenges together.`
              }
            ],
            interviewer: {
              name: panel.hrInterviewer.name,
              role: panel.hrInterviewer.role,
              instructions: `Speak warmly and perceptive. Probe engineering ownership and team collaboration.`,
              greeting_message: `Hi ${candidate.name}, great to meet you! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role}.`
            },
            topics: ["Engineering Ownership", "Cross-Functional Collaboration", "Conflict Resolution"]
          }
        ],
        rubric: {
          "Technical Problem Solving": "Evaluates candidate's analytical reasoning and architectural clarity",
          "System Architecture": "Evaluates understanding of concurrency, scalability, and maintainability",
          "Communication & Craft": "Evaluates structured technical explanation and codecraft"
        }
      };
      blueprintJsonText = JSON.stringify(fallbackBlueprint, null, 2);
    }
    
    // Ensure primary interviewer object is synced on all rounds for backwards compatibility
    try {
      const parsed = JSON.parse(blueprintJsonText);
      if (parsed.interview_rounds && Array.isArray(parsed.interview_rounds)) {
        parsed.interview_rounds.forEach((round: any) => {
          if (round.interviewers && round.interviewers.length > 0 && !round.interviewer) {
            round.interviewer = round.interviewers[0];
          }
        });
        blueprintJsonText = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {}

    // Initialize shared interview state
    interview.interviewState = createInitialInterviewState(
      interviewId,
      panel.technicalPrimary,
      panel.technicalChallenger
    );

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
