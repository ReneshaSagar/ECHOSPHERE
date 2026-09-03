import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';

export default async function BlueprintViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  
  const blueprint = db.blueprints.find(b => b.interviewId === resolvedParams.id);
  const interview = db.interviews.find(i => i.id === resolvedParams.id);
  
  if (!blueprint || !interview) {
    return <div className="p-8 text-red-500">Blueprint or Interview not found</div>;
  }

  const application = db.applications.find(a => a.id === interview.applicationId);
  const candidate = db.candidates.find(c => c.id === application?.candidateId);

  let parsedJson;
  try {
    parsedJson = JSON.parse(blueprint.blueprintJson);
  } catch(e) {
    parsedJson = { error: "Failed to parse JSON" };
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/admin/interviews" className="text-gray-500 hover:underline mb-6 inline-block font-medium">← Back to Interviews</Link>
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold">Interview Blueprint</h1>
          <p className="text-gray-600">Generated for {candidate?.name}</p>
        </div>
        <Link href={`/interview/${blueprint.id}`} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700">
          Start AI Interview →
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-800">Raw JSON Orchestrator Config</h2>
          <p className="text-sm text-gray-500">This config drives the multi-agent sessions.</p>
        </div>
        <div className="p-6">
          <pre className="w-full bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(parsedJson, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
