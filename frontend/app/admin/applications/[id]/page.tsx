import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import ApplicationActions from './ApplicationActions';
import ScorecardViewer from './ScorecardViewer';

export default async function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  const application = db.applications.find(a => a.id === resolvedParams.id);
  
  if (!application) {
    return <div className="p-8 text-red-500">Application not found</div>;
  }

  const job = db.jobs.find(j => j.id === application.jobId);
  const candidate = db.candidates.find(c => c.id === application.candidateId);
  const candidateContext = application.candidateContext || candidate?.candidateContext;
  
  // Find related interview & blueprint (Phase 9 Proctoring & Agora Voice AI)
  const interview = db.interviews.find(i => i.applicationId === application.id);
  const blueprint = interview ? db.blueprints.find(b => b.interviewId === interview.id) : undefined;
  let parsedBlueprint: any = null;
  if (blueprint) {
    try {
      parsedBlueprint = JSON.parse(blueprint.blueprintJson);
    } catch (e) {
      console.error("Error parsing blueprintJson:", e);
    }
  }
  const hasSuspiciousEvents = interview?.suspiciousEvents && interview.suspiciousEvents.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/jobs/${job?.id}`} className="text-gray-500 hover:text-gray-800">← Back to Job</Link>
        <h1 className="text-3xl font-bold">Review Application</h1>
      </div>

      {hasSuspiciousEvents && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 rounded shadow-sm">
          <h2 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
            ⚠️ Proctoring Alert: Suspicious Behavior Detected
          </h2>
          <ul className="space-y-1 text-sm text-red-700">
            {interview.suspiciousEvents!.map((ev, i) => (
              <li key={i}>
                <strong>{new Date(ev.timestamp).toLocaleTimeString()}:</strong> {ev.type} - {ev.details}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
        <div className="flex justify-between items-start mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold">{candidate?.name}</h2>
            <p className="text-gray-600">{candidate?.email}</p>
            <div className="flex gap-4 mt-2 text-sm text-blue-600">
              {candidate?.linkedinUrl && <a href={candidate.linkedinUrl} target="_blank" className="hover:underline">LinkedIn</a>}
              {candidate?.githubUrl && <a href={candidate.githubUrl} target="_blank" className="hover:underline">GitHub</a>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Applying for</div>
            <div className="font-bold text-gray-800">{job?.title}</div>
            <div className="mt-2 inline-flex items-center justify-center px-3 py-1 text-sm font-bold bg-gray-100 rounded-full">
              Status: {application.status}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">Resume / Experience</h3>
          <pre className="bg-gray-50 p-4 rounded border text-sm font-sans whitespace-pre-wrap">
            {application.resumeText}
          </pre>
        </div>

        {application.relevantExperience && (
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-2">Relevant Experience Highlight</h3>
            <p className="bg-blue-50 p-4 rounded border border-blue-100 text-sm text-blue-900 whitespace-pre-wrap">
              {application.relevantExperience}
            </p>
          </div>
        )}

        {/* Enriched LinkedIn Profile & Interview Hooks (Phase: Profile Enrichment) */}
        {candidateContext && (
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
                <span className="text-xl">💼</span> LinkedIn Enriched Candidate Context
              </h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
                Source: {candidateContext.enrichmentSource || 'LinkedIn'}
              </span>
            </div>

            {candidateContext.headline && (
              <p className="text-sm font-semibold text-gray-700 mb-2 italic">
                "{candidateContext.headline}"
              </p>
            )}

            {candidateContext.about && (
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded border">
                {candidateContext.about}
              </p>
            )}

            {candidateContext.careerProgression && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Career Progression Narrative</h4>
                <p className="text-sm text-gray-800 bg-purple-50 border border-purple-100 p-3 rounded">
                  {candidateContext.careerProgression}
                </p>
              </div>
            )}

            {candidateContext.interviewHooks && candidateContext.interviewHooks.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">AI Interview Hooks (Provided to AI Interviewer)</h4>
                <ul className="space-y-1.5 text-sm text-gray-800">
                  {candidateContext.interviewHooks.map((hook, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-blue-50/70 p-2 rounded border border-blue-100">
                      <span className="text-blue-500 font-bold">🎯</span>
                      <span>{hook}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {candidateContext.skills && candidateContext.skills.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Verified Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {candidateContext.skills.map((skill, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium border border-gray-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {candidateContext.notableClaims && candidateContext.notableClaims.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Notable Claims & Milestones</h4>
                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                  {candidateContext.notableClaims.map((claim, idx) => (
                    <li key={idx}>{claim}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {candidate?.portfolioUrl && (
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-2">Portfolio / Website</h3>
            <a href={candidate.portfolioUrl} target="_blank" className="text-blue-600 hover:underline">
              {candidate.portfolioUrl}
            </a>
          </div>
        )}
      </div>

      {/* Agora Conversational AI Agent Briefing & Blueprint Section */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>🎙️</span> Agora Voice AI Agent Briefing & Instructions
            </h2>
            <p className="text-blue-200 text-sm mt-1">
              Exact prompts, spoken greeting lines, and multi-round instructions fed to the Agora Conversational AI agent.
            </p>
          </div>
          {blueprint && (
            <Link 
              href={`/interview/${blueprint.id}`}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow transition-all text-sm shrink-0"
            >
              Launch Live Interview Room →
            </Link>
          )}
        </div>

        <div className="p-6 space-y-6">
          {parsedBlueprint && parsedBlueprint.interview_rounds ? (
            <div className="space-y-6">
              {parsedBlueprint.interview_rounds.map((round: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                  <div className="px-4 py-3 bg-gray-100 border-b flex justify-between items-center">
                    <span className="font-bold text-gray-800">
                      Round {idx + 1}: {round.round_name}
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full">
                      Interviewer: {round.interviewer?.name} ({round.interviewer?.role})
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Spoken Greeting Message */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1.5">
                        <span>🔊</span> Spoken Opening Line (What the AI Agent Speaks First)
                      </h4>
                      <p className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-950 p-3.5 rounded-lg italic leading-relaxed">
                        "{round.interviewer?.greeting_message}"
                      </p>
                    </div>

                    {/* Agent Instructions */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-1.5 flex items-center gap-1.5">
                        <span>🧠</span> System Instructions & Behavioral Directives (Prompt fed to AI)
                      </h4>
                      <p className="text-sm bg-indigo-50/60 border border-indigo-100 text-gray-800 p-3.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                        {round.interviewer?.instructions}
                      </p>
                    </div>

                    {/* Evaluation Rubric */}
                    {round.rubric && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 flex items-center gap-1.5">
                          <span>⚖️</span> Round Evaluation Rubric
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {Object.entries(round.rubric).map(([k, v]: [string, any], rIdx) => (
                            <div key={rIdx} className="bg-white border rounded p-2">
                              <span className="font-semibold text-gray-700 capitalize">{k.replace(/_/g, ' ')}:</span>
                              <span className="text-gray-600 ml-1">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <details className="mt-4 pt-4 border-t text-xs">
                <summary className="font-semibold text-gray-600 cursor-pointer hover:text-gray-900">
                  Inspect Raw Blueprint JSON sent to Agora Agent
                </summary>
                <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(parsedBlueprint, null, 2)}
                </pre>
              </details>
            </div>
          ) : interview ? (
            <div className="text-center py-6">
              <p className="text-gray-700 font-medium mb-3">
                An interview is scheduled for {new Date(interview.scheduledAt).toLocaleString()}, but the AI Blueprint hasn't been generated yet.
              </p>
              <Link 
                href={`/admin/interviews`} 
                className="inline-block px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm shadow"
              >
                Go to Scheduled Interviews & Generate Blueprint →
              </Link>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-600">
              <p className="mb-2">
                No interview scheduled for this candidate yet.
              </p>
              <p className="text-sm text-gray-500">
                Click <strong>"Select for Interview"</strong> below and then <strong>"Schedule Interview →"</strong> to generate the customized Agora agent prompts and launch the voice session.
              </p>
            </div>
          )}
        </div>
      </div>

      <ApplicationActions applicationId={application.id} currentStatus={application.status} />

      {interview && interview.status === 'COMPLETED' && (
        <ScorecardViewer interviewId={interview.id} initialScorecard={interview.scorecard} />
      )}
    </div>
  );
}
