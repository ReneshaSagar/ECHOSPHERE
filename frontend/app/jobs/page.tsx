import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export default async function JobBoardPage() {
  const db = getDb();
  // Filter out any jobs that shouldn't be public. 
  // For now, assume all jobs in DB are open positions.
  const jobs = db.jobs;

  return (
    <div>
      <div className="mb-10 text-center py-10 bg-blue-50 rounded-xl border border-blue-100">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-4">Open Positions</h1>
        <p className="text-lg text-blue-700 max-w-2xl mx-auto">
          Join mr.technologies and help us build the next generation of AI-driven platforms. 
          Browse our open roles below and apply today!
        </p>
      </div>

      <div className="grid gap-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center transition hover:shadow-md">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
              <p className="text-gray-500 mt-1 line-clamp-2 max-w-3xl">{job.description}</p>
              <div className="mt-3 flex gap-2">
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">Remote</span>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">Full-time</span>
              </div>
            </div>
            <Link href={`/jobs/${job.id}`} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0">
              View Details
            </Link>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
            No open positions at this time. Please check back later.
          </div>
        )}
      </div>
    </div>
  );
}
