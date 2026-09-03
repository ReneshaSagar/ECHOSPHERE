import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export default function AdminJobsList() {
  const db = getDb();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Job Postings</h1>
        <Link href="/admin/jobs/new" className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
          + Create Job
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-600">Title</th>
              <th className="p-4 font-medium text-gray-600">Applications</th>
              <th className="p-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {db.jobs.map(job => {
              const appCount = db.applications.filter(a => a.jobId === job.id).length;
              return (
                <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{job.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{job.description}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                      {appCount}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link href={`/admin/jobs/${job.id}`} className="text-blue-600 hover:underline">Manage</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {db.jobs.length === 0 && (
          <div className="p-8 text-center text-gray-500">No jobs posted yet.</div>
        )}
      </div>
    </div>
  );
}
