import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import { formatTimeIST, formatDateTimeShortIST } from '@/lib/dateFormat';
import ApplicationActions from './ApplicationActions';
import ScorecardViewer from './ScorecardViewer';
import ProctorScorecardViewer from './ProctorScorecardViewer';

export default async function ApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  const application = db.applications.find(a => a.id === resolvedParams.id);
  
  if (!application) {
    return (
      <div className="p-8 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        Application not found
      </div>
    );
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
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href={`/admin/jobs/${job?.id}`} 
            className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all font-mono text-xs flex items-center gap-1.5"
          >
            <span>←</span> Back to Job
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Review Application</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/40 uppercase tracking-widest">App ID:</span>
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/80">
            {application.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Proctoring Alert */}
      {hasSuspiciousEvents && (
        <div className="p-5 bg-rose-950/30 border border-rose-500/30 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.15)] relative overflow-hidden">
          <div className="flex items-center gap-2.5 text-rose-300 font-bold text-base mb-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span>⚠️ Proctoring Alert: Suspicious Behavior Detected</span>
          </div>
          <ul className="space-y-1.5 text-xs text-rose-200/80 font-mono">
            {interview.suspiciousEvents!.map((ev, i) => (
              <li key={i} className="flex items-start gap-2 bg-rose-950/50 p-2 rounded-lg border border-rose-500/20">
                <strong className="text-rose-300" suppressHydrationWarning>{formatTimeIST(ev.timestamp)}:</strong>
                <span>{ev.type} - {ev.details}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Candidate Profile Master Card */}
      <div className="bg-[#0a0a0d] p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{candidate?.name}</h2>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/80">
                {candidate?.email}
              </span>
            </div>
            
            {candidateContext?.headline && (
              <p className="text-sm text-cyan-300/90 font-medium mt-2 flex items-center gap-2">
                <span>💼</span>
                <span>{candidateContext.headline}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              {candidate?.linkedinUrl && (
                <a 
                  href={candidate.linkedinUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all flex items-center gap-1.5"
                >
                  <span>LinkedIn</span>
                  <span className="text-[10px] text-cyan-400/60">↗</span>
                </a>
              )}
              {candidate?.githubUrl && (
                <a 
                  href={candidate.githubUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all flex items-center gap-1.5"
                >
                  <span>GitHub</span>
                  <span className="text-[10px] text-purple-400/60">↗</span>
                </a>
              )}
              {candidate?.portfolioUrl && (
                <a 
                  href={candidate.portfolioUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5"
                >
                  <span>Portfolio</span>
                  <span className="text-[10px] text-white/40">↗</span>
                </a>
              )}
            </div>
          </div>

          <div className="md:text-right bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl min-w-[220px]">
            <div className="text-xs font-mono uppercase tracking-widest text-white/40 mb-1">Applying For</div>
            <div className="font-bold text-white text-base">{job?.title}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/[0.06] border border-white/[0.12] text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>STATUS: {application.status}</span>
            </div>
          </div>
        </div>

        {/* Resume Text */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sans font-bold text-base text-white flex items-center gap-2">
              <span>📄</span> Resume & Experience Transcript
            </h3>
            <span className="font-mono text-[11px] text-white/40">Plaintext Extraction</span>
          </div>
          <pre className="bg-[#030304] p-5 rounded-2xl border border-white/[0.06] text-xs font-mono text-white/70 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
            {application.resumeText}
          </pre>
        </div>

        {/* Relevant Experience Highlight */}
        {application.relevantExperience && (
          <div className="mt-6">
            <h3 className="font-sans font-bold text-sm text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>⚡</span> Relevant Experience Highlight
            </h3>
            <div className="bg-cyan-950/20 p-4 rounded-2xl border border-cyan-500/20 text-xs text-cyan-100/90 whitespace-pre-wrap leading-relaxed">
              {application.relevantExperience}
            </div>
          </div>
        )}

        {/* 1. JD-Specific Interview Context Layer */}
        {candidateContext?.interviewContext && (
          <div className="mt-8 border-t border-white/[0.06] pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-lg text-emerald-300 flex items-center gap-2">
                  <span>🎯</span> JD-Specific Technical Relevance & Interview Hooks
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Targeted exclusively for <strong className="text-white">{candidateContext.interviewContext.targetRole}</strong>. External profiles are context for discussion, never candidate scores.
                </p>
              </div>
              <span className="font-mono text-xs bg-emerald-500/10 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30 shrink-0">
                JD Relevance Engine
              </span>
            </div>

            {/* High Relevance Evidence */}
            {candidateContext.interviewContext.highRelevanceEvidence && candidateContext.interviewContext.highRelevanceEvidence.length > 0 && (
              <div className="mb-6">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50 mb-3">High-Relevance Evidence & Match Rationale</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {candidateContext.interviewContext.highRelevanceEvidence.map((ev, idx) => (
                    <div key={idx} className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-emerald-200">{ev.topic}</span>
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${ev.relevance === 'HIGH' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'}`}>
                          {ev.relevance} RELEVANCE
                        </span>
                      </div>
                      <p className="text-white/70 leading-relaxed">{ev.reason}</p>
                      {ev.evidenceSources && ev.evidenceSources.length > 0 && (
                        <div className="mt-2 text-[10px] font-mono text-white/40">
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
              <div className="mb-6">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Technical Interview Probing Hooks</h4>
                <ul className="space-y-2 text-xs text-white/80">
                  {candidateContext.interviewContext.technicalInterviewHooks.map((hook, idx) => (
                    <li key={idx} className="flex items-start gap-3 bg-cyan-950/20 p-3.5 rounded-2xl border border-cyan-500/20">
                      <span className="text-cyan-400 font-bold mt-0.5">⚡</span>
                      <span className="leading-relaxed">{hook}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Projects Specifically Worth Probing */}
            {candidateContext.interviewContext.projectsWorthProbing && candidateContext.interviewContext.projectsWorthProbing.length > 0 && (
              <div className="mb-6">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50 mb-3">Projects Worth Probing in Live Session</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {candidateContext.interviewContext.projectsWorthProbing.map((p, idx) => (
                    <div key={idx} className="p-4 bg-[#030304]/80 border border-white/[0.08] rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-white">{p.name}</span>
                          <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full font-mono text-[10px] font-bold">
                            {p.relevanceLevel} PRIORITY
                          </span>
                        </div>
                        <p className="text-xs text-white/60 mb-3 leading-relaxed">{p.reasonToProbe}</p>
                      </div>
                      {p.suggestedQuestions && p.suggestedQuestions.length > 0 && (
                        <div className="border-t border-white/[0.06] pt-2.5 space-y-1.5">
                          <span className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-wider">Suggested Probing Questions:</span>
                          {p.suggestedQuestions.map((q, qIdx) => (
                            <div key={qIdx} className="text-xs text-white/70 flex items-start gap-1.5">
                              <span className="text-cyan-400 font-bold">›</span>
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
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-xs text-white/50">
                <span className="font-mono font-bold text-white/70">Omitted / Low-Relevance Topics for this Role: </span>
                <span>{candidateContext.interviewContext.ignoredOrLowRelevanceTopics.join('; ')}</span>
              </div>
            )}
          </div>
        )}

        {/* 2. Cross-Source Corroborated Context Layer */}
        {candidateContext?.crossSourceContext && (
          <div className="mt-8 border-t border-white/[0.06] pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-lg text-purple-300 flex items-center gap-2">
                  <span>🔗</span> Corroborated Cross-Source Evidence
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Relationships and claims corroborated across Resume, LinkedIn, and GitHub.
                </p>
              </div>
              <span className="font-mono text-xs bg-purple-500/10 text-purple-300 font-bold px-3 py-1 rounded-full border border-purple-500/30 shrink-0">
                Multi-Source Correlation
              </span>
            </div>

            {/* Corroborated Skills */}
            {candidateContext.crossSourceContext.corroboratedSkills && candidateContext.crossSourceContext.corroboratedSkills.length > 0 && (
              <div className="mb-5">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5">Corroborated Technical Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {candidateContext.crossSourceContext.corroboratedSkills.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-950/20 text-purple-200 border border-purple-500/20 rounded-xl text-xs font-medium">
                      <span>{s.skill}</span>
                      <span className="font-mono text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded font-bold uppercase text-purple-300">
                        {s.sources.join('+')}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Corroborated Projects */}
            {candidateContext.crossSourceContext.corroboratedProjects && candidateContext.crossSourceContext.corroboratedProjects.length > 0 && (
              <div className="mb-5">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5">Corroborated Projects</h4>
                <div className="space-y-2.5">
                  {candidateContext.crossSourceContext.corroboratedProjects.map((p, idx) => (
                    <div key={idx} className="p-3.5 bg-[#030304]/80 border border-white/[0.08] rounded-2xl text-xs">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span>{p.projectName}</span>
                        <span className="font-mono text-[10px] font-semibold bg-white/[0.06] text-white/60 px-2 py-0.5 rounded-full border border-white/[0.08]">
                          {p.sources.join(' & ')}
                        </span>
                      </div>
                      <p className="text-white/60 mt-1.5 leading-relaxed">{p.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corroborated Experience */}
            {candidateContext.crossSourceContext.corroboratedExperience && candidateContext.crossSourceContext.corroboratedExperience.length > 0 && (
              <div className="mb-5">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5">Corroborated Experience</h4>
                <div className="space-y-2">
                  {candidateContext.crossSourceContext.corroboratedExperience.map((e, idx) => (
                    <div key={idx} className="p-3.5 bg-[#030304]/80 border border-white/[0.08] rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-white">{e.role}</span> at <span className="font-medium text-white/80">{e.company}</span>
                        {e.duration && <span className="text-white/40 ml-2 font-mono text-[11px]">({e.duration})</span>}
                      </div>
                      <span className="font-mono text-[10px] bg-purple-500/10 text-purple-300 font-bold px-2.5 py-1 rounded-full border border-purple-500/20 shrink-0">
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
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300 mb-2.5">Notable Claims to Probe</h4>
                <ul className="space-y-2 text-xs">
                  {candidateContext.crossSourceContext.notableClaims.map((c, idx) => (
                    <li key={idx} className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-2xl">
                      <span className="font-semibold text-amber-200">"{c.claim}"</span>
                      <div className="text-[11px] text-amber-300/80 mt-1 font-mono">
                        <strong>Probing Focus:</strong> {c.verificationFocus}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 3. Raw LinkedIn Source Card */}
        {candidateContext?.linkedin && (
          <div className="mt-8 border-t border-white/[0.06] pt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-cyan-300 flex items-center gap-2">
                <span>💼</span> LinkedIn Source Profile
              </h3>
              <span className="font-mono text-xs bg-cyan-500/10 text-cyan-300 font-semibold px-3 py-1 rounded-full border border-cyan-500/20">
                Ingestion Source: LinkedIn
              </span>
            </div>

            {candidateContext.linkedin.headline && (
              <p className="text-sm font-medium text-white/80 mb-3 italic">
                "{candidateContext.linkedin.headline}"
              </p>
            )}

            {candidateContext.linkedin.about && (
              <p className="text-xs text-white/60 mb-4 bg-[#030304] p-4 rounded-2xl border border-white/[0.06] leading-relaxed">
                {candidateContext.linkedin.about}
              </p>
            )}

            {candidateContext.linkedin.careerProgression && (
              <div>
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Career Progression Narrative</h4>
                <p className="text-xs text-purple-200/90 bg-purple-950/20 border border-purple-500/20 p-4 rounded-2xl leading-relaxed">
                  {candidateContext.linkedin.careerProgression}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Enriched GitHub Technical Context & Repositories */}
        {(candidateContext?.githubContext || candidateContext?.githubProjects) && (
          <div className="mt-8 border-t border-white/[0.06] pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>🐙</span> GitHub Engineering Repositories & Artifacts
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Used solely to identify active projects and architectural topics for discussion. Never used for candidate scoring.
                </p>
              </div>
              <span className="font-mono text-xs bg-white/[0.05] text-white/70 font-semibold px-3 py-1 rounded-full border border-white/[0.1] shrink-0">
                Contextual Discovery
              </span>
            </div>

            {candidateContext.githubContext && (
              <div className="mb-5">
                <div className="flex items-center gap-3.5 mb-4 bg-[#030304] p-4 rounded-2xl border border-white/[0.08]">
                  {candidateContext.githubContext.avatarUrl && (
                    <img 
                      src={candidateContext.githubContext.avatarUrl} 
                      alt={candidateContext.githubContext.username} 
                      className="w-12 h-12 rounded-full border border-white/20 shadow-md" 
                    />
                  )}
                  <div>
                    <a 
                      href={candidateContext.githubContext.profileUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-bold text-sm text-cyan-400 hover:underline flex items-center gap-1.5"
                    >
                      @{candidateContext.githubContext.username}
                      <span className="text-[11px] font-normal text-white/40">↗</span>
                    </a>
                    {candidateContext.githubContext.bio && (
                      <p className="text-xs text-white/60 mt-0.5">{candidateContext.githubContext.bio}</p>
                    )}
                  </div>
                  {candidateContext.githubContext.location && (
                    <div className="ml-auto font-mono text-[11px] text-white/50 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.08]">
                      📍 {candidateContext.githubContext.location}
                    </div>
                  )}
                </div>

                {/* Commit Velocity & Repository Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                  <div className="bg-[#030304] border border-cyan-500/20 p-3 rounded-2xl text-center">
                    <div className="text-xl font-bold font-mono text-cyan-300">
                      {candidateContext.githubContext.totalCommits !== undefined 
                        ? candidateContext.githubContext.totalCommits 
                        : (candidateContext.totalCommits ?? 'N/A')}
                    </div>
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400/70 mt-0.5">Total Commits</div>
                  </div>

                  <div className="bg-[#030304] border border-emerald-500/20 p-3 rounded-2xl text-center">
                    <div className="text-xl font-bold font-mono text-emerald-300">
                      {candidateContext.githubContext.recentCommits30Days !== undefined 
                        ? candidateContext.githubContext.recentCommits30Days 
                        : (candidateContext.recentCommits30Days ?? 'N/A')}
                    </div>
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400/70 mt-0.5">Past 30 Days</div>
                  </div>

                  <div className="bg-[#030304] border border-purple-500/20 p-3 rounded-2xl text-center">
                    <div className="text-xl font-bold font-mono text-purple-300">
                      {candidateContext.githubProjects?.filter(p => p.isPinned).length || 0}
                    </div>
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-400/70 mt-0.5">Pinned Projects</div>
                  </div>

                  <div className="bg-[#030304] border border-amber-500/20 p-3 rounded-2xl text-center">
                    <div className="text-xl font-bold font-mono text-amber-300">
                      {candidateContext.githubContext.publicReposCount ?? 'N/A'}
                    </div>
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400/70 mt-0.5">Public Repos</div>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Highlights */}
            {candidateContext.technicalHighlights && candidateContext.technicalHighlights.length > 0 && (
              <div className="mb-5">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5 flex items-center gap-1.5">
                  <span>⚡</span> Technical Architecture & Codecraft Highlights
                </h4>
                <ul className="space-y-1.5 text-xs text-white/80 bg-[#030304] p-4 rounded-2xl border border-white/[0.08]">
                  {candidateContext.technicalHighlights.map((hl, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Featured GitHub Projects */}
            {candidateContext.githubProjects && candidateContext.githubProjects.length > 0 && (
              <div className="mb-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50">
                    Prioritized Repositories
                  </h4>
                  <span className="font-mono text-[10px] text-white/40">
                    Ranked by pinned status & commit volume
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {candidateContext.githubProjects.map((p, idx) => (
                    <div key={idx} className="p-4 bg-[#030304]/80 border border-white/[0.08] hover:border-white/20 transition-all rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a 
                              href={p.url || `https://github.com/${p.name}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="font-bold text-sm text-cyan-400 hover:underline"
                            >
                              {p.name}
                            </a>
                            {p.isPinned && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-mono text-[10px] font-bold border border-purple-500/30">
                                📌 Pinned
                              </span>
                            )}
                            {p.isRecent && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-mono text-[10px] font-medium border border-emerald-500/30">
                                🕒 Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-white/50 shrink-0">
                            {p.candidateCommits !== undefined && p.candidateCommits > 0 && (
                              <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/20">
                                ⚡ {p.candidateCommits} commits
                              </span>
                            )}
                            {p.language && (
                              <span className="px-2 py-0.5 bg-white/[0.05] text-white/70 rounded-full border border-white/[0.08]">
                                {p.language}
                              </span>
                            )}
                            {p.stars !== undefined && p.stars > 0 && (
                              <span>⭐ {p.stars}</span>
                            )}
                          </div>
                        </div>
                        {p.description && (
                          <p className="text-xs text-white/60 mb-2 line-clamp-2 leading-relaxed">{p.description}</p>
                        )}
                      </div>
                      {p.keyInsights && (
                        <p className="text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl italic mt-2.5">
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
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-purple-300 mb-2.5 flex items-center gap-1.5">
                  <span>🔬</span> GitHub Codecraft Interview Hooks (Fed to AI Interviewer)
                </h4>
                <ul className="space-y-2 text-xs text-white/80">
                  {candidateContext.githubInterviewHooks.map((hook, idx) => (
                    <li key={idx} className="flex items-start gap-3 bg-purple-950/20 p-3.5 rounded-2xl border border-purple-500/20">
                      <span className="text-purple-400 font-bold">💻</span>
                      <span className="leading-relaxed">{hook}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agora Voice AI Agent Briefing & Blueprint Section */}
      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-[#0a0a0d] border-b border-white/[0.08] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              AGORA REAL-TIME VOICE AI
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>🎙️</span> Agent Briefing & Multi-Round Directives
            </h2>
            <p className="text-white/60 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Exact system instructions, spoken greeting lines, and evaluation rubrics dispatched to the Agora conversational voice agents.
            </p>
          </div>
          {blueprint && (
            <Link 
              href={`/interview/${blueprint.id}`}
              className="px-6 py-3 bg-white text-black hover:bg-neutral-200 font-sans font-bold rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all text-xs shrink-0 flex items-center gap-2"
            >
              <span>Launch Live Room</span>
              <span>→</span>
            </Link>
          )}
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {parsedBlueprint && parsedBlueprint.interview_rounds ? (
            <div className="space-y-6">
              {parsedBlueprint.interview_rounds.map((round: any, idx: number) => (
                <div key={idx} className="border border-white/[0.08] rounded-2xl overflow-hidden bg-[#030304]/60">
                  <div className="px-5 py-4 bg-white/[0.03] border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-white text-sm">
                      Round {idx + 1}: {round.round_name}
                    </span>
                    <span className="font-mono text-xs bg-indigo-500/10 text-indigo-300 font-semibold px-3 py-1 rounded-full border border-indigo-500/20">
                      Interviewer: {round.interviewer?.name} ({round.interviewer?.role})
                    </span>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Spoken Greeting Message */}
                    <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2 flex items-center gap-1.5">
                        <span>🔊</span> Spoken Opening Line (First Utterance)
                      </h4>
                      <p className="text-xs bg-emerald-950/20 border border-emerald-500/20 text-emerald-200 p-4 rounded-2xl italic leading-relaxed font-sans">
                        "{round.interviewer?.greeting_message}"
                      </p>
                    </div>

                    {/* Agent Instructions */}
                    <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-1.5">
                        <span>🧠</span> System Instructions & Behavioral Directives
                      </h4>
                      <p className="text-xs bg-indigo-950/20 border border-indigo-500/20 text-white/80 p-4 rounded-2xl whitespace-pre-wrap leading-relaxed font-mono">
                        {round.interviewer?.instructions}
                      </p>
                    </div>

                    {/* Evaluation Rubric */}
                    {round.rubric && (
                      <div>
                        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50 mb-2 flex items-center gap-1.5">
                          <span>⚖️</span> Round Evaluation Rubric
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          {Object.entries(round.rubric).map(([k, v]: [string, any], rIdx) => (
                            <div key={rIdx} className="bg-[#030304] border border-white/[0.06] rounded-xl p-3">
                              <span className="font-mono font-semibold text-white/70 capitalize">{k.replace(/_/g, ' ')}:</span>
                              <span className="text-white/50 ml-1.5">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <details className="mt-4 pt-4 border-t border-white/[0.06] text-xs">
                <summary className="font-mono text-xs text-white/50 cursor-pointer hover:text-white transition-colors">
                  Inspect Raw Blueprint JSON sent to Agora Agent
                </summary>
                <pre className="mt-3 p-4 bg-[#030304] text-emerald-400/90 rounded-2xl border border-white/[0.08] overflow-x-auto text-[11px] font-mono max-h-96 custom-scrollbar">
                  {JSON.stringify(parsedBlueprint, null, 2)}
                </pre>
              </details>
            </div>
          ) : interview ? (
            <div className="text-center py-10 bg-[#030304]/60 rounded-2xl border border-white/[0.06] p-6">
              <p className="text-white/80 font-medium mb-4 text-sm" suppressHydrationWarning>
                An interview is scheduled for {formatDateTimeShortIST(interview.scheduledAt)}, but the AI Blueprint hasn't been generated yet.
              </p>
              <Link 
                href={`/admin/schedule`} 
                className="inline-block px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-neutral-200 text-xs shadow-[0_0_20px_rgba(255,255,255,0.15)] transition"
              >
                Go to Schedule & Generate Blueprint →
              </Link>
            </div>
          ) : (
            <div className="text-center py-10 bg-[#030304]/60 rounded-2xl border border-white/[0.06] p-6 text-white/60">
              <p className="mb-2 text-sm text-white/80">
                No interview scheduled for this candidate yet.
              </p>
              <p className="text-xs text-white/40 max-w-md mx-auto">
                Click <strong className="text-white">"Select for Interview"</strong> below and then <strong className="text-white">"Schedule Interview →"</strong> to generate the customized Agora agent prompts and launch the voice session.
              </p>
            </div>
          )}
        </div>

        {/* Enrichment Source Logging & Stage Diffing Trace */}
        {candidateContext?.sourceLogging && (
          <div className="p-6 sm:p-8 border-t border-white/[0.08] bg-[#030304]/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>🔬</span> Data Integrity & Source Logging Trace
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Full verifiable audit trail diffing raw provider API data, deterministic mapping, and synthesis-only Gemini outputs.
                </p>
              </div>
              <span className="font-mono text-xs bg-purple-500/10 text-purple-300 font-bold px-3 py-1 rounded-full border border-purple-500/20 shrink-0">
                Audit Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stage 1: Raw Provider JSON */}
              <div className="p-4 bg-[#030304] border border-white/[0.08] rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold uppercase text-white/60 tracking-wider">
                    Stage 1: Raw Provider
                  </span>
                  <span className="text-[10px] bg-white/[0.05] text-white/60 px-2 py-0.5 rounded font-mono">
                    Single Truth
                  </span>
                </div>
                <p className="text-xs text-white/40 mb-3">
                  Raw payload from Bright Data & GitHub APIs without alteration.
                </p>
                <details className="text-xs">
                  <summary className="text-cyan-400 hover:underline cursor-pointer font-mono text-[11px]">
                    View Raw Provider Data
                  </summary>
                  <pre className="mt-2 p-3 bg-black text-emerald-400/90 rounded-xl border border-white/[0.08] text-[10px] font-mono overflow-x-auto max-h-60 custom-scrollbar">
                    {JSON.stringify(candidateContext.sourceLogging.rawProviderJson, null, 2)}
                  </pre>
                </details>
              </div>

              {/* Stage 2: Mapped CandidateContext */}
              <div className="p-4 bg-[#030304] border border-white/[0.08] rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold uppercase text-cyan-300 tracking-wider">
                    Stage 2: Mapped Context
                  </span>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded font-mono">
                    Deterministic
                  </span>
                </div>
                <p className="text-xs text-white/40 mb-3">
                  Factual profile fields mapped purely via code (ZERO LLM extraction).
                </p>
                <details className="text-xs">
                  <summary className="text-cyan-400 hover:underline cursor-pointer font-mono text-[11px]">
                    View Mapped Fields
                  </summary>
                  <pre className="mt-2 p-3 bg-black text-cyan-300/90 rounded-xl border border-white/[0.08] text-[10px] font-mono overflow-x-auto max-h-60 custom-scrollbar">
                    {JSON.stringify(candidateContext.sourceLogging.mappedCandidateContext, null, 2)}
                  </pre>
                </details>
              </div>

              {/* Stage 3: Gemini Synthesis */}
              <div className="p-4 bg-[#030304] border border-white/[0.08] rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold uppercase text-purple-300 tracking-wider">
                    Stage 3: Gemini Synthesis
                  </span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded font-mono">
                    Synthesis Only
                  </span>
                </div>
                <p className="text-xs text-white/40 mb-3">
                  Narrative synthesis, notable claims, and interview hooks only.
                </p>
                <details className="text-xs">
                  <summary className="text-purple-400 hover:underline cursor-pointer font-mono text-[11px]">
                    View Synthesis Outputs
                  </summary>
                  <pre className="mt-2 p-3 bg-black text-amber-300/90 rounded-xl border border-white/[0.08] text-[10px] font-mono overflow-x-auto max-h-60 custom-scrollbar">
                    {JSON.stringify(candidateContext.sourceLogging.geminiSynthesis, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VERITAS AI Proctoring & Behavioral Assessment Scorecard */}
      {interview && (
        <ProctorScorecardViewer 
          proctoringReport={interview.proctoringReport} 
          suspiciousEvents={interview.suspiciousEvents} 
        />
      )}

      {/* Action Controls */}
      <ApplicationActions applicationId={application.id} currentStatus={application.status} />

      {/* AI Scorecard Result */}
      {interview && (interview.status === 'COMPLETED' || !!interview.scorecard || application.evaluationScore !== undefined) && (
        <ScorecardViewer interviewId={interview.id} initialScorecard={interview.scorecard} />
      )}
    </div>
  );
}
