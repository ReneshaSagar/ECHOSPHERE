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
              instructions: `Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}. Observe their code/diagram changes as structured work events. Prompt them conversationally to explain their approach, complexity, and trade-offs in ${topProjects}.`,
              greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. In this first round, we will evaluate your practical problem-solving. You can choose between the Coding editor or System Design canvas in your workspace. Take a look at the problem and walk me through your initial thoughts!`
            }
          ],
          interviewer: {
            name: panel.technicalPrimary.name,
            role: panel.technicalPrimary.role,
            instructions: `Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}.`,
            greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}.`
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
              instructions: `Speak naturally and concisely with ${candidate.name}. Explore their codecraft and system design depth in ${topProjects}.`,
              greeting_message: `Welcome to Round 2, ${candidate.name}! In this round, we'll dive deeper into high-scale distributed systems and concurrency.`
            }
          ],
          interviewer: {
            name: panel.technicalPrimary.name,
            role: panel.technicalPrimary.role,
            instructions: `Speak naturally and concisely with ${candidate.name}. Explore their codecraft and system design depth in ${topProjects}.`,
            greeting_message: `Welcome to Round 2, ${candidate.name}!`
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
              instructions: `Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}. Observe their code/diagram changes as structured work events. Prompt them conversationally to explain their approach, complexity, and trade-offs.`,
              greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. In this first round, we will evaluate your practical problem-solving in our interactive workspace. Take a look at the problem in your workspace editor and walk me through your initial thoughts!`
            }
          ],
          interviewer: {
            name: panel.technicalPrimary.name,
            role: panel.technicalPrimary.role,
            instructions: `Lead Round 1 (Practical Workspace Assessment) with candidate ${candidate.name}.`,
            greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}.`
          },
          topics: ["Problem Solving", "Algorithm Selection", "System Architecture", "Complexity Trade-offs"]
        };
        parsedBlueprint.interview_rounds.unshift(codingRound);
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
