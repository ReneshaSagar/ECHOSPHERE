import React from 'react';
import { getDb } from '@/lib/db';
import ScheduleClient, { InterviewScheduleItem } from './ScheduleClient';

export default async function AdminSchedulePage() {
  const db = getDb();

  const formattedInterviews: InterviewScheduleItem[] = db.interviews.map(interview => {
    const app = db.applications.find(a => a.id === interview.applicationId);
    const candidate = db.candidates.find(c => c.id === app?.candidateId);
    const job = db.jobs.find(j => j.id === app?.jobId);
    const blueprint = db.blueprints.find(b => b.interviewId === interview.id);

    let roundsCount = 0;
    if (blueprint?.blueprintJson) {
      try {
        const parsed = JSON.parse(blueprint.blueprintJson);
        roundsCount = parsed.interview_rounds?.length || 0;
      } catch (e) {
        roundsCount = 3;
      }
    }

    return {
      id: interview.id,
      applicationId: interview.applicationId,
      scheduledAt: interview.scheduledAt,
      status: interview.status,
      candidate: {
        id: candidate?.id || '',
        name: candidate?.name || 'Unknown Candidate',
        email: candidate?.email || 'N/A',
        linkedinUrl: candidate?.linkedinUrl,
        githubUrl: candidate?.githubUrl
      },
      job: {
        id: job?.id || '',
        title: job?.title || 'General Engineering Role'
      },
      blueprint: blueprint ? {
        id: blueprint.id,
        roundsCount
      } : undefined
    };
  });

  return <ScheduleClient interviews={formattedInterviews} />;
}
