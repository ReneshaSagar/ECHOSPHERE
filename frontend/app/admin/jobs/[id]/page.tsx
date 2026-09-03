import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import PipelineBoard from './PipelineBoard';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  const job = db.jobs.find(j => j.id === resolvedParams.id);
  
  if (!job) {
    return <div className="p-8 text-red-500">Job not found</div>;
  }

  const applicants = db.applications
    .filter(a => a.jobId === job.id)
    .map(app => {
      const candidate = db.candidates.find(c => c.id === app.candidateId);
      return { ...app, candidate };
    });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/jobs" className="text-gray-500 hover:text-gray-800">← Jobs</Link>
        <h1 className="text-3xl font-bold">{job.title}</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Job Details</h2>
        <div className="mb-4">
          <h3 className="font-medium text-gray-600">Description</h3>
          <p className="mt-1">{job.description}</p>
        </div>
        <div className="mb-4">
          <h3 className="font-medium text-gray-600">Requirements</h3>
          <pre className="mt-1 whitespace-pre-wrap font-sans">{job.requirements}</pre>
        </div>
        <div>
          <h3 className="font-medium text-gray-600">Interview Stages</h3>
          <div className="flex gap-2 mt-2">
            {JSON.parse(job.stagesJson).map((stage: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium border">
                {stage}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold">Applicant Pipeline</h2>
        <p className="text-gray-500">Manage candidate progression through the screening lifecycle.</p>
      </div>

      <PipelineBoard applicants={applicants} />
    </div>
  );
}
