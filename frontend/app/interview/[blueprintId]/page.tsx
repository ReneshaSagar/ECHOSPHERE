import React from 'react';
import { getDb, saveDb } from '@/lib/db';
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
    ? db.interviews.find(i => i.id === blueprint.interviewId)
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
    const defaultBp = {
      interview_rounds: [
        {
          round_name: "Technical Architecture & Concurrency",
          purpose: "Evaluate core technical architecture and systems thinking",
          interviewer: {
            name: "Alex",
            role: "Technical Lead",
            instructions: `Speak naturally and concisely with ${candidate.name}. Explore their codecraft and system design depth.`,
            greeting_message: `Hello ${candidate.name}, welcome! I have reviewed your background for the ${job.title} position. Today we will explore your technical architecture and problem-solving skills. Let's dive in.`
          },
          topics: ["Core Architecture", "Data Structures", "System Scale"]
        },
        {
          round_name: "Distributed System Design",
          purpose: "Evaluate system scalability, reliability, and trade-offs",
          interviewer: {
            name: "Alex",
            role: "System Architect Lead",
            instructions: `Discuss scaling, caching, and resiliency.`,
            greeting_message: `Hi ${candidate.name}, welcome to the System Design round. Let's discuss how you approach scaling systems and managing concurrency.`
          },
          topics: ["Scalability", "Caching", "Concurrency"]
        },
        {
          round_name: "Engineering Leadership & Culture",
          purpose: "Evaluate collaboration, ownership, and technical communication",
          interviewer: {
            name: "Alex",
            role: "Engineering Director",
            instructions: `Evaluate communication, ownership, and engineering culture.`,
            greeting_message: `Hi ${candidate.name}, great to meet you. Today we will discuss team collaboration, problem solving, and technical ownership.`
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
