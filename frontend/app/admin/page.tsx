import React from 'react';
import { getDb } from '@/lib/db';
import AdminDashboardClient, {
  DashboardStats,
  InterviewCardItem,
  RecentApplicantItem,
  JobOverviewItem,
  PipelineStageItem
} from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  const db = getDb();
  
  const totalApplicants = db.applications.length;
  const inReviewCount = db.applications.filter(a => a.status === 'APPLIED' || a.status === 'UNDER_REVIEW').length;
  const scheduledCount = db.interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS').length;
  const completedCount = db.interviews.filter(i => i.status === 'COMPLETED').length;
  const selectedCount = db.applications.filter(a => a.status === 'SELECTED').length;
  const waitlistCount = db.applications.filter(a => a.status === 'CONSIDER_FOR_OTHER_ROLES').length;
  const rejectedCount = db.applications.filter(a => a.status === 'REJECTED').length;

  const stats: DashboardStats = {
    totalJobs: db.jobs.length,
    totalApplicants,
    inReviewCount,
    scheduledCount,
    completedCount,
    selectedCount,
    waitlistCount,
    rejectedCount
  };

  const interviews: InterviewCardItem[] = db.interviews.map(interview => {
    const app = db.applications.find(a => a.id === interview.applicationId);
    const candidate = db.candidates.find(c => c.id === app?.candidateId);
    const job = db.jobs.find(j => j.id === app?.jobId);
    const blueprint = db.blueprints.find(b => b.interviewId === interview.id);

    return {
      id: interview.id,
      applicationId: interview.applicationId,
      scheduledAt: interview.scheduledAt,
      status: interview.status,
      candidate: {
        name: candidate?.name || 'Candidate',
        email: candidate?.email || 'N/A'
      },
      job: {
        id: job?.id || 'job_default',
        title: job?.title || 'Engineering Role'
      },
      blueprintId: blueprint?.id,
      hasScorecard: !!interview.scorecard,
      overallScore: interview.scorecard?.overallScore
    };
  });

  const recentApplicants: RecentApplicantItem[] = db.applications.slice().reverse().map(app => {
    const candidate = db.candidates.find(c => c.id === app.candidateId);
    const job = db.jobs.find(j => j.id === app.jobId);
    const interview = db.interviews.find(i => i.applicationId === app.id);
    const blueprint = interview ? db.blueprints.find(b => b.interviewId === interview.id) : undefined;

    return {
      id: app.id,
      name: candidate?.name || 'Applicant',
      email: candidate?.email || 'N/A',
      jobTitle: job?.title || 'Engineering Role',
      status: app.status || 'APPLIED',
      createdAt: (app as any).createdAt || interview?.scheduledAt || new Date().toISOString(),
      evaluationScore: app.evaluationScore,
      githubUrl: app.githubUrl || candidate?.githubUrl,
      linkedinUrl: app.linkedinUrl || candidate?.linkedinUrl,
      resumeDriveUrl: app.resumeDriveUrl || candidate?.resumeDriveUrl,
      interviewId: interview?.id,
      blueprintId: blueprint?.id
    };
  });

  const jobs: JobOverviewItem[] = db.jobs.map(j => {
    const appCount = db.applications.filter(a => a.jobId === j.id).length;
    const activeInterviews = db.interviews.filter(i => {
      const app = db.applications.find(a => a.id === i.applicationId);
      return app?.jobId === j.id && (i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS');
    }).length;

    return {
      id: j.id,
      title: j.title,
      description: j.description,
      applicantCount: appCount,
      activeInterviewsCount: activeInterviews
    };
  });

  const totalAppsCount = Math.max(db.applications.length, 1);
  const pipelineStages: PipelineStageItem[] = [
    {
      name: 'Resume & GitHub Screening',
      roundKey: 'APPLIED',
      count: inReviewCount,
      percentage: Math.round((inReviewCount / totalAppsCount) * 100),
      color: 'bg-amber-400'
    },
    {
      name: 'Round 1: Practical Workspace Assessment',
      roundKey: 'R1_WORKSPACE',
      count: scheduledCount,
      percentage: Math.round((scheduledCount / totalAppsCount) * 100),
      color: 'bg-cyan-400'
    },
    {
      name: 'Round 2: Technical Architecture Panel',
      roundKey: 'R2_ARCH',
      count: scheduledCount,
      percentage: Math.round((scheduledCount / totalAppsCount) * 100),
      color: 'bg-purple-400'
    },
    {
      name: 'Round 3: Engineering Leadership & Culture',
      roundKey: 'R3_LEADERSHIP',
      count: scheduledCount,
      percentage: Math.round((scheduledCount / totalAppsCount) * 100),
      color: 'bg-pink-400'
    },
    {
      name: 'Offer Extended / Priority Talent Pool',
      roundKey: 'OFFER_POOL',
      count: selectedCount + waitlistCount,
      percentage: Math.round(((selectedCount + waitlistCount) / totalAppsCount) * 100),
      color: 'bg-emerald-400'
    }
  ];

  return (
    <AdminDashboardClient
      stats={stats}
      interviews={interviews}
      recentApplicants={recentApplicants}
      jobs={jobs}
      pipelineStages={pipelineStages}
    />
  );
}


