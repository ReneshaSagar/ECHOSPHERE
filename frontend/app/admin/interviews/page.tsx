import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import BlueprintButton from './BlueprintButton';

export default async function AdminInterviewsPage() {
  const db = getDb();
  const interviews = db.interviews;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Scheduled Interviews</h1>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-600">Candidate</th>
              <th className="p-4 font-medium text-gray-600">Role</th>
              <th className="p-4 font-medium text-gray-600">Scheduled Time</th>
              <th className="p-4 font-medium text-gray-600">Status</th>
              <th className="p-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map(interview => {
              const app = db.applications.find(a => a.id === interview.applicationId);
              const candidate = db.candidates.find(c => c.id === app?.candidateId);
              const job = db.jobs.find(j => j.id === app?.jobId);
              
              return (
                <tr key={interview.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium">{candidate?.name || 'Unknown'}</td>
                  <td className="p-4 text-gray-700">{job?.title || 'Unknown Role'}</td>
                  <td className="p-4 text-gray-600">
                    {new Date(interview.scheduledAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                      {interview.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <BlueprintButton 
                      interviewId={interview.id} 
                      hasBlueprint={db.blueprints.some(b => b.interviewId === interview.id)} 
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {interviews.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No interviews have been scheduled yet.
          </div>
        )}
      </div>
    </div>
  );
}
