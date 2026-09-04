import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { 
  Bot, 
  Terminal, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowLeft, 
  Cpu, 
  FileCode,
  Layers,
  Radio
} from 'lucide-react';
import { injectKnowledgeBaseIntoAgentInstructions } from '@/lib/enrichment/knowledgeBase';

export default async function AgentPersonaInspectorPage({ params }: { params: Promise<{ blueprintId: string }> }) {
  const resolvedParams = await params;
  const targetId = resolvedParams.blueprintId;
  const db = getDb();

  // Find blueprint or interview by ID
  const blueprint = db.blueprints.find(b => 
    b.id === targetId || 
    b.interviewId === targetId
  );

  const interview = blueprint 
    ? db.interviews.find(i => i.id === blueprint.interviewId)
    : db.interviews.find(i => i.id === targetId);

  const application = interview ? db.applications.find(a => a.id === interview.applicationId) : null;
  const candidate = application ? db.candidates.find(c => c.id === application.candidateId) : null;
  const job = application ? db.jobs.find(j => j.id === application.jobId) : null;

  let parsedBlueprint = null;
  if (blueprint) {
    try {
      parsedBlueprint = JSON.parse(blueprint.blueprintJson);
    } catch (e) {}
  }

  const candidateContext = application?.candidateContext || (candidate as any)?.candidateContext;

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link 
              href={`/interview/${interview?.id || targetId}`}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Interview Room</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <Bot className="w-8 h-8 text-blue-500" />
              AI Agent Persona & Prompt Inspector
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Transparent inspection of the exact system instructions, greeting prompt, and anti-hallucination grounding sent to Agora Gemini Live.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-300 font-mono text-xs">
              Interview: {interview?.id || targetId}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 font-mono text-xs">
              Blueprint: {blueprint?.id || 'default'}
            </span>
          </div>
        </div>

        {/* Candidate & Position Metadata Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
          <div>
            <div className="text-xs font-bold uppercase text-gray-500 tracking-wider">Candidate</div>
            <div className="text-lg font-bold text-white mt-1">{candidate?.name || 'Unknown Candidate'}</div>
            <div className="text-xs text-gray-400 mt-0.5">{candidate?.email || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-gray-500 tracking-wider">Target Position</div>
            <div className="text-lg font-bold text-blue-400 mt-1">{job?.title || 'Unknown Position'}</div>
            <div className="text-xs text-gray-400 mt-0.5">{(job as any)?.department || 'Engineering'}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-gray-500 tracking-wider">Agora Real-Time Vendor</div>
            <div className="text-lg font-bold text-purple-400 mt-1 flex items-center gap-2">
              <Radio className="w-4 h-4 animate-pulse text-purple-400" />
              Gemini Live Preview
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Model: gemini-3.1-flash-live-preview (Charon voice)</div>
          </div>
        </div>

        {/* Round Persona & Instructions Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Active Interview Rounds & Multi-Agent Panel System Prompts
            </h2>
            <span className="text-xs text-gray-400">
              {parsedBlueprint?.interview_rounds?.length || 0} configured rounds
            </span>
          </div>

          {parsedBlueprint?.interview_rounds?.map((round: any, idx: number) => {
            const interviewers = round.interviewers && round.interviewers.length > 0
              ? round.interviewers
              : [round.interviewer];

            return (
            <div 
              key={idx} 
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Round Header */}
              <div className="p-5 bg-slate-800/60 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{round.round_name}</h3>
                    <p className="text-xs text-gray-400">{round.purpose}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-slate-700 text-gray-300 font-medium">
                    Panel: <strong>{interviewers.map((inv: any) => `${inv?.name || 'Interviewer'} (${inv?.role || 'Lead'})`).join(' & ')}</strong>
                  </span>
                </div>
              </div>

              {/* Multi-Agent Cards */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {interviewers.map((inv: any, iIdx: number) => {
                    const injectedInstructions = injectKnowledgeBaseIntoAgentInstructions(
                      inv?.instructions || '',
                      candidateContext,
                      candidate?.name || 'Candidate',
                      job?.title || 'Engineering Role',
                      application?.resumeText
                    );

                    return (
                      <div key={iIdx} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs"
                              style={{ backgroundColor: inv?.color || (iIdx === 0 ? '#3B82F6' : '#8B5CF6') }}
                            >
                              {inv?.name?.[0] || 'A'}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{inv?.name}</div>
                              <div className="text-2xs text-gray-400">{inv?.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-3xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              Voice: {inv?.voice || 'Aoede'}
                            </span>
                            <span className="text-3xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 font-bold uppercase">
                              {inv?.is_primary ?? (iIdx === 0) ? 'Primary' : 'Challenger'}
                            </span>
                          </div>
                        </div>

                        {/* Opening Greeting */}
                        <div>
                          <div className="text-3xs font-bold uppercase text-emerald-400 tracking-wider mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Opening Greeting
                          </div>
                          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80 font-mono text-xs text-emerald-300 leading-relaxed">
                            &quot;{inv?.greeting_message}&quot;
                          </div>
                        </div>

                        {/* Injected System Instructions */}
                        <div>
                          <div className="text-3xs font-bold uppercase text-blue-400 tracking-wider mb-1 flex items-center gap-1">
                            <FileCode className="w-3 h-3" />
                            Grounded System Prompt
                          </div>
                          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80 font-mono text-3xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                            {injectedInstructions}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Topics Covered */}
                {round.topics && round.topics.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
                      Core Evaluation Topics
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {round.topics.map((t: string, ti: number) => (
                        <span key={ti} className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>

        {/* Anti-Hallucination & Relevance Filter Context */}
        {candidateContext && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Anti-Hallucination & Correlation Layer
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Data extracted from verified Resume, LinkedIn, and GitHub used to ground the agent and prevent topic hallucination.
              </p>
            </div>

            {/* Ignored / Excluded Topics */}
            {candidateContext?.interviewContext?.ignoredOrLowRelevanceTopics && candidateContext.interviewContext.ignoredOrLowRelevanceTopics.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Irrelevant / Low-Relevance Topics Filtered Out (Explicitly Omitted from Questions)
                </div>
                <ul className="space-y-1.5 text-xs text-rose-300/90 font-mono list-disc list-inside">
                  {candidateContext.interviewContext.ignoredOrLowRelevanceTopics.map((topic: string, i: number) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Technical Interview Hooks */}
            {candidateContext?.interviewContext?.technicalInterviewHooks && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase text-blue-400 tracking-wider">
                  Verified Technical Hooks (Candidate-Grounded)
                </div>
                <div className="space-y-2">
                  {candidateContext.interviewContext.technicalInterviewHooks.map((hook: string, i: number) => (
                    <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-gray-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{hook}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corroborated Skills */}
            {candidateContext?.crossSourceContext?.corroboratedSkills && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                  Corroborated Skills Across Sources
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidateContext.crossSourceContext.corroboratedSkills.map((s: any, i: number) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 flex items-center gap-1.5">
                      <span>{s.skill}</span>
                      <span className="text-[10px] text-emerald-500 font-mono">({s.sources?.join('+')})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Backend API Payload Format */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-gray-400" />
            Agora MLLM Backend Multi-Agent Dispatch Payloads
          </h2>
          <p className="text-xs text-gray-400">
            When the candidate starts the Technical Round, the frontend dispatches dynamic agent sessions for both Primary and Challenger agents into the same Agora RTC channel:
          </p>
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-yellow-300 overflow-x-auto">
{JSON.stringify({
  primary_agent_dispatch: {
    endpoint: "POST /api/agora-mllm/start-dynamic-mllm",
    payload: {
      session_id: `ses_${interview?.id || 'int_01'}_rd0`,
      candidate_uid: 1000,
      agent_uid: 9991,
      voice: parsedBlueprint?.interview_rounds?.[0]?.interviewers?.[0]?.voice || "Aoede",
      greeting_message: parsedBlueprint?.interview_rounds?.[0]?.interviewers?.[0]?.greeting_message || "Opening technical greeting"
    }
  },
  challenger_agent_dispatch: {
    endpoint: "POST /api/agora-mllm/start-dynamic-mllm",
    payload: {
      session_id: `ses_${interview?.id || 'int_01'}_rd0`,
      candidate_uid: 1000,
      agent_uid: 9992,
      voice: parsedBlueprint?.interview_rounds?.[0]?.interviewers?.[1]?.voice || "Charon",
      greeting_message: parsedBlueprint?.interview_rounds?.[0]?.interviewers?.[1]?.greeting_message || "Specialist challenge opening"
    }
  },
  turn_arbiter_floor_control: {
    deterministic_rule: "Challenger intervenes when candidate mentions scalability, concurrency, RAG, or distributed storage",
    state_sync: "POST /api/interviews/:id/state"
  }
}, null, 2)}
          </pre>
        </div>

      </div>
    </div>
  );
}
