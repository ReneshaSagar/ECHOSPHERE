import { InterviewState, FloorRequest, ActivePanelAgent, InterviewerProfile } from '@/lib/db';

/**
 * Technical trigger keywords that prompt the Technical Lead / Challenger to intervene.
 * Deterministic matching without expensive per-turn LLM calls.
 */
const SCALABILITY_TRIGGERS = [
  { pattern: /\b(\d+\s*(?:million|billion|m|k))\s*(?:req|request|query|event|user|tps|qps)/i, reason: 'candidate_claimed_high_scale', probeType: 'traffic_spike' },
  { pattern: /\b(distributed|sharding|partition|replica|replication|cluster)\b/i, reason: 'candidate_mentioned_distributed_storage', probeType: 'partition_tolerance' },
  { pattern: /\b(kafka|pubsub|event-driven|message\s*queue|rabbitmq)\b/i, reason: 'candidate_mentioned_event_streaming', probeType: 'backpressure_and_ordering' },
  { pattern: /\b(microservice|micro-service|service\s*mesh)\b/i, reason: 'candidate_mentioned_microservices', probeType: 'service_failure_and_latency' },
  { pattern: /\b(cache|redis|memcached|invalidation)\b/i, reason: 'candidate_mentioned_caching', probeType: 'cache_stampede_and_invalidation' },
  { pattern: /\b(concurrency|multithread|asyncio|race\s*condition|deadlock|mutex|lock)\b/i, reason: 'candidate_mentioned_concurrency', probeType: 'race_condition_prevention' },
  { pattern: /\b(rag|vector|embedding|cosine|faiss|chroma|pinecone)\b/i, reason: 'candidate_mentioned_rag_pipeline', probeType: 'vector_index_latency_and_drift' },
  { pattern: /\b(vllm|tensorrt|gpu|quantization|awq|fp8|speculative)\b/i, reason: 'candidate_mentioned_gpu_serving', probeType: 'gpu_memory_and_kv_cache' },
  { pattern: /\b(webrtc|turn|stun|sdp|ice|audio\s*track|real-time\s*voice)\b/i, reason: 'candidate_mentioned_webrtc_audio', probeType: 'packet_loss_and_jitter' },
  { pattern: /\b(kubernetes|k8s|helm|autoscaling|hpa|ingress)\b/i, reason: 'candidate_mentioned_kubernetes', probeType: 'graceful_pod_termination' }
];

/**
 * Initializes a shared interview state for a 2-agent technical panel.
 */
