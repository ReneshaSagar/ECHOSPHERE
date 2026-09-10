import React from 'react';
import { getDb } from '@/lib/db';
import InterviewRoom from '../interview/[blueprintId]/InterviewRoom';
import { selectPanelForJob } from '@/lib/interview/interviewerPool';

export default async function InterviewTestPage() {
  const db = getDb();
  
  // Find latest application or fallback candidate
  const application = db.applications[db.applications.length - 1] || db.applications[0];
  const candidate = db.candidates.find(c => c.id === application?.candidateId) || db.candidates[0];
  const job = db.jobs.find(j => j.id === application?.jobId) || db.jobs[0];

  const panel = selectPanelForJob(job?.title || 'Senior Software Engineer');
  const candidateContext = application?.candidateContext || candidate?.candidateContext;
  const candidateName = candidate?.name || 'Madhav Gairola';

  // Build 3-Round Blueprint with Round 1 Coding/System Design
  const testBlueprint = {
    interview_rounds: [
      {
        round_name: "Round 1: Practical Coding & System Design Assessment",
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
        purpose: "Evaluate problem solving, data structure choice, implementation correctness, and architecture design in real-time.",
        interviewers: [
          {
            interviewer_id: panel.technicalPrimary.interviewerId,
            name: panel.technicalPrimary.name,
            role: panel.technicalPrimary.role,
            voice: panel.technicalPrimary.voice,
            color: panel.technicalPrimary.color,
            is_primary: true,
            agent_uid: 9991,
            instructions: `You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at Nexora Labs. Lead Round 1 (Practical Workspace Assessment) with candidate ${candidateName}. Observe their code/diagram changes as structured work events. Prompt them conversationally to explain their approach, complexity, and trade-offs.`,
            greeting_message: `Hello ${candidateName}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}. In this first round, we will evaluate your practical problem-solving. You can choose between the Coding editor or System Design canvas in your workspace. Take a look at the problem and walk me through your initial thoughts!`
          }
        ],
        interviewer: {
          name: panel.technicalPrimary.name,
          role: panel.technicalPrimary.role,
          instructions: `Lead Round 1 (Practical Workspace Assessment) with candidate ${candidateName}.`,
          greeting_message: `Hello ${candidateName}, welcome! I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}.`
        },
        topics: ["Problem Solving", "Algorithm Selection", "System Architecture", "Complexity Trade-offs"]
      },
      {
        round_name: "Round 2: Technical Architecture & Concurrency",
        round_type: "technical",
        purpose: "Evaluate core distributed systems design, concurrency, and scaling trade-offs.",
        interviewers: [
          {
            interviewer_id: panel.technicalPrimary.interviewerId,
            name: panel.technicalPrimary.name,
            role: panel.technicalPrimary.role,
            voice: panel.technicalPrimary.voice,
            color: panel.technicalPrimary.color,
            is_primary: true,
            agent_uid: 9991,
            instructions: `Lead technical architecture discussion with ${candidateName}.`,
            greeting_message: `Welcome to Round 2, ${candidateName}. Let's dive deeper into distributed systems and concurrency.`
          }
        ],
        interviewer: {
          name: panel.technicalPrimary.name,
          role: panel.technicalPrimary.role,
          instructions: `Lead technical architecture discussion.`,
          greeting_message: `Welcome to Round 2.`
        },
        topics: ["Distributed Systems", "Concurrency", "High Throughput"]
      },
      {
        round_name: "Round 3: Engineering Leadership & Culture",
        round_type: "hr",
        purpose: "Evaluate technical ownership, communication, and culture fit.",
        interviewers: [
          {
            interviewer_id: panel.hrInterviewer.interviewerId,
            name: panel.hrInterviewer.name,
            role: panel.hrInterviewer.role,
            voice: panel.hrInterviewer.voice,
            color: panel.hrInterviewer.color,
            is_primary: true,
            agent_uid: 9993,
            instructions: `Evaluate communication and culture fit with ${candidateName}.`,
            greeting_message: `Hi ${candidateName}, welcome to Round 3! Let's explore your engineering leadership and collaboration experiences.`
          }
        ],
        interviewer: {
          name: panel.hrInterviewer.name,
          role: panel.hrInterviewer.role,
          instructions: `Evaluate communication and culture fit.`,
          greeting_message: `Hi ${candidateName}, welcome to Round 3!`
        },
        topics: ["Ownership", "Collaboration", "Conflict Resolution"]
      }
    ],
    rubric: {
      "Problem Solving": "Evaluates algorithm choice and workspace progress",
      "System Architecture": "Evaluates component selection and trade-off reasoning",
      "Technical Communication": "Evaluates clarity during real-time coding/design"
    }
  };

  return (
    <div className="w-screen h-screen bg-[#202124] overflow-hidden">
      <InterviewRoom
        blueprint={testBlueprint as any}
        interviewId={application?.id || 'demo-interview-test'}
        candidateName={candidateName}
        jobTitle={job?.title || 'Senior Software Engineer'}
        candidateContext={candidateContext}
        resumeText={application?.resumeText}
      />
    </div>
  );
}
