import React from 'react';
import { getDb, resolveInterview } from '@/lib/db';
import InterviewRoom from '../interview/[blueprintId]/InterviewRoom';
import { selectPanelForJob } from '@/lib/interview/interviewerPool';

export default async function InterviewTestPage() {
  const db = getDb();
  
  // Find latest application or fallback candidate
  const application = db.applications[db.applications.length - 1] || db.applications[0];
  const candidate = db.candidates.find(c => c.id === application?.candidateId) || db.candidates[0];
  const job = db.jobs.find(j => j.id === application?.jobId) || db.jobs[0];

  const interview = resolveInterview(db, 'demo-interview-test');
  if (application && interview.applicationId !== application.id) {
    interview.applicationId = application.id;
  }

  const panel = selectPanelForJob(job?.title || 'Senior Software Engineer');
  const candidateContext = application?.candidateContext || candidate?.candidateContext;
  const candidateName = candidate?.name || 'Alex Rivera';

  // Build 3-Round Blueprint with Round 1 Coding/System Design & Round 2 Multi-Agent Technical Panel
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
            instructions: `You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at Plantra Labs. Lead Round 1 (Practical Workspace Assessment) with candidate ${candidateName}. Observe their code/diagram changes as structured work events. Prompt them conversationally to explain their approach, complexity, and trade-offs.`,
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
            instructions: `You are ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role} at Plantra Labs leading this panel interview with your co-interviewer ${panel.technicalChallenger.name} (${panel.technicalChallenger.role}). Open the interview by warmly introducing yourself and ${panel.technicalChallenger.name}. Lead the technical architecture discussion with ${candidateName}. Both you and ${panel.technicalChallenger.name} can hear each other and the candidate in real-time. Keep responses concise.`,
            greeting_message: `Welcome to Round 2, ${candidateName}. I'm ${panel.technicalPrimary.name}, ${panel.technicalPrimary.role}, joined today by ${panel.technicalChallenger.name}, our ${panel.technicalChallenger.role}. Let's dive into distributed systems and concurrency.`
          },
          {
            interviewer_id: panel.technicalChallenger.interviewerId,
            name: panel.technicalChallenger.name,
            role: panel.technicalChallenger.role,
            voice: panel.technicalChallenger.voice,
            color: panel.technicalChallenger.color,
            is_primary: false,
            agent_uid: 9992,
            instructions: `You are ${panel.technicalChallenger.name}, ${panel.technicalChallenger.role} at Plantra Labs, co-interviewing with ${panel.technicalPrimary.name}. You are the Deep-Dive Specialist. When candidate explains system architecture, scalability, or concurrency, probe failure modes and edge cases.`,
            greeting_message: ""
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
        purpose: "Evaluate technical ownership, constructive collaboration, incident retrospectives, and culture fit.",
        interviewers: [
          {
            interviewer_id: panel.hrInterviewer.interviewerId,
            name: panel.hrInterviewer.name,
            role: panel.hrInterviewer.role,
            voice: panel.hrInterviewer.voice,
            color: panel.hrInterviewer.color,
            is_primary: true,
            agent_uid: 9993,
            instructions: `You are ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role} at Plantra Labs.
You are leading Round 3 (HR, Culture & Leadership) with ${candidateName}.
IMPORTANT RULES:
- This is strictly an HR and behavioral evaluation. All technical rounds are completed.
- Do NOT ask technical coding, system design, algorithm, or low-level architectural questions.
- Probe engineering ownership, handling tight deadlines, constructive conflict resolution with teammates, mentorship, and career motivation.
- Ask one thoughtful behavioral question at a time and listen attentively. Keep turns concise (1-3 sentences).`,
            greeting_message: `Hi ${candidateName}, welcome to Round 3! I'm ${panel.hrInterviewer.name}, ${panel.hrInterviewer.role}. In this final section, we'll explore your experiences leading projects, team collaboration, and how you navigate engineering challenges.`
          }
        ],
        interviewer: {
          name: panel.hrInterviewer.name,
          role: panel.hrInterviewer.role,
          instructions: `Evaluate communication, ownership, and culture fit. Do not ask technical questions.`,
          greeting_message: `Hi ${candidateName}, welcome to Round 3!`
        },
        topics: ["Ownership & Accountability", "Constructive Conflict Resolution", "Cross-Functional Collaboration", "Culture Fit"]
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
        interviewId={interview.id}
        candidateName={candidateName}
        jobTitle={job?.title || 'Senior Software Engineer'}
        candidateContext={candidateContext}
        resumeText={application?.resumeText}
      />
    </div>
  );
}