export function createInitialInterviewState(
  interviewId: string,
  primaryAgent: InterviewerProfile,
  challengerAgent: InterviewerProfile
): InterviewState {
  const activeAgents: ActivePanelAgent[] = [
    {
      agentId: primaryAgent.interviewerId,
      name: primaryAgent.name,
      role: primaryAgent.role,
      voice: primaryAgent.voice,
      color: primaryAgent.color,
      isPrimary: true,
      isActive: true,
      hasFloor: true
    },
    {
      agentId: challengerAgent.interviewerId,
      name: challengerAgent.name,
      role: challengerAgent.role,
      voice: challengerAgent.voice,
      color: challengerAgent.color,
      isPrimary: false,
      isActive: true,
      hasFloor: false
    }
  ];

  return {
    interviewId,
    currentRound: 'technical',
    currentSpeaker: primaryAgent.interviewerId,
    conversationSummary: 'Technical panel interview initialized.',
    questionsAsked: [],
    topicsCovered: [],
    evidenceCollected: [],
    agentFloorRequests: [],
    roundProgress: 0,
    interviewStatus: 'IN_PROGRESS',
    activeAgents,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Records a candidate utterance into the shared state.
 * Evaluates whether the Technical Lead / Challenger should request the floor.
 */
export function recordCandidateUtterance(
  state: InterviewState,
  utterance: string
): { updatedState: InterviewState; newFloorRequest?: FloorRequest } {
  const clean = utterance.trim();
  if (!clean) return { updatedState: state };

  const updated = { ...state };
  updated.candidateAnswer = clean;
  updated.updatedAt = new Date().toISOString();

  // Extract quick evidence snippet
  if (clean.length > 50) {
    const summarySnippet = clean.slice(0, 140) + (clean.length > 140 ? '...' : '');
    if (!updated.evidenceCollected.includes(summarySnippet)) {
      updated.evidenceCollected = [...updated.evidenceCollected, summarySnippet];
    }
  }

  // Check if candidate explicitly addressed an agent by name
  let targetAgent: ActivePanelAgent | undefined;
  for (const agent of updated.activeAgents) {
    if (agent.isActive && clean.toLowerCase().includes(agent.name.toLowerCase())) {
      targetAgent = agent;
      break;
    }
  }

  if (targetAgent && !targetAgent.hasFloor) {
    const floorReq: FloorRequest = {
      id: `flr_${Math.random().toString(36).substring(2, 7)}`,
      agentId: targetAgent.agentId,
      agentName: targetAgent.name,
      reason: `candidate_explicitly_addressed_${targetAgent.name.toLowerCase()}`,
      urgency: 'high',
      proposedProbe: `Candidate addressed ${targetAgent.name} directly.`,
      timestamp: Date.now()
    };
    updated.agentFloorRequests = [...updated.agentFloorRequests, floorReq];
    return { updatedState: updated, newFloorRequest: floorReq };
  }

  // During technical round, evaluate if the Challenger agent should intervene
  if (updated.currentRound === 'technical') {
    const challenger = updated.activeAgents.find(a => !a.isPrimary && a.isActive);

    if (challenger && !challenger.hasFloor) {
      // Check for scalability and architecture triggers
      for (const trigger of SCALABILITY_TRIGGERS) {
        const match = clean.match(trigger.pattern);
        if (match) {
          const alreadyRequested = updated.agentFloorRequests.some(r => r.reason === trigger.reason);
          if (!alreadyRequested) {
            const floorReq: FloorRequest = {
              id: `flr_${Math.random().toString(36).substring(2, 7)}`,
              agentId: challenger.agentId,
              agentName: challenger.name,
              reason: trigger.reason,
              urgency: 'high',
              proposedProbe: `Candidate claimed "${match[0]}". Probe ${trigger.probeType.replace(/_/g, ' ')}.`,
              timestamp: Date.now()
            };
            updated.agentFloorRequests = [...updated.agentFloorRequests, floorReq];
            return { updatedState: updated, newFloorRequest: floorReq };
          }
        }
      }
    }
  }

  return { updatedState: updated };
}

/**
 * Deterministic Turn Arbiter floor control decision.
 * Determines who speaks next without expensive per-turn LLM calls.
 */
export function arbitrateNextTurn(state: InterviewState): {
  nextSpeakerId: string;
  nextSpeakerName: string;
  action: 'continue' | 'intervene' | 'handoff';
  grantedRequest?: FloorRequest;
  updatedState: InterviewState;
} {
  const updated = { ...state };
  const primary = updated.activeAgents.find(a => a.isPrimary && a.isActive);
  const challenger = updated.activeAgents.find(a => !a.isPrimary && a.isActive);

  // If there are floor requests from the challenger, grant floor to challenger
  if (updated.agentFloorRequests.length > 0) {
    const granted = updated.agentFloorRequests[0];
    updated.agentFloorRequests = updated.agentFloorRequests.slice(1);

    // Update floor ownership
    updated.currentSpeaker = granted.agentId;
    updated.activeAgents = updated.activeAgents.map(a => ({
      ...a,
      hasFloor: a.agentId === granted.agentId
    }));
    updated.updatedAt = new Date().toISOString();

    return {
      nextSpeakerId: granted.agentId,
      nextSpeakerName: granted.agentName,
      action: 'intervene',
      grantedRequest: granted,
      updatedState: updated
    };
  }

  // Otherwise, default back to Primary Interviewer to drive the blueprint
  const defaultAgent = primary || updated.activeAgents.find(a => a.isActive) || { agentId: 'system', name: 'Interviewer' };
  
  updated.currentSpeaker = defaultAgent.agentId;
  updated.activeAgents = updated.activeAgents.map(a => ({
    ...a,
    hasFloor: a.agentId === defaultAgent.agentId
  }));
  updated.updatedAt = new Date().toISOString();

  return {
    nextSpeakerId: defaultAgent.agentId,
    nextSpeakerName: defaultAgent.name,
    action: 'continue',
    updatedState: updated
  };
}

/**
 * Records an agent question / turn into the shared state.
 */
export function recordAgentTurn(
  state: InterviewState,
  agentId: string,
  question: string,
  topic?: string
): InterviewState {
  const clean = question.trim();
  const updated = { ...state };

  updated.lastQuestion = clean;
  updated.currentSpeaker = agentId;
  updated.questionsAsked = [...updated.questionsAsked, clean];

  if (topic && !updated.topicsCovered.includes(topic)) {
    updated.topicsCovered = [...updated.topicsCovered, topic];
  }

  // Calculate rough round progress
  const targetQuestions = updated.currentRound === 'technical' ? 8 : 4;
  updated.roundProgress = Math.min(100, Math.round((updated.questionsAsked.length / targetQuestions) * 100));
  updated.updatedAt = new Date().toISOString();

  return updated;
}

/**
 * Transitions state to HR Round cleanly.
 * DEACTIVATES technical agents, ACTIVATES single HR agent.
 * Prepares HR agent with technical summary and evidence.
 */
export function transitionToHRRound(
  state: InterviewState,
  hrAgent: InterviewerProfile,
  technicalScore: number,
  technicalDecisionReason: string
): InterviewState {
  const updated = { ...state };

  updated.currentRound = 'hr';
  updated.interviewStatus = 'IN_PROGRESS';
  updated.roundProgress = 0;
  updated.agentFloorRequests = [];
  updated.currentSpeaker = hrAgent.interviewerId;

  // Deactivate all technical agents, activate HR agent
  updated.activeAgents = [
    {
      agentId: hrAgent.interviewerId,
      name: hrAgent.name,
      role: hrAgent.role,
      voice: hrAgent.voice,
      color: hrAgent.color,
      isPrimary: true,
      isActive: true,
      hasFloor: true
    }
  ];

  // Store technical summary for HR reference
  const techEvidenceSummary = `Technical Round Passed (Score: ${technicalScore}/100). Highlights: ${updated.evidenceCollected.slice(0, 3).join('; ')}. Panel Notes: ${technicalDecisionReason}`;
  updated.conversationSummary = `${updated.conversationSummary}\n--- TECHNICAL ROUND COMPLETED ---\n${techEvidenceSummary}`;
  updated.updatedAt = new Date().toISOString();

  return updated;
}
