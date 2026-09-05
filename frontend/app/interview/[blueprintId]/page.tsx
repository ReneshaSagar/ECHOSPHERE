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
      <div className="min-h-screen bg-[#030304] flex items-center justify-center p-6 pt-20">
        <div className="bg-[#0a0a0d] p-8 rounded-3xl border border-white/[0.08] text-center max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-center mx-auto mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Interview Session Not Found</h2>
          <p className="text-white/50 text-xs leading-relaxed">Please check your invitation link or contact your talent recruiter.</p>
        </div>
      </div>
    );
  }

  const application = db.applications.find(a => a.id === interview.applicationId);
  const candidate = db.candidates.find(c => c.id === application?.candidateId);
  const job = db.jobs.find(j => j.id === application?.jobId);

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
              greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}, and joining me is ${panel.technicalChallenger.name}. To kick things off, could you briefly introduce yourself and walk us through a recent project you built?`
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
            greeting_message: `Hello ${candidate.name}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. To kick things off, could you introduce yourself and tell us about your recent work?`
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
    return <div className="p-10 text-center text-rose-400 font-mono">Failed to parse blueprint JSON.</div>;
  }

  return (
    <div className="min-h-screen bg-[#030304] text-[#f5f5f7] flex flex-col pt-16 font-sans">
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#030304]/80 backdrop-blur-xl border-b border-white/[0.06] py-3.5 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-sans font-bold text-white tracking-tight">nexora labs</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-white/70 border border-white/[0.08] hidden sm:inline">
                omnipanel
              </span>
            </div>
            <p className="text-xs font-mono text-white/40">{job.title}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs sm:text-sm font-sans font-bold text-white">{candidate.name}</div>
          <div className="text-xs font-mono text-emerald-400 flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>session ready</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col relative z-10">
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
