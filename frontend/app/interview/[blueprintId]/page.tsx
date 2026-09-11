import React from 'react';
import { getDb, saveDb, resolveInterview } from '@/lib/db';
import { selectPanelForJob } from '@/lib/interview/interviewerPool';
import { createInitialInterviewState } from '@/lib/interview/interviewState';
import InterviewLobbyWrapper from './InterviewLobbyWrapper';

export default async function InterviewPage({ params }: { params: Promise<{ blueprintId: string }> }) {
  const resolvedParams = await params;
  const targetId = resolvedParams.blueprintId;
  const db = getDb();
  
  // Find blueprint or interview by ID
  let blueprint = db.blueprints.find(b => 
    b.id === targetId || 
    b.interviewId === targetId
  );

  let interview = resolveInterview(db, blueprint?.interviewId || targetId);

  const application = db.applications.find(a => a.id === interview.applicationId) || db.applications[db.applications.length - 1] || db.applications[0];
  const candidate = db.candidates.find(c => c.id === application?.candidateId) || db.candidates[0];
  const job = db.jobs.find(j => j.id === application?.jobId) || db.jobs[0];

  if (!application || !candidate || !job) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center p-6 pt-20">
        <div className="bg-[#0a0a0d] p-8 rounded-3xl border border-rose-500/30 text-center max-w-md shadow-[0_0_50px_rgba(244,63,94,0.15)]">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-center mx-auto mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-rose-400 mb-2 tracking-tight">Session Integrity Error</h2>
          <p className="text-white/50 text-xs leading-relaxed">Candidate or requisition records could not be resolved in the database.</p>
        </div>
      </div>
    );
  }

  // If blueprint doesn't exist yet, generate default on the fly
  if (!blueprint) {
    const panel = selectPanelForJob(job.title);
    const candidateContext = application.candidateContext || candidate.candidateContext;
    const topProjects = (candidateContext?.interviewContext?.projectsWorthProbing || candidateContext?.githubProjects || []).slice(0, 3).map((p: any) => `'${p.name}'`).join(' and ') || 'your recent technical projects';

    const defaultBp = {
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
          purpose: `Evaluate ${candidate.name}'s capabilities in core engineering, concurrency, and real-world system architecture for ${job.title}.`,
          interviewers: [
            {
              interviewer_id: panel.technicalPrimary.interviewerId,
              name: panel.technicalPrimary.name,
              role: panel.technicalPrimary.role,
              voice: panel.technicalPrimary.voice,
              color: panel.technicalPrimary.color,
              is_primary: true,
              agent_uid: 9991,
              instructions: `You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at Plantra Labs leading this panel interview with your co-interviewer ${panel.technicalChallenger.name} (${panel.technicalChallenger.role}). You already conducted Round 1 with candidate ${candidate.name}. DO NOT introduce yourself from scratch or say 'welcome to Plantra Labs'. Greet them warmly as a returning candidate ('Nice to see you again!'), introduce ${panel.technicalChallenger.name}, and lead the technical architecture discussion. Both you and ${panel.technicalChallenger.name} can hear each other and the candidate in real-time. Keep responses concise (1-3 sentences).`,
              greeting_message: `Nice to see you again, ${candidate.name}! Hope Round 1 went smoothly. Joining me for this second round is ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}. Together, we're excited to dive into your systems architecture and concurrency experience today. To get started, could you walk us through a recent project you built?`
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
            instructions: `Speak naturally and concisely with ${candidate.name}. Explore their codecraft and system design depth in ${topProjects}.`,
            greeting_message: `Nice to see you again, ${candidate.name}! Hope Round 1 went smoothly. Joining me for this second round is ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}.`
          },
          topics: ["Core Architecture", "Data Structures", "System Scale", "Engineering Trade-offs"]
        },
        {
          round_name: "Engineering Leadership & Culture",
          round_type: "hr",
          purpose: `Evaluate ${candidate.name}'s collaboration, ownership, and technical communication`,
          interviewers: [
            {
              interviewer_id: panel.hrInterviewer.interviewerId,
              name: panel.hrInterviewer.name,
              role: panel.hrInterviewer.role,
              voice: panel.hrInterviewer.voice,
              color: panel.hrInterviewer.color,
              is_primary: true,
              agent_uid: 9993,
              instructions: `Evaluate communication, ownership, and engineering culture.`,
              greeting_message: `Hi ${candidate.name}, great to meet you! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role}. Today we will discuss team collaboration, problem solving, and technical ownership.`
            }
          ],
          interviewer: {
            name: panel.hrInterviewer.name,
            role: panel.hrInterviewer.role,
            instructions: `Evaluate communication, ownership, and engineering culture.`,
            greeting_message: `Hi ${candidate.name}, great to meet you! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role}.`
          },
          topics: ["Ownership", "Collaboration", "Conflict Resolution"]
        }
      ],
      rubric: {
        "Problem Solving": "Evaluates algorithm choice and workspace progress",
        "System Architecture": "Evaluates component selection and trade-off reasoning",
        "Technical Depth": "Evaluates codecraft and architecture",
        "Communication": "Evaluates clarity and structured thought"
      }
    };

    if (!interview.interviewState) {
      interview.interviewState = createInitialInterviewState(
        interview.id,
        panel.technicalPrimary,
        panel.technicalChallenger
      );
    }

    blueprint = {
      id: `bp_${Math.random().toString(36).substring(2, 9)}`,
      interviewId: interview.id,
      blueprintJson: JSON.stringify(defaultBp, null, 2)
    };
    db.blueprints.push(blueprint);
    saveDb(db);
  }

  // Parse the blueprint JSON to pass to the client
  let parsedBlueprint;
  try {
    parsedBlueprint = JSON.parse(blueprint.blueprintJson);
    // Normalize legacy blueprints so Round 1 is always Practical Coding & System Design Assessment
    if (parsedBlueprint && Array.isArray(parsedBlueprint.interview_rounds)) {
      const hasCodingRound = parsedBlueprint.interview_rounds.some((r: any) => r.round_type === 'coding' || r.round_type === 'system_design');
      if (!hasCodingRound) {
        const panel = selectPanelForJob(job.title);
        const codingRound = {
          round_name: "Practical Coding & System Design Assessment",
          round_type: "coding",
          coding_problem: {
            title: "1. High-Throughput Rate Limiter & Event Throttler",
            difficulty: "Medium",
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
              instructions: `Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}. You are the very first interviewer. Open with a warm, formal welcome thanking them for applying to Plantra Labs and taking the time to meet today. Observe their code/diagram changes as structured work events. Prompt them conversationally to explain their approach, complexity, and trade-offs.`,
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
        };
        parsedBlueprint.interview_rounds.unshift(codingRound);
      }

      // Ensure panel integrity across all loaded rounds
      const panel = selectPanelForJob(job.title);
      const r1 = parsedBlueprint.interview_rounds[0];
      const r2 = parsedBlueprint.interview_rounds[1];

      // Round 1 warm welcome normalization
      if (r1) {
        const r1Interviewer = r1.interviewers?.[0] || r1.interviewer;
        if (r1Interviewer && (!r1Interviewer.greeting_message || r1Interviewer.greeting_message.includes("welcome! I'm") || !r1Interviewer.greeting_message.toLowerCase().includes('thank you for applying'))) {
          const warmR1Greeting = `Hello ${candidate.name}, thank you for applying to Plantra Labs and taking the time to meet with us today! I'm ${r1Interviewer.name}, ${r1Interviewer.role}. In this first round, we will focus on practical problem solving in your interactive workspace. You'll find your assigned problem right in your editor. Take a look, take your time, and walk me through your initial thoughts whenever you're ready!`;
          if (r1.interviewers?.[0]) r1.interviewers[0].greeting_message = warmR1Greeting;
          if (r1.interviewer) r1.interviewer.greeting_message = warmR1Greeting;
        }
      }

      // Round 2 dual-interviewer and returning continuity normalization
      if (r2) {
        if (!r2.interviewers || r2.interviewers.length < 2) {
          r2.interviewers = [
            r2.interviewers?.[0] || r2.interviewer || {
              interviewer_id: panel.technicalPrimary.interviewerId,
              name: panel.technicalPrimary.name,
              role: panel.technicalPrimary.role,
              voice: panel.technicalPrimary.voice,
              color: panel.technicalPrimary.color,
              is_primary: true,
              agent_uid: 9991
            },
            {
              interviewer_id: panel.technicalChallenger.interviewerId,
              name: panel.technicalChallenger.name,
              role: panel.technicalChallenger.role,
              voice: panel.technicalChallenger.voice,
              color: panel.technicalChallenger.color,
              is_primary: false,
              agent_uid: 9992,
              instructions: `You are ${panel.technicalChallenger.name}, ${panel.technicalChallenger.role} at Plantra Labs, co-interviewing with ${panel.technicalPrimary.name} (${panel.technicalPrimary.role}). You can hear both ${panel.technicalPrimary.name} and the candidate. DO NOT speak during the opening greeting—let ${panel.technicalPrimary.name} welcome the candidate. You are the Deep-Dive Specialist. When the candidate explains system architecture, scalability, concurrency, distributed systems, or when ${panel.technicalPrimary.name} invites you, step in naturally.`,
              greeting_message: ""
            }
          ];
        }

        const r1InterviewerName = (r1?.interviewers?.[0]?.name || r1?.interviewer?.name || '').trim().toLowerCase();
        const r2Primary = r2.interviewers[0];
        const r2PrimaryName = (r2Primary?.name || '').trim().toLowerCase();
        const challenger = r2.interviewers[1] || panel.technicalChallenger;

        // If Round 1 and Round 2 share the same interviewer, enforce returning continuity greeting
        if (r1InterviewerName && r2PrimaryName && (r1InterviewerName === r2PrimaryName || r1InterviewerName.includes(r2PrimaryName) || r2PrimaryName.includes(r1InterviewerName))) {
          const returningGreeting = `Nice to see you again, ${candidate.name}! Hope Round 1 went smoothly. Joining me for this second round is ${challenger.name}, our ${challenger.role}. Together, we're excited to dive into your systems architecture and concurrency experience today. To get started, could you walk us through a recent project you built?`;
          r2Primary.greeting_message = returningGreeting;
          if (r2.interviewer) r2.interviewer.greeting_message = returningGreeting;
          r2Primary.instructions = `You are ${r2Primary.name}, ${r2Primary.role} at Plantra Labs leading this panel interview with your co-interviewer ${challenger.name} (${challenger.role}). You already conducted Round 1 with candidate ${candidate.name}. DO NOT introduce yourself from scratch or say 'welcome to Plantra Labs'. Greet them warmly as a returning candidate ('Nice to see you again!'), introduce ${challenger.name}, and lead the technical architecture discussion. Both you and ${challenger.name} can hear each other and the candidate in real-time. Keep responses concise (1-3 sentences).`;
        }
      }
    }
  } catch (e) {
    return <div className="p-10 text-center text-rose-400 font-mono">Failed to parse blueprint JSON.</div>;
  }

    const candidateInitials = candidate.name
    ? candidate.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'C';

  return (
    <div className="h-screen bg-[#030304] text-[#f4f4f5] flex flex-col font-sans selection:bg-purple-500/30 selection:text-white">
      <header className="sticky top-0 z-40 bg-[#030304]/80 backdrop-blur-xl border-b border-white/[0.06] py-3.5 px-6 sm:px-8 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium tracking-tight font-sans lowercase text-white">
              plantra
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></span>
          </div>

          <span className="text-white/20 font-light hidden sm:inline">/</span>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-white/90">Meet</span>
            <span className="text-white/20 font-light">·</span>
            <span className="text-xs font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-0.5 rounded-md truncate max-w-xs md:max-w-md">
              {job.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-medium text-white">{candidate.name}</div>
            <div className="text-[11px] font-mono text-emerald-400 flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Session Ready</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-xs font-mono font-medium text-white/80">
            {candidateInitials}
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col overflow-y-auto relative z-10">
        <InterviewLobbyWrapper 
          blueprint={parsedBlueprint} 
          interviewId={interview.id} 
          scheduledAt={interview.scheduledAt}
          candidateName={candidate.name} 
          jobTitle={job.title}
          candidateContext={application.candidateContext || candidate.candidateContext}
          resumeText={application.resumeText}
          mcpServerUrl={job?.mcpServerUrl}
        />
      </main>
    </div>
  );
}
