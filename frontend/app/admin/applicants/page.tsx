import React from 'react';
import { getDb } from '@/lib/db';
import ApplicantsClient, { ApplicantRow } from './ApplicantsClient';

export default async function AdminApplicantsPage() {
  const db = getDb();

  const formattedApplicants: ApplicantRow[] = db.applications.map(app => {
    const candidate = db.candidates.find(c => c.id === app.candidateId);
    const job = db.jobs.find(j => j.id === app.jobId);
    const interview = db.interviews.find(i => i.applicationId === app.id);

    return {
      id: app.id,
      jobId: app.jobId,
      candidateId: app.candidateId,
      name: candidate?.name || 'Unknown Candidate',
      email: candidate?.email || 'N/A',
      role: job?.title || 'Unknown Role',
      status: app.status || 'APPLIED',
      decisionStage: app.decisionStage,
      decisionReason: app.decisionReason,
      recommendedAlternativeRoles: app.recommendedAlternativeRoles,
      evaluationScore: app.evaluationScore,
      evaluationSummary: app.evaluationSummary,
      linkedinUrl: app.linkedinUrl || candidate?.linkedinUrl,
      githubUrl: app.githubUrl || candidate?.githubUrl,
      resumeDriveUrl: app.resumeDriveUrl || candidate?.resumeDriveUrl,
      resumeFileName: app.resumeFileName,
      totalCommits: app.candidateContext?.totalCommits,
      recentCommits30Days: app.candidateContext?.recentCommits30Days,
      pinnedProjectsCount: (app.candidateContext?.githubProjects || []).filter(p => p.isPinned).length,
      interviewId: interview?.id,
      interviewStatus: interview?.status,
      hasScorecard: !!interview?.scorecard,
      scheduledAt: interview?.scheduledAt
    };
  });

  const jobsList = db.jobs.map(j => ({ id: j.id, title: j.title }));

  return <ApplicantsClient initialApplicants={formattedApplicants} jobs={jobsList} />;
}
