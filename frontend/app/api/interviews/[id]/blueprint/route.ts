import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, resolveInterview } from '@/lib/db';
import OpenAI from 'openai';
import { getAiClient } from '@/lib/aiClient';
import { selectPanelForJob } from '@/lib/interview/interviewerPool';
import { createInitialInterviewState } from '@/lib/interview/interviewState';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    
    const db = getDb();
    const interview = resolveInterview(db, interviewId);

    const application = db.applications.find(a => a.id === interview.applicationId) || db.applications[db.applications.length - 1] || db.applications[0];
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

    const systemInstruction = `You are an expert AI Interview Orchestrator for Plantra Labs.
Your job is to analyze a Job Description, a Candidate's Resume, and their CandidateContext (from verified LinkedIn/GitHub enrichment), and design a personalized 3-round interview blueprint.

Plantra Labs uses a 3-round interview architecture:
- Round 1 (Coding & System Design Workspace): 1 AI interviewer observing practical problem solving:
  1. Primary Technical Lead: "${panel.technicalPrimary.name}" (${panel.technicalPrimary.role}) - introduces the workspace problem and observes code/diagram development.
- Round 2 (Technical Panel Interview): 2 AI interviewers in the session with strictly coordinated turn-taking:
  1. Primary Technical Interviewer: "${panel.technicalPrimary.name}" (${panel.technicalPrimary.role}) - leads core topic progression, welcomes the candidate, and introduces the panel.
  2. Technical Specialist / Challenger: "${panel.technicalChallenger.name}" (${panel.technicalChallenger.role}) - stays silent during opening; only speaks when handed the floor to probe scalability, trade-offs, and edge cases.
- Round 3 (HR & Culture Round): 1 AI interviewer:
  1. HR / Talent Lead: "${panel.hrInterviewer.name}" (${panel.hrInterviewer.role}) - evaluates engineering ownership, communication, team collaboration, and cultural alignment at Plantra Labs.

You MUST return ONLY valid JSON matching this exact structure:
{
  "interview_rounds": [
    {
      "round_name": "Practical Coding & System Design Assessment",
      "round_type": "coding",
      "coding_problem": {
        "title": "1. High-Throughput Rate Limiter & Event Throttler",
        "description": "Implement a sliding window rate limiter class that tracks incoming user requests and enforces a maximum threshold of requests per sliding window in TypeScript or Python. The implementation must support high concurrency and handle edge cases where multiple requests arrive at identical millisecond timestamps.",
        "constraints": [
          "allowRequest(userId, timestampMs) should run in O(1) or O(log N) average time complexity.",
          "Space complexity should scale with the number of unique active user IDs.",
          "Handle concurrent burst traffic and sliding window cleanup cleanly."
        ]
      },
      "system_design_problem": {
        "title": "Real-time Distributed Event Notification Pipeline",
        "description": "Architect a resilient real-time notification engine capable of processing 100k events/sec with WebSocket push delivery, retry queues, and deduplication."
      },
      "purpose": "Evaluate ${candidate.name}'s practical problem-solving, live coding, and system architecture in an interactive workspace for ${job.title}.",
      "interviewers": [
        {
          "interviewer_id": "${panel.technicalPrimary.interviewerId}",
          "name": "${panel.technicalPrimary.name}",
          "role": "${panel.technicalPrimary.role}",
          "voice": "${panel.technicalPrimary.voice}",
          "color": "${panel.technicalPrimary.color}",
          "is_primary": true,
          "agent_uid": 9991,
          "instructions": "Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}. You are the very first interviewer. Open with a warm, formal welcome thanking them for applying to Plantra Labs and taking the time to meet today. Observe their code/diagram changes as structured work events. Prompt them conversationally to explain their approach, complexity, and trade-offs.",
          "greeting_message": "Hello ${candidate.name}, thank you for applying to Plantra Labs and taking the time to meet with us today! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. In this first round, we will focus on practical problem solving in your interactive workspace. You'll find your assigned problem right in your editor. Take a look, take your time, and walk me through your initial thoughts whenever you're ready!"
        }
      ],
      "interviewer": {
        "name": "${panel.technicalPrimary.name}",
        "role": "${panel.technicalPrimary.role}",
        "instructions": "Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}.",
        "greeting_message": "Hello ${candidate.name}, thank you for applying to Plantra Labs and taking the time to meet with us today! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}."
      },
      "topics": ["Problem Solving", "Algorithm Selection", "System Architecture", "Complexity Trade-offs"]
    },
    {
      "round_name": "Technical Architecture & Concurrency",
      "round_type": "technical",
      "purpose": "Evaluate ${candidate.name}'s capabilities in core engineering, system architecture, and trade-offs for Plantra Labs.",
      "interviewers": [
        {
          "interviewer_id": "${panel.technicalPrimary.interviewerId}",
          "name": "${panel.technicalPrimary.name}",
          "role": "${panel.technicalPrimary.role}",
          "voice": "${panel.technicalPrimary.voice}",
          "color": "${panel.technicalPrimary.color}",
          "is_primary": true,
          "agent_uid": 9991,
          "instructions": "You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at Plantra Labs leading this panel interview with your co-interviewer ${panel.technicalChallenger.name} (${panel.technicalChallenger.role}). You already conducted Round 1 with candidate ${candidate.name}. DO NOT introduce yourself from scratch or say 'welcome to Plantra Labs'. Greet them warmly as a returning candidate ('Nice to see you again!'), introduce ${panel.technicalChallenger.name}, and lead the technical architecture discussion. Both you and ${panel.technicalChallenger.name} can hear each other and the candidate in real-time. Keep responses concise (1-3 sentences).",
          "greeting_message": "Nice to see you again, ${candidate.name}! Hope Round 1 went smoothly. Joining me for this second round is ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}. Together, we're excited to dive into your systems architecture and concurrency experience today. To get started, could you walk us through a recent project you built?"
        },
        {
          "interviewer_id": "${panel.technicalChallenger.interviewerId}",
          "name": "${panel.technicalChallenger.name}",
          "role": "${panel.technicalChallenger.role}",
          "voice": "${panel.technicalChallenger.voice}",
          "color": "${panel.technicalChallenger.color}",
          "is_primary": false,
          "agent_uid": 9992,
          "instructions": "You are ${panel.technicalChallenger.name}, ${panel.technicalChallenger.role} at Plantra Labs, co-interviewing with ${panel.technicalPrimary.name} (${panel.technicalPrimary.role}). You can hear both ${panel.technicalPrimary.name} and the candidate. DO NOT speak during the opening greeting—let ${panel.technicalPrimary.name} welcome the candidate. You are the Deep-Dive Specialist. When the candidate explains system architecture, scalability, concurrency, distributed systems, or when ${panel.technicalPrimary.name} invites you, step in naturally: 'Thanks ${panel.technicalPrimary.name}. ${candidate.name}, diving into that...'. Ask 1 sharp follow-up question. After the candidate answers, conclude your follow-up and hand the floor back to ${panel.technicalPrimary.name}: 'Makes sense, back to you ${panel.technicalPrimary.name}.' NEVER speak over ${panel.technicalPrimary.name}. Wait for natural pauses.",
          "greeting_message": ""
        }
      ],
      "interviewer": {
        "name": "${panel.technicalPrimary.name}",
        "role": "${panel.technicalPrimary.role}",
        "instructions": "You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at Plantra Labs leading the technical interview. Guide the candidate conversationally through their verified architecture and projects.",
        "greeting_message": "Nice to see you again, ${candidate.name}! Hope Round 1 went smoothly. Joining me for this second round is ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}."
      },
      "topics": ["Architecture & State", "Concurrency & Throughput", "Scalability Trade-offs"]
    },
    {
      "round_name": "Engineering Leadership & Culture",
      "round_type": "hr",
      "purpose": "Evaluate engineering ownership, cross-functional collaboration, and cultural alignment for Plantra Labs.",
      "interviewers": [
        {
          "interviewer_id": "${panel.hrInterviewer.interviewerId}",
          "name": "${panel.hrInterviewer.name}",
          "role": "${panel.hrInterviewer.role}",
          "voice": "${panel.hrInterviewer.voice}",
          "color": "${panel.hrInterviewer.color}",
          "is_primary": true,
          "agent_uid": 9993,
          "instructions": "You are ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at Plantra Labs leading Round 3 (HR & Culture). DO NOT ask technical coding, architecture, or algorithm questions. Focus purely on engineering ownership, handling tight deadlines, mentorship, resolving team conflict, and cultural alignment. Ask one question at a time.",
          "greeting_message": "Hi ${candidate.name}, great to meet you! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at Plantra Labs. Today we'll explore your experiences with project ownership, team collaboration, and how you navigate engineering workplace challenges."
        }
      ],
      "interviewer": {
        "name": "${panel.hrInterviewer.name}",
        "role": "${panel.hrInterviewer.role}",
        "instructions": "You are ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at Plantra Labs. Evaluate project ownership, communication, and culture fit without asking technical questions.",
        "greeting_message": "Hi ${candidate.name}, great to meet you! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at Plantra Labs."
      },
      "topics": ["Engineering Ownership & Accountability", "Constructive Conflict Resolution", "Cross-Functional Collaboration", "Culture Fit"]
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

Generate the personalized 3-round JSON Interview Blueprint containing Round 1 (Coding Assessment with ${panel.technicalPrimary.name}), Round 2 (Technical Panel with Primary: ${panel.technicalPrimary.name} and Challenger: ${panel.technicalChallenger.name}), and Round 3 (HR with ${panel.hrInterviewer.name}) for ${job.title}.`;

    const { client: openai, model } = getAiClient();

    let blueprintJsonText = '';
    try {
      let result: any = null;
      let attempts = 0;
      while (attempts < 2) {
        try {
          const response = await openai.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
          });
          result = response.choices[0].message.content || '{}';
          break;
        } catch (e: any) {
          attempts++;
          if (attempts >= 2) throw e;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      blueprintJsonText = result;
      blueprintJsonText = blueprintJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    } catch (genErr: any) {
      console.warn('[Blueprint Route] Gemini API limit reached. Utilizing personalized deterministic multi-agent fallback:', genErr.message);
      const topProjects = (candidateContext?.interviewContext?.projectsWorthProbing || candidateContext?.githubProjects || []).slice(0, 3).map((p: any) => `'${p.name}'`).join(' and ') || 'your recent technical projects';

      const fallbackBlueprint = {
        interview_rounds: [
          {
            round_name: "Practical Coding & System Design Assessment",
            round_type: "coding",
            coding_problem: {
              title: "1. High-Throughput Rate Limiter & Event Throttler",
              description: "Implement a sliding window rate limiter class that tracks incoming user requests and enforces a maximum threshold of requests per sliding window in TypeScript or Python. The implementation must support high concurrency and handle edge cases where multiple requests arrive at identical millisecond timestamps.",
              constraints: [
                "allowRequest(userId, timestampMs) should run in O(1) or O(log N) average time complexity.",
                "Space complexity should scale with the number of unique active user IDs.",
                "Handle concurrent burst traffic and sliding window cleanup cleanly."
              ]
            },
            system_design_problem: {
              title: "Real-time Distributed Event Notification Pipeline",
              description: "Architect a resilient real-time notification engine capable of processing 100k events/sec with WebSocket push delivery, retry queues, and deduplication."
            },
            purpose: `Evaluate ${candidate.name}'s practical problem-solving, live coding, and system architecture in an interactive workspace for ${job.title}.`,
            interviewers: [
              {
                interviewer_id: panel.technicalPrimary.interviewerId,
                name: panel.technicalPrimary.name,
                role: panel.technicalPrimary.role,
                voice: panel.technicalPrimary.voice,
                color: panel.technicalPrimary.color,
                is_primary: true,
                agent_uid: 9991,
                instructions: `Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}. You are the very first interviewer. Open with a warm, formal welcome thanking them for applying to Plantra Labs and taking the time to meet today. Observe their code/diagram changes as structured work events. Prompt them conversationally to explain their approach, complexity, and trade-offs in ${topProjects}.`,
                greeting_message: `Hello ${candidate.name}, thank you for applying to Plantra Labs and taking the time to meet with us today! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. In this first round, we will focus on practical problem solving in your interactive workspace. You'll find your assigned problem right in your editor. Take a look, take your time, and walk me through your initial thoughts whenever you're ready!`
              }
            ],
            interviewer: {
              name: panel.technicalPrimary.name,
              role: panel.technicalPrimary.role,
              instructions: `Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}.`,
              greeting_message: `Hello ${candidate.name}, thank you for applying to Plantra Labs and taking the time to meet with us today! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}.`
            },
            topics: ["Problem Solving", "Algorithm Selection", "System Architecture", "Complexity Trade-offs"]
          },
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
                instructions: `You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at Plantra Labs leading this panel interview with your co-interviewer ${panel.technicalChallenger.name} (${panel.technicalChallenger.role}). You already conducted Round 1 with candidate ${candidate.name}. DO NOT introduce yourself from scratch or say 'welcome to Plantra Labs'. Greet them warmly as a returning candidate ('Nice to see you again!'), introduce ${panel.technicalChallenger.name}, and lead the technical architecture discussion on projects like ${topProjects}. You and ${panel.technicalChallenger.name} can hear each other and the candidate in real-time. Invite ${panel.technicalChallenger.name} to probe deep trade-offs when relevant. When ${panel.technicalChallenger.name} speaks, listen politely and do not interrupt. When ${panel.technicalChallenger.name} hands back to you, continue smoothly with the next topic. Keep responses concise (1-3 sentences).`,
                greeting_message: `Nice to see you again, ${candidate.name}! Hope Round 1 went smoothly. Joining me for this second round is ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}. We've been reviewing your background with ${topProjects}. Together, we're excited to explore your technical architecture and problem solving. To get started, could you walk us through a recent project you built?`
              },
              {
                interviewer_id: panel.technicalChallenger.interviewerId,
                name: panel.technicalChallenger.name,
                role: panel.technicalChallenger.role,
                voice: panel.technicalChallenger.voice,
                color: panel.technicalChallenger.color,
                is_primary: false,
                agent_uid: 9992,
                instructions: `You are ${panel.technicalChallenger.name}, ${panel.technicalChallenger.role} at Plantra Labs, co-interviewing with ${panel.technicalPrimary.name} (${panel.technicalPrimary.role}). You can hear both ${panel.technicalPrimary.name} and the candidate. DO NOT speak during the opening greeting—let ${panel.technicalPrimary.name} welcome the candidate. You are the Deep-Dive Specialist. When the candidate explains system architecture, scalability, concurrency, distributed systems, or when ${panel.technicalPrimary.name} invites you, step in naturally: 'Thanks ${panel.technicalPrimary.name}. ${candidate.name}, diving into that...'. Ask 1 sharp follow-up question. After the candidate answers, conclude your follow-up and hand the floor back to ${panel.technicalPrimary.name}: 'Makes sense, back to you ${panel.technicalPrimary.name}.' NEVER speak over ${panel.technicalPrimary.name}. Wait for natural pauses.`,
                greeting_message: ""
              }
            ],
            interviewer: {
              name: panel.technicalPrimary.name,
              role: panel.technicalPrimary.role,
              instructions: `Speak naturally and concisely. Ask one question at a time. Explore ${candidate.name}'s technical depth in ${topProjects}.`,
              greeting_message: `Nice to see you again, ${candidate.name}! Hope Round 1 went smoothly. Joining me for this second round is ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}.`
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
