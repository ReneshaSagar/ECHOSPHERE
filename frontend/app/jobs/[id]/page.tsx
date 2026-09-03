import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export default async function PublicJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  const job = db.jobs.find(j => j.id === resolvedParams.id);
  
  if (!job) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-700">Job not found</h2>
        <Link href="/jobs" className="text-blue-600 hover:underline mt-4 inline-block">Return to Job Board</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/jobs" className="text-blue-600 hover:underline mb-6 inline-block font-medium">← Back to all jobs</Link>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{job.title}</h1>
        <div className="flex gap-2 mb-8">
          <span className="text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Remote</span>
          <span className="text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Full-time</span>
        </div>

        <div className="prose max-w-none text-gray-700 space-y-6">
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3 border-b pb-2">About the Role</h3>
            <p className="whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </section>
          
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3 border-b pb-2">Requirements</h3>
            <pre className="whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 p-4 rounded-lg border text-sm">{job.requirements}</pre>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-3 border-b pb-2">Interview Process</h3>
            <ul className="list-disc pl-5 space-y-1">
              {JSON.parse(job.stagesJson).map((stage: string, idx: number) => (
                <li key={idx} className="text-gray-700">{stage} Interview</li>
              ))}
            </ul>
          </section>
        </div>
        
        <div className="mt-10 pt-8 border-t flex justify-center">
          <Link href={`/jobs/${job.id}/apply`} className="px-10 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-lg shadow-md hover:shadow-lg transition-all w-full text-center sm:w-auto">
            Apply for this position
          </Link>
        </div>
      </div>
    </div>
  );
}
