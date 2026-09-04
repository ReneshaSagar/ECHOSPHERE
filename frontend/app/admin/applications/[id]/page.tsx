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

        {/* 1. JD-Specific Interview Context Layer */}
        {candidateContext?.interviewContext && (
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg text-emerald-950 flex items-center gap-2">
                  <span className="text-xl">🎯</span> JD-Specific Technical Relevance & Interview Hooks
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Targeted exclusively for <strong>{candidateContext.interviewContext.targetRole}</strong>. External profiles are context for discussion, never candidate scores.
                </p>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">
                JD Relevance Engine
              </span>
            </div>

            {/* High Relevance Evidence */}
            {candidateContext.interviewContext.highRelevanceEvidence && candidateContext.interviewContext.highRelevanceEvidence.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">High-Relevance Evidence & Match Rationale</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {candidateContext.interviewContext.highRelevanceEvidence.map((ev, idx) => (
                    <div key={idx} className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-900">{ev.topic}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${ev.relevance === 'HIGH' ? 'bg-emerald-200 text-emerald-900' : 'bg-blue-100 text-blue-800'}`}>
                          {ev.relevance} RELEVANCE
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{ev.reason}</p>
                      {ev.evidenceSources && ev.evidenceSources.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-gray-500 font-semibold">
                          Sources: {ev.evidenceSources.join(' + ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Interview Hooks */}
            {candidateContext.interviewContext.technicalInterviewHooks && candidateContext.interviewContext.technicalInterviewHooks.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Technical Interview Probing Hooks</h4>
                <ul className="space-y-2 text-xs text-gray-800">
                  {candidateContext.interviewContext.technicalInterviewHooks.map((hook, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
                      <span className="text-blue-600 font-bold mt-0.5">⚡</span>
                      <span className="leading-relaxed">{hook}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Projects Specifically Worth Probing */}
            {candidateContext.interviewContext.projectsWorthProbing && candidateContext.interviewContext.projectsWorthProbing.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Projects Worth Probing in Live Session</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {candidateContext.interviewContext.projectsWorthProbing.map((p, idx) => (
                    <div key={idx} className="p-3.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-gray-900">{p.name}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded text-[10px] font-bold">
                          {p.relevanceLevel} PRIORITY
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{p.reasonToProbe}</p>
                      {p.suggestedQuestions && p.suggestedQuestions.length > 0 && (
                        <div className="border-t border-gray-100 pt-2 space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggested Probing Questions:</span>
                          {p.suggestedQuestions.map((q, qIdx) => (
                            <div key={qIdx} className="text-xs text-gray-700 flex items-start gap-1.5">
                              <span className="text-indigo-500 font-bold">›</span>
                              <span>{q}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ignored or Low Relevance Topics */}
            {candidateContext.interviewContext.ignoredOrLowRelevanceTopics && candidateContext.interviewContext.ignoredOrLowRelevanceTopics.length > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                <span className="font-bold text-gray-700">Omitted / Low-Relevance Topics for this Role: </span>
                <span>{candidateContext.interviewContext.ignoredOrLowRelevanceTopics.join('; ')}</span>
              </div>
            )}
          </div>
        )}

        {/* 2. Cross-Source Corroborated Context Layer */}
        {candidateContext?.crossSourceContext && (
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg text-purple-950 flex items-center gap-2">
                  <span className="text-xl">🔗</span> Corroborated Cross-Source Evidence
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Relationships and claims corroborated across Resume, LinkedIn, and GitHub.
                </p>
              </div>
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full border border-purple-200">
                Multi-Source Correlation
              </span>
            </div>

            {/* Corroborated Skills */}
            {candidateContext.crossSourceContext.corroboratedSkills && candidateContext.crossSourceContext.corroboratedSkills.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Corroborated Technical Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {candidateContext.crossSourceContext.corroboratedSkills.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded-lg text-xs font-semibold">
                      <span>{s.skill}</span>
                      <span className="text-[10px] bg-purple-200/80 px-1.5 py-0.2 rounded font-bold uppercase text-purple-800">
                        {s.sources.join('+')}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Corroborated Projects */}
            {candidateContext.crossSourceContext.corroboratedProjects && candidateContext.crossSourceContext.corroboratedProjects.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Corroborated Projects</h4>
                <div className="space-y-2">
                  {candidateContext.crossSourceContext.corroboratedProjects.map((p, idx) => (
                    <div key={idx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                      <div className="flex items-center gap-2 font-bold text-gray-900">
                        <span>{p.projectName}</span>
                        <span className="text-[10px] font-semibold bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">
                          {p.sources.join(' & ')}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{p.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corroborated Experience */}
            {candidateContext.crossSourceContext.corroboratedExperience && candidateContext.crossSourceContext.corroboratedExperience.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Corroborated Experience</h4>
                <div className="space-y-1.5">
                  {candidateContext.crossSourceContext.corroboratedExperience.map((e, idx) => (
                    <div key={idx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-900">{e.role}</span> at <span className="font-semibold text-gray-800">{e.company}</span>
                        {e.duration && <span className="text-gray-500 ml-2">({e.duration})</span>}
                      </div>
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                        Verified ({e.sources.join(' + ')})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notable Claims */}
            {candidateContext.crossSourceContext.notableClaims && candidateContext.crossSourceContext.notableClaims.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Notable Claims to Probe</h4>
                <ul className="space-y-1.5 text-xs text-gray-800">
                  {candidateContext.crossSourceContext.notableClaims.map((c, idx) => (
                    <li key={idx} className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg">
                      <span className="font-semibold text-amber-950">"{c.claim}"</span>
                      <div className="text-[11px] text-amber-800 mt-1">
                        <strong>Probing Focus:</strong> {c.verificationFocus}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 3. Raw LinkedIn Source Card (Optional Detailed View) */}
        {candidateContext?.linkedin && (
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
                <span className="text-xl">💼</span> LinkedIn Source Profile
              </h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
                Ingestion Source: LinkedIn
              </span>
            </div>

            {candidateContext.linkedin.headline && (
              <p className="text-sm font-semibold text-gray-700 mb-2 italic">
                "{candidateContext.linkedin.headline}"
              </p>
            )}

            {candidateContext.linkedin.about && (
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded border">
                {candidateContext.linkedin.about}
              </p>
            )}

            {candidateContext.linkedin.careerProgression && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Career Progression Narrative</h4>
                <p className="text-sm text-gray-800 bg-purple-50 border border-purple-100 p-3 rounded">
                  {candidateContext.linkedin.careerProgression}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Enriched GitHub Technical Context & Repositories */}
        {(candidateContext?.githubContext || candidateContext?.githubProjects) && (
          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <span className="text-xl">🐙</span> GitHub Engineering Repositories & Artifacts
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Used solely to identify active projects and architectural topics for discussion. Never used for candidate scoring.
                </p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-full border border-gray-300">
                Contextual Project Discovery
              </span>
            </div>

            {candidateContext.githubContext && (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {candidateContext.githubContext.avatarUrl && (
                    <img 
                      src={candidateContext.githubContext.avatarUrl} 
                      alt={candidateContext.githubContext.username} 
                      className="w-11 h-11 rounded-full border shadow-sm" 
                    />
                  )}
                  <div>
                    <a 
                      href={candidateContext.githubContext.profileUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-bold text-sm text-blue-600 hover:underline flex items-center gap-1.5"
                    >
                      @{candidateContext.githubContext.username}
                      <span className="text-[11px] font-normal text-gray-500">↗</span>
                    </a>
                    {candidateContext.githubContext.bio && (
                      <p className="text-xs text-gray-600 mt-0.5">{candidateContext.githubContext.bio}</p>
                    )}
                  </div>
                  <div className="ml-auto flex gap-2 text-xs">
                    {candidateContext.githubContext.location && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">
                        📍 {candidateContext.githubContext.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Commit Velocity & Repository Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-2.5 rounded-lg text-center">
                    <div className="text-lg font-black text-blue-800">
                      {candidateContext.githubContext.totalCommits !== undefined 
                        ? candidateContext.githubContext.totalCommits 
                        : (candidateContext.totalCommits ?? 'N/A')}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Total Commits</div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 p-2.5 rounded-lg text-center">
                    <div className="text-lg font-black text-emerald-800">
                      {candidateContext.githubContext.recentCommits30Days !== undefined 
                        ? candidateContext.githubContext.recentCommits30Days 
                        : (candidateContext.recentCommits30Days ?? 'N/A')}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Past 30 Days</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 p-2.5 rounded-lg text-center">
                    <div className="text-lg font-black text-purple-800">
                      {candidateContext.githubProjects?.filter(p => p.isPinned).length || 0}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Pinned Projects</div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-2.5 rounded-lg text-center">
                    <div className="text-lg font-black text-amber-800">
                      {candidateContext.githubContext.publicReposCount ?? 'N/A'}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Public Repos</div>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Highlights */}
            {candidateContext.technicalHighlights && candidateContext.technicalHighlights.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <span>⚡</span> Technical Architecture & Codecraft Highlights
                </h4>
                <ul className="space-y-1 text-xs text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {candidateContext.technicalHighlights.map((hl, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Featured GitHub Projects (Pinned & Most Committed) */}
            {candidateContext.githubProjects && candidateContext.githubProjects.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Prioritized Repositories (Pinned, High-Commit & Active)
                  </h4>
                  <span className="text-[11px] text-gray-500">
                    Ranked by pinned status & candidate commit volume
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {candidateContext.githubProjects.map((p, idx) => (
                    <div key={idx} className="p-3.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1.5 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a 
                              href={p.url || `https://github.com/${p.name}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="font-bold text-sm text-blue-600 hover:underline"
                            >
                              {p.name}
                            </a>
                            {p.isPinned && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded text-[10px] font-bold border border-purple-200">
                                📌 Pinned
                              </span>
                            )}
                            {p.isRecent && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-medium border border-emerald-200">
                                🕒 Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                            {p.candidateCommits !== undefined && p.candidateCommits > 0 && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[10px] border border-indigo-100">
                                ⚡ {p.candidateCommits} commits
                              </span>
                            )}
                            {p.language && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium text-[10px]">
                                {p.language}
                              </span>
                            )}
                            {p.stars !== undefined && p.stars > 0 && (
                              <span>⭐ {p.stars}</span>
                            )}
                          </div>
                        </div>
                        {p.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{p.description}</p>
                        )}
                      </div>
                      {p.keyInsights && (
                        <p className="text-[11px] text-gray-700 bg-amber-50 border border-amber-100 p-2 rounded italic mt-2">
                          💡 {p.keyInsights}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GitHub Technical Interview Hooks */}
            {candidateContext.githubInterviewHooks && candidateContext.githubInterviewHooks.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1.5 flex items-center gap-1.5">
                  <span>🔬</span> GitHub Codecraft Interview Hooks (Provided to AI Interviewer)
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-800">
                  {candidateContext.githubInterviewHooks.map((hook, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-purple-50/70 p-2.5 rounded border border-purple-100">
                      <span className="text-purple-600 font-bold">💻</span>
                      <span>{hook}</span>
                    </li>
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
