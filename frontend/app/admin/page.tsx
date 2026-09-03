import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export default function AdminDashboard() {
  const db = getDb();
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Company Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-gray-500 font-medium">Active Jobs</h3>
          <p className="text-4xl font-bold mt-2">{db.jobs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-gray-500 font-medium">Total Applications</h3>
          <p className="text-4xl font-bold mt-2">{db.applications.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-gray-500 font-medium">Pending Reviews</h3>
          <p className="text-4xl font-bold mt-2 text-yellow-600">
            {db.applications.filter(a => a.status === 'APPLIED' || a.status === 'UNDER_REVIEW').length}
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Recent Jobs</h2>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-600">Title</th>
              <th className="p-4 font-medium text-gray-600">Applications</th>
              <th className="p-4 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {db.jobs.map(job => {
              const appCount = db.applications.filter(a => a.jobId === job.id).length;
              return (
                <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium">{job.title}</td>
                  <td className="p-4">{appCount}</td>
                  <td className="p-4">
                    <Link href={`/admin/jobs/${job.id}`} className="text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
