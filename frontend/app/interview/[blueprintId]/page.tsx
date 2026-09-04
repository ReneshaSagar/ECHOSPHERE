import React from 'react';
import { getDb } from '@/lib/db';
import InterviewRoom from './InterviewRoom';

export default async function InterviewPage({ params }: { params: Promise<{ blueprintId: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  
  const blueprint = db.blueprints.find(b => b.id === resolvedParams.id || b.id === resolvedParams.blueprintId);
  if (!blueprint) {
    return <div className="p-10 text-center text-red-500 font-bold">Blueprint not found.</div>;
  }

  const interview = db.interviews.find(i => i.id === blueprint.interviewId);
  const application = db.applications.find(a => a.id === interview?.applicationId);
  const candidate = db.candidates.find(c => c.id === application?.candidateId);

  if (!interview || !application || !candidate) {
    return <div className="p-10 text-center text-red-500 font-bold">Data integrity error. Missing candidate data.</div>;
  }

  const job = db.jobs.find(j => j.id === application?.jobId);

  // Parse the blueprint JSON to pass to the client
  let parsedBlueprint;
  try {
    parsedBlueprint = JSON.parse(blueprint.blueprintJson);
  } catch (e) {
    return <div className="p-10 text-center text-red-500 font-bold">Failed to parse blueprint JSON.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <header className="bg-white border-b shadow-sm py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">EchoSphere Interview</h1>
        <div className="text-gray-600 font-medium">{candidate.name}</div>
      </header>
      
      <main className="flex-1 flex flex-col">
        <InterviewRoom 
          blueprint={parsedBlueprint} 
          interviewId={interview.id} 
          candidateName={candidate.name} 
          mcpServerUrl={job?.mcpServerUrl}
        />
      </main>
    </div>
  );
}
