import React from 'react';
import { getDb, saveDb } from '@/lib/db';
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

  let interview = blueprint 
    ? db.interviews.find(i => i.id === blueprint?.interviewId)
    : db.interviews.find(i => i.id === targetId);

  if (!interview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 pt-20">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Interview Session Not Found</h2>
          <p className="text-gray-500 text-sm">Please check your invitation link or contact your recruiter.</p>
        </div>
      </div>
    );
  }

  const application = db.applications.find(a => a.id === interview.applicationId);
  const candidate = db.candidates.find(c => c.id === application?.candidateId);
  const job = db.jobs.find(j => j.id === application?.jobId);

  if (!application || !candidate || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 pt-20">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md shadow-sm">
          <h2 className="text-xl font-bold text-red-600 mb-2">Session Integrity Error</h2>
          <p className="text-gray-500 text-sm">Candidate or position records could not be resolved.</p>
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
              greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. Today, my colleague ${panel.technicalChallenger.name} and I will explore your system architecture and codecraft. Let's dive in.`
            },
            {
              interviewer_id: panel.technicalChallenger.interviewerId,
              name: panel.technicalChallenger.name,
              role: panel.technicalChallenger.role,
              voice: panel.technicalChallenger.voice,
              color: panel.technicalChallenger.color,
              is_primary: false,
              agent_uid: 9992,
              instructions: `You are ${panel.technicalChallenger.name}, ${panel.technicalChallenger.role}. Challenge architectural trade-offs, probe scalability bottlenecks, evaluate latency budgets, and ask about edge cases and failure modes.`,
              greeting_message: `Hi ${candidate.name}, I'm ${panel.technicalChallenger.name}, ${panel.technicalChallenger.role}. I'll be focusing on system design trade-offs, scalability boundaries, and failure modes with you today.`
            }
          ],
          interviewer: {
            name: panel.technicalPrimary.name,
            role: panel.technicalPrimary.role,
            instructions: `Speak naturally and concisely with ${candidate.name}. Explore their codecraft and system design depth in ${topProjects}.`,
            greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. Let's dive into technical architecture.`
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
        "Technical Depth": "Evaluates codecraft and architecture",
        "System Scale": "Evaluates distributed systems concepts",
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
  } catch (e) {
    return <div className="p-10 text-center text-red-500 font-bold">Failed to parse blueprint JSON.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <header className="bg-white border-b border-gray-200 shadow-2xs py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            E
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">EchoSphere Interview</h1>
            <p className="text-xs text-gray-500">{job.title}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-gray-900">{candidate.name}</div>
          <div className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Lobby Ready
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
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
