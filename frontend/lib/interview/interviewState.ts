import { 
  InterviewState, 
  FloorState, 
  AnswerClassification, 
  FloorRequest, 
  StructuredFloorRequest, 
  ActivePanelAgent, 
  InterviewerProfile, 
  CompetencyEvidence, 
  CompetencyTracker 
} from '@/lib/db';

/**
 * Detects whether an interviewer utterance indicates the round or overall interview is concluding.
 */
export function isClosingUtterance(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase().trim();
  if (clean.length < 12) return false;

  const closingPatterns = [
    /(conclude|concludes|concluding|wrap\s*up|wraps\s*up|end\s*of)\s*(our|the|this)?\s*([a-z-]+\s+)?(interview|discussion|round|session|call|panel)/i,
    /(that('s|\s+is)\s+all\s+(the\s+questions\s+)?(i|we)\s+have)/i,
    /(that\s+is\s+everything\s+(for\s+today|i\s+have|we\s+need))/i,
    /(we('re|\s+are)\s+all\s+done\s+for\s+today)/i,
    /(interview\s+is\s+(now\s+)?(over|concluded|complete|finished|wrapped\s*up))/i,
    /(brings\s+(us|our\s+session|this)\s+to\s+(a\s+close|an\s+end|the\s+end))/i,
    /(covers?\s+all\s+(the\s+topics|our\s+questions|what\s+we\s+needed))/i,
    /(thank\s+you\s+for\s+your\s+time\s+today.*(next\s+steps|team\s+will|recruiter|in\s+touch|follow\s*up|get\s+back))/i,
    /(best\s+of\s+luck\s+with\s+(the\s+rest|the\s+hiring|your\s+process|next\s+steps))/i,
    /(hiring\s+team|recruiting\s+team|talent\s+team)\s+will\s+(be\s+in\s+touch|reach\s+out|follow\s*up)/i,
    /(that\s+wraps\s+up\s+(the\s+technical\s+round|our\s+technical\s+round|this\s+round))/i
  ];

  return closingPatterns.some(pattern => pattern.test(clean));
}

/**
 * Architectural triggers that indicate the Candidate made a concrete technical claim.
 * Used by the Challenger agent to formulate structured floor requests.
 */
export const ARCHITECTURAL_TRIGGERS = [
  { pattern: /\b(\d+\s*(?:million|billion|m|k))\s*(?:req|request|query|event|user|tps|qps|rps)/i, reason: 'candidate_claimed_high_scale', competency: 'Scalability & Throughput', probeType: 'traffic_spike' },
  { pattern: /\b(distributed|sharding|partition|replica|replication|cluster|postgres|sql|nosql|mongo|database)\b/i, reason: 'candidate_claimed_distributed_storage', competency: 'Distributed Systems & Partitioning', probeType: 'partition_tolerance' },
  { pattern: /\b(kafka|pubsub|event-driven|message\s*queue|rabbitmq|stream|queue|pipeline)\b/i, reason: 'candidate_claimed_event_streaming', competency: 'Event Streaming & Backpressure', probeType: 'backpressure_and_ordering' },
  { pattern: /\b(microservice|micro-service|service\s*mesh|api\s*gateway|grpc)\b/i, reason: 'candidate_claimed_microservices', competency: 'Service Architecture & Latency', probeType: 'service_failure_and_latency' },
  { pattern: /\b(cache|redis|memcached|invalidation|ttl)\b/i, reason: 'candidate_claimed_caching_layer', competency: 'Caching & Data Consistency', probeType: 'cache_stampede_and_invalidation' },
  { pattern: /\b(concurrency|multithread|asyncio|race\s*condition|deadlock|mutex|lock|goroutine|channel|thread)\b/i, reason: 'candidate_claimed_concurrency_model', competency: 'Concurrency & Thread Safety', probeType: 'race_condition_prevention' },
  { pattern: /\b(rag|vector|embedding|cosine|faiss|chroma|pinecone|llm|model)\b/i, reason: 'candidate_claimed_rag_pipeline', competency: 'AI/Vector Infrastructure', probeType: 'vector_index_latency_and_drift' },
  { pattern: /\b(webrtc|turn|stun|sdp|ice|audio\s*track|real-time\s*voice|socket|websocket)\b/i, reason: 'candidate_claimed_webrtc_audio', competency: 'Real-Time Media Transport', probeType: 'packet_loss_and_jitter' },
  { pattern: /\b(raft|paxos|consensus|quorum|leader\s*election|split-brain|chronos)\b/i, reason: 'candidate_claimed_distributed_consensus', competency: 'Consensus & Failure Recovery', probeType: 'split_brain_and_network_partitions' }
];

export interface CandidateDirectedResult {
  directedTo: 'challenger' | 'primary' | 'none';
  matchedName?: string;
  reason?: string;
}

export interface PrimaryDecision {
  action: 'CONTINUE' | 'FOLLOW_UP' | 'ADVANCE' | 'NO_INTERVENTION';
  reason: string;
  proposedQuestion?: string;
  targetCompetency?: string;
}

export interface ChallengerDecision {
  action: 'NO_INTERVENTION' | 'REQUEST_FLOOR';
  reason: string;
  priority?: 'low' | 'medium' | 'high';
  proposedProbe?: string;
  targetCompetency?: string;
  request?: {
    agentId: string;
    agentName: string;
    reason: string;
    targetCompetency: string;
    priority: 'low' | 'medium' | 'high';
    proposedProbe: string;
  };
}

export interface ArbiterDecision {
  winningAgent: 'primary' | 'challenger' | 'hr';
  winningAgentName: string;
  action: string;
  reason: string;
}

/**
 * Detects whether candidate explicitly addressed an interviewer by name or role.
 * In a peer panel, if candidate says "Arjun, what do you think?", Arjun is given the floor.
 */
export function detectCandidateDirectedInterviewer(
  utterance: string,
  activeAgents: ActivePanelAgent[] = []
): CandidateDirectedResult {
  const clean = utterance.trim();
  if (!clean || clean.length < 3) return { directedTo: 'none' };

  const challengerAgent = activeAgents.find(a => !a.isPrimary && a.isActive);
  const primaryAgent = activeAgents.find(a => a.isPrimary && a.isActive);

  // Common Challenger names & designations
  const challengerNames = [
    challengerAgent?.name?.toLowerCase(),
    challengerAgent?.name?.split(' ')?.[0]?.toLowerCase(),
    'arjun', 'malhotra', 'karan', 'tanvi', 'dev', 'natasha', 'specialist', 'challenger'
  ].filter(Boolean) as string[];

  // Common Primary names & designations
  const primaryNames = [
    primaryAgent?.name?.toLowerCase(),
    primaryAgent?.name?.split(' ')?.[0]?.toLowerCase(),
    'priya', 'nair', 'aditya', 'neha', 'kabir', 'alok', 'siddharth', 'lead'
  ].filter(Boolean) as string[];

  for (const name of challengerNames) {
    // Matches "Arjun,", "Arjun?", "Hey Arjun", "to Arjun", "ask Arjun", "Arjun what do you think", "what do you think Arjun"
    const regex = new RegExp(`(^|\\b|hey\\s+|hi\\s+|to\\s+|for\\s+|ask\\s+|with\\s+)${name}(\\b|,|\\?|!|\\s+)`, 'i');
    if (regex.test(clean)) {
      return { 
        directedTo: 'challenger', 
        matchedName: challengerAgent?.name || 'Arjun Malhotra',
        reason: `Candidate directly addressed ${challengerAgent?.name || 'Challenger'}`
      };
    }
  }

  for (const name of primaryNames) {
    const regex = new RegExp(`(^|\\b|hey\\s+|hi\\s+|to\\s+|for\\s+|ask\\s+|with\\s+)${name}(\\b|,|\\?|!|\\s+)`, 'i');
    if (regex.test(clean)) {
      return { 
        directedTo: 'primary', 
        matchedName: primaryAgent?.name || 'Priya Nair',
        reason: `Candidate directly addressed ${primaryAgent?.name || 'Primary'}`
      };
    }
  }

  return { directedTo: 'none' };
}

/**
 * Sets the authoritative floor state and derives active agent floor ownership strictly.
 * Invariant: At most ONE AI speaker holds the floor at any time.
 */
export function setAuthoritativeFloorState(state: InterviewState, newFloorState: FloorState): InterviewState {
  const updated = { ...state };
  updated.floorState = newFloorState;
  updated.updatedAt = new Date().toISOString();

  // Derive hasFloor boolean strictly from authoritative floorState
  updated.activeAgents = updated.activeAgents.map(agent => {
    let hasFloor = false;
    if (newFloorState === 'PRIMARY_SPEAKING' && agent.isPrimary && updated.currentRound === 'technical') {
      hasFloor = true;
    } else if (newFloorState === 'CHALLENGER_SPEAKING' && !agent.isPrimary && updated.currentRound === 'technical') {
      hasFloor = true;
    } else if (newFloorState === 'HR_SPEAKING' && updated.currentRound === 'hr') {
      hasFloor = true;
    }
    return { ...agent, hasFloor };
  });

  if (newFloorState === 'PRIMARY_SPEAKING') {
    const primary = updated.activeAgents.find(a => a.isPrimary);
    if (primary) updated.currentSpeaker = primary.agentId;
  } else if (newFloorState === 'CHALLENGER_SPEAKING') {
    const challenger = updated.activeAgents.find(a => !a.isPrimary);
    if (challenger) updated.currentSpeaker = challenger.agentId;
  } else if (newFloorState === 'HR_SPEAKING') {
    const hr = updated.activeAgents[0];
    if (hr) updated.currentSpeaker = hr.agentId;
  } else if (newFloorState === 'CANDIDATE_SPEAKING') {
    updated.currentSpeaker = 'candidate';
  }

  return updated;
}

/**
 * Classifies candidate utterance according to the hard 8-point answer taxonomy.
 */
export function classifyCandidateAnswer(utterance: string, previousAttemptsOnQuestion: number = 0): {
  classification: AnswerClassification;
  qualityScore: number;
  isGibberish: boolean;
  verbatimQuote?: string;
} {
  const clean = utterance.trim();
  if (!clean || clean.length < 4) {
    return { classification: 'NO_ANSWER', qualityScore: 0, isGibberish: false };
  }

  // Check for repeated non-answers (candidate failed after 2 attempts)
  if (previousAttemptsOnQuestion >= 2 && clean.length < 30) {
    return { classification: 'REPEATED_NON_ANSWER', qualityScore: 10, isGibberish: false };
  }

  // Common evasion / silence / refusal phrases
  if (/^(i\s*don'?t\s*know|no\s*idea|can\s*we\s*skip|pass|not\s*sure|i\s*am\s*not\s*sure|next\s*question|let'?s\s*move\s*on)\b/i.test(clean)) {
    return { classification: 'NO_ANSWER', qualityScore: 10, isGibberish: false };
  }

  // Gibberish detection: keyboard mashing, repeated characters, very high entropy of nonsense tokens
  const words = clean.split(/\s+/).filter(Boolean);
  const repeatedWords = words.filter((w, i) => words.indexOf(w) !== i && w.length > 3);
  const repetitionRatio = words.length > 0 ? repeatedWords.length / words.length : 0;
  const avgWordLength = words.reduce((acc, w) => acc + w.length, 0) / (words.length || 1);

  const keyboardMashing = /(asdf|qwer|zxcv|hjkl|jkl;|1234|test test|blah blah|lorem ipsum)/i.test(clean);
  const techTermMatches = clean.match(/\b(api|async|await|batch|buffer|cache|channel|cluster|concurrency|database|deadlock|distributed|event|goroutine|grpc|http|index|kafka|latency|lock|log|memory|message|microservice|mutex|network|node|optimize|packet|partition|pipeline|postgres|process|proto|pubsub|query|queue|raft|redis|replica|request|scale|server|service|socket|stream|sync|tcp|thread|throughput|timeout|transaction|vector|webrtc|websocket)\b/gi) || [];

  if (keyboardMashing || repetitionRatio > 0.6 || avgWordLength > 18 || (words.length > 4 && techTermMatches.length === 0 && !/[a-zA-Z]{3,}/.test(clean))) {
    return { classification: 'GIBBERISH', qualityScore: 5, isGibberish: true };
  }

  // Vague / hand-wavey: lacks concrete technical nouns or architectural mechanisms
  if (words.length < 6 && techTermMatches.length === 0) {
    if (/\b(yes|no|maybe|idk|sure|ok|okay|fine|stuff|thing|things|standard|normal|good)\b/i.test(clean)) {
      return { classification: 'VAGUE', qualityScore: 25, isGibberish: false };
    }
  }

  // Irrelevant: off-topic chatter (e.g. talking about the weather or personal hobbies when asked about Raft/Kafka)
  if (/\b(weather|movie|game|football|cricket|lunch|dinner|vacation)\b/i.test(clean) && techTermMatches.length === 0) {
    return { classification: 'IRRELEVANT', qualityScore: 15, isGibberish: false };
  }

  // Incorrect reasoning flag heuristic (e.g. claims TCP ensures zero latency or in-memory map survives process crash without WAL)
  if (/\b(tcp.*zero latency|redis.*never loses data without persistence|mutex.*prevents network partition)\b/i.test(clean)) {
    return { classification: 'INCORRECT', qualityScore: 35, isGibberish: false };
  }

  // Strong answer: long enough, contains concrete technical keywords and structured explanations
  if (clean.length >= 50 && techTermMatches.length >= 2) {
    const verbatimQuote = clean.slice(0, 160) + (clean.length > 160 ? '...' : '');
    return { classification: 'VALID_STRONG', qualityScore: 85, isGibberish: false, verbatimQuote };
  }

  if (clean.length >= 25 && techTermMatches.length >= 1) {
    const verbatimQuote = clean.slice(0, 120) + (clean.length > 120 ? '...' : '');
    return { classification: 'VALID_PARTIAL', qualityScore: 65, isGibberish: false, verbatimQuote };
  }

  return { classification: 'VAGUE', qualityScore: 35, isGibberish: false };
}

/**
 * Initializes a shared interview state for a 2-agent technical panel.
 */
export function createInitialInterviewState(
  interviewId: string,
  primaryAgent: InterviewerProfile,
  challengerAgent: InterviewerProfile,
  initialCompetencies: string[] = [
    'Concurrency & Thread Safety',
    'Distributed Systems & Consensus',
    'Event Streaming & Throughput',
    'Caching & Resilience'
  ]
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

  const competencyTrackers: CompetencyTracker[] = initialCompetencies.map(comp => ({
    competency: comp,
    questionsAsked: [],
    candidateResponses: [],
    evidence: [],
    evidenceQuality: 'NONE',
    followUps: [],
    sufficientEvidence: false,
    score: 0
  }));

  return {
    interviewId,
    currentRound: 'technical',
    floorState: 'PRIMARY_SPEAKING',
    currentSpeaker: primaryAgent.interviewerId,
    conversationSummary: 'Technical panel interview initialized.',
    questionsAsked: [],
    topicsCovered: [],
    evidenceCollected: [],
    structuredEvidence: [],
    competencyTrackers,
    structuredFloorRequests: [],
    agentFloorRequests: [],
    lastChallengerTurnTime: 0,
    lastChallengerTurnIndex: 0,
    roundProgress: 0,
    interviewStatus: 'IN_PROGRESS',
    activeAgents,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Evaluates and processes a structured Challenger floor request using strict arbiter rules.
 * 
 * Verification rules:
 * 1. Candidate is not currently speaking.
 * 2. Primary is not currently speaking.
 * 3. No transition/closing state is active.
 * 4. Challenger has not recently spoken (cooldown: at least 2 questions and 25s elapsed).
 * 5. Proposed probe is relevant to target competency.
 * 6. Probe is not a duplicate of an existing question.
 * 7. Intervening adds meaningful evidence.
 */
export function evaluateChallengerFloorRequest(
  state: InterviewState,
  request: {
    agentId: string;
    agentName: string;
    reason: string;
    targetCompetency: string;
    priority: 'low' | 'medium' | 'high';
    proposedProbe?: string;
  },
  isPostUtterance: boolean = false
): { granted: boolean; updatedState: InterviewState; decisionReason: string } {
  const updated = { ...state };
  const now = Date.now();

  const reqId = `flr_${Math.random().toString(36).substring(2, 7)}`;
  const floorReq: StructuredFloorRequest = {
    id: reqId,
    agent: 'challenger',
    agentId: request.agentId,
    agentName: request.agentName,
    requestFloor: true,
    reason: request.reason,
    targetCompetency: request.targetCompetency,
    priority: request.priority,
    proposedProbe: request.proposedProbe,
    timestamp: now,
    status: 'pending'
  };

  if (!updated.structuredFloorRequests) updated.structuredFloorRequests = [];

  // Check Rule 1 & 2: Speaker state (unless evaluating post-utterance where candidate just completed turn)
  if (!isPostUtterance && updated.floorState === 'CANDIDATE_SPEAKING') {
    floorReq.status = 'denied';
    updated.structuredFloorRequests.push(floorReq);
    return { granted: false, updatedState: updated, decisionReason: 'Denied: Candidate is actively speaking.' };
  }

  // Check Rule 3: Closing / Transition state
  if (updated.floorState === 'TECHNICAL_CLOSING' || updated.floorState === 'HR_CLOSING' || updated.floorState === 'TRANSITIONING') {
    floorReq.status = 'denied';
    updated.structuredFloorRequests.push(floorReq);
    return { granted: false, updatedState: updated, decisionReason: 'Denied: Round closing or transition in progress.' };
  }

  // Check Rule 4: Challenger turn cooldown (at least 2 questions asked since last turn, and at least 25s elapsed)
  // Direct candidate address bypasses routine cooldown
  const isDirectAddress = request.reason === 'candidate_directly_addressed_challenger' || request.priority === 'high';
  const questionsSinceLastTurn = updated.questionsAsked.length - (updated.lastChallengerTurnIndex || 0);
  const timeSinceLastTurnMs = now - (updated.lastChallengerTurnTime || 0);
  if (!isDirectAddress && updated.lastChallengerTurnTime && (questionsSinceLastTurn < 2 || timeSinceLastTurnMs < 25000)) {
    floorReq.status = 'denied';
    updated.structuredFloorRequests.push(floorReq);
    return { granted: false, updatedState: updated, decisionReason: `Denied: Challenger on cooldown (${questionsSinceLastTurn} questions / ${Math.round(timeSinceLastTurnMs/1000)}s elapsed).` };
  }

  // Check Rule 6: Duplicate question check
  if (request.proposedProbe && updated.questionsAsked.some(q => q.toLowerCase().includes(request.proposedProbe!.toLowerCase().slice(0, 30)))) {
    floorReq.status = 'denied';
    updated.structuredFloorRequests.push(floorReq);
    return { granted: false, updatedState: updated, decisionReason: 'Denied: Proposed probe duplicates a question already asked.' };
  }

  // Grant Floor!
  floorReq.status = 'granted';
  updated.structuredFloorRequests.push(floorReq);
  updated.lastChallengerTurnTime = now;
  updated.lastChallengerTurnIndex = updated.questionsAsked.length;
  
  const stateWithFloor = setAuthoritativeFloorState(updated, 'CHALLENGER_SPEAKING');
  return { 
    granted: true, 
    updatedState: stateWithFloor, 
    decisionReason: `Granted: ${request.reason} for ${request.targetCompetency}.` 
  };
}

/**
 * Checks whether the current round has met natural completion criteria.
 * The timer is a MAXIMUM ceiling; natural completion wraps up the round immediately.
 */
export function checkRoundCompletionCriteria(state: InterviewState): {
  isComplete: boolean;
  completionReason: 'ALL_COMPETENCIES_ASSESSED' | 'MAX_QUESTIONS_REACHED' | 'CONSECUTIVE_FAILURES' | 'NONE';
  summary: string;
} {
  if (state.interviewStatus === 'COMPLETED' || state.floorState === 'TECHNICAL_CLOSING' || state.floorState === 'HR_CLOSING') {
    return { isComplete: true, completionReason: 'ALL_COMPETENCIES_ASSESSED', summary: 'Round already in closing state.' };
  }

  const trackers = state.competencyTrackers || [];
  const totalEvidenceCount = trackers.reduce((acc, t) => acc + (t.evidence?.length || 0), 0);
  const sufficientCompetencies = trackers.filter(t => t.sufficientEvidence || (t.evidence && t.evidence.length >= 2)).length;
  const questionsCount = state.questionsAsked?.length || 0;

  // Never conclude a round prematurely before at least 3 genuine questions have been asked
  if (questionsCount < 3) {
    return { isComplete: false, completionReason: 'NONE', summary: 'Round in progress: awaiting core questions.' };
  }

  // Check for consecutive non-answers / failures (last 3 candidate utterances after core questions have begun)
  const recentEvidence = state.structuredEvidence?.slice(-3) || [];
  if (recentEvidence.length >= 3 && recentEvidence.every(e => e.classification !== 'VALID_STRONG' && e.classification !== 'VALID_PARTIAL')) {
    return {
      isComplete: true,
      completionReason: 'CONSECUTIVE_FAILURES',
      summary: 'Candidate demonstrated repeated non-answers/unintelligible responses across consecutive questions. Concluding round for evaluation.'
    };
  }

  // Technical Round Natural Completion
  if (state.currentRound === 'technical') {
    // Condition A: Evidence collected across key competencies
    if ((sufficientCompetencies >= 2 || totalEvidenceCount >= 3) && questionsCount >= 3) {
      return {
        isComplete: true,
        completionReason: 'ALL_COMPETENCIES_ASSESSED',
        summary: `Assessed core technical domains with ${totalEvidenceCount} verbatim evidence items across ${questionsCount} questions. Technical criteria satisfied.`
      };
    }

    // Condition B: Target question quota reached
    if (questionsCount >= 4 && totalEvidenceCount >= 2) {
      return {
        isComplete: true,
        completionReason: 'MAX_QUESTIONS_REACHED',
        summary: `Completed ${questionsCount} technical questions with sufficient evidence collection.`
      };
    }
  }

  // HR Round Natural Completion
  if (state.currentRound === 'hr') {
    if (questionsCount >= 3 || (sufficientCompetencies >= 1 && questionsCount >= 2)) {
      return {
        isComplete: true,
        completionReason: 'ALL_COMPETENCIES_ASSESSED',
        summary: `HR & Culture discussion completed with ${questionsCount} questions covered.`
      };
    }
  }

  return { isComplete: false, completionReason: 'NONE', summary: 'Round in progress.' };
}

/**
 * Challenger Active Observation Engine.
 * Observes the shared candidate context and determines whether an intervention adds meaningful value.
 */
/**
 * Evaluates Primary interviewer's structured decision on the candidate turn.
 * Primary drives core blueprint questions and implementation depth.
 */
export function evaluatePrimaryDecision(
  state: InterviewState,
  candidateUtterance: string,
  candidateDirectedTo: 'challenger' | 'primary' | 'none' = 'none'
): PrimaryDecision {
  // If candidate addressed Challenger directly, Primary yields and remains completely silent
  if (candidateDirectedTo === 'challenger') {
    return {
      action: 'NO_INTERVENTION',
      reason: 'candidate_directed_to_colleague_challenger'
    };
  }

  const clean = candidateUtterance.trim();
  const quality = classifyCandidateAnswer(clean);

  // If candidate gave gibberish or no answer, ask for clarification/repeat
  if (quality.classification === 'GIBBERISH' || quality.classification === 'NO_ANSWER') {
    return {
      action: 'FOLLOW_UP',
      reason: `candidate_provided_${quality.classification.toLowerCase()}`,
      proposedQuestion: `I didn't quite catch your technical explanation there. Could you explain your approach again clearly?`
    };
  }

  // If candidate gave a vague or hand-wavey answer, demand concrete mechanisms
  if (quality.classification === 'VAGUE' || quality.classification === 'INCORRECT') {
    return {
      action: 'FOLLOW_UP',
      reason: `candidate_answer_${quality.classification.toLowerCase()}`,
      proposedQuestion: `Could you walk me through the specific technical mechanisms and numbers in your design?`
    };
  }

  // If candidate directed speech directly to Primary
  if (candidateDirectedTo === 'primary') {
    return {
      action: 'CONTINUE',
      reason: 'candidate_directly_addressed_primary',
      proposedQuestion: `Looking at that component, how would you benchmark and verify it under peak production load?`
    };
  }

  // If answer was strong and enough evidence collected on current topic, advance
  const questionsCount = state.questionsAsked?.length || 0;
  if (quality.classification === 'VALID_STRONG' && questionsCount >= 2) {
    return {
      action: 'ADVANCE',
      reason: 'sufficient_evidence_collected_advancing_topic',
      proposedQuestion: `Understood. Moving forward to our next architectural topic, how do you approach distributed caching and invalidation?`
    };
  }

  return {
    action: 'CONTINUE',
    reason: 'standard_blueprint_progression'
  };
}

/**
 * Challenger actively observes the conversation state, candidate claims, and peer interactions.
 * In a peer panel, Arjun remains silent when no intervention is needed, but actively probes
 * architectural trade-offs, failure modes, contradictions, or when directly addressed by the candidate.
 */
export function evaluateChallengerObservation(
  state: InterviewState,
  candidateUtterance: string,
  candidateDirectedTo: 'challenger' | 'primary' | 'none' = 'none'
): {
  action: 'NO_INTERVENTION' | 'STRUCTURED_FLOOR_REQUEST';
  reason: string;
  request?: {
    agentId: string;
    agentName: string;
    reason: string;
    targetCompetency: string;
    priority: 'low' | 'medium' | 'high';
    proposedProbe: string;
  };
} {
  const clean = candidateUtterance.trim();
  const challenger = state.activeAgents.find(a => !a.isPrimary && a.isActive);

  if (!challenger || state.currentRound !== 'technical') {
    return { action: 'NO_INTERVENTION', reason: 'No active Challenger in current round.' };
  }

  // Case 1: Candidate explicitly addressed Challenger directly ("Arjun, what do you think?")
  if (candidateDirectedTo === 'challenger') {
    return {
      action: 'STRUCTURED_FLOOR_REQUEST',
      reason: 'candidate_directly_addressed_challenger',
      request: {
        agentId: challenger.agentId,
        agentName: challenger.name,
        reason: 'candidate_directly_addressed_challenger',
        targetCompetency: state.currentTopic || 'Distributed Architecture & Scaling Limits',
        priority: 'high',
        proposedProbe: `From an architectural perspective, I'd evaluate how that scales under sudden network partitions. In your design, how do you handle partition recovery?`
      }
    };
  }

  // Case 2: Candidate explicitly addressed Primary directly -> Challenger intentionally yields
  if (candidateDirectedTo === 'primary') {
    return { action: 'NO_INTERVENTION', reason: 'candidate_directed_to_colleague_primary' };
  }

  // Case 3: Check if candidate response was trivial / non-substantive / gibberish
  if (clean.length < 25) {
    return { action: 'NO_INTERVENTION', reason: 'Candidate response lacks substantive technical claims to challenge.' };
  }

  const cleanLower = clean.toLowerCase();

  // Case 4: Contradiction detection against candidate's prior evidence
  const priorEvidenceText = (state.structuredEvidence || [])
    .map(e => e.candidateUtterance.toLowerCase())
    .join(' ');

  if (priorEvidenceText.includes('raft') && (cleanLower.includes('eventual consistency') || cleanLower.includes('dynamo') || cleanLower.includes('masterless'))) {
    return {
      action: 'STRUCTURED_FLOOR_REQUEST',
      reason: 'contradiction_detected_consensus_vs_eventual_consistency',
      request: {
        agentId: challenger.agentId,
        agentName: challenger.name,
        reason: 'Technical contradiction: Raft linearizable consensus vs masterless eventual consistency',
        targetCompetency: 'Architectural Consistency & Integrity',
        priority: 'high',
        proposedProbe: `Earlier you emphasized strict linearizable Raft consensus, but here you proposed a masterless eventual consistency model. How do you reconcile data conflicts and split-brain guarantees across those two models?`
      }
    };
  }

  // Case 5: Contextually evaluate architectural triggers against the candidate's claims
  for (const trigger of ARCHITECTURAL_TRIGGERS) {
    const match = clean.match(trigger.pattern);
    if (match) {
      let naturalProbe = '';
      if (trigger.reason === 'candidate_claimed_distributed_consensus') {
        naturalProbe = `You mentioned distributed consensus with ${match[0]}. How does your architecture handle split-brain partitions and verify quorum during sudden node isolation?`;
      } else if (trigger.reason === 'candidate_claimed_concurrency_model') {
        naturalProbe = `You brought up ${match[0]}. How do you mitigate race conditions and thread starvation under sudden lock contention?`;
      } else if (trigger.reason === 'candidate_claimed_event_streaming') {
        naturalProbe = `Regarding your ${match[0]} setup, how do you handle consumer group rebalance storms when partitions scale under backpressure?`;
      } else if (trigger.reason === 'candidate_claimed_high_scale') {
        naturalProbe = `You cited handling ${match[0]}. What specific backpressure or shedding mechanism prevents cascading failure during downstream service degradation?`;
      } else if (trigger.reason === 'candidate_claimed_caching_layer') {
        naturalProbe = `With your ${match[0]} architecture, how do you prevent cache stampedes and stale reads when invalidating hot distributed keys?`;
      } else {
        naturalProbe = `Regarding your ${match[0]} claim, what are the primary failure modes you observed and how did you verify recovery?`;
      }

      return {
        action: 'STRUCTURED_FLOOR_REQUEST',
        reason: trigger.reason,
        request: {
          agentId: challenger.agentId,
          agentName: challenger.name,
          reason: trigger.reason,
          targetCompetency: trigger.competency,
          priority: 'medium',
          proposedProbe: naturalProbe
        }
      };
    }
  }

  // Case 6: Routine non-architectural topics do not warrant Challenger intervention
  if (/\b(neovim|vim|vscode|intellij|editor|ide|laptop|dark\s*mode)\b/i.test(clean) || state.currentTopic?.toLowerCase().includes('tooling') || state.currentTopic?.toLowerCase().includes('productivity')) {
    return { action: 'NO_INTERVENTION', reason: 'Routine developer tooling discussion does not require architectural probing.' };
  }

  // Case 7: Missing business/customer impact on substantive technical response
  const challengerTurnsCount = (state.structuredFloorRequests || []).filter(r => r.agent === 'challenger' && r.status === 'granted').length;
  const questionsCount = state.questionsAsked?.length || 0;

  if (clean.length > 80 && !/\b(cost|slo|sla|customer|user|downtime|revenue|availability|latency budget)\b/i.test(clean) && questionsCount >= 4 && challengerTurnsCount < 2) {
    return {
      action: 'STRUCTURED_FLOOR_REQUEST',
      reason: 'missing_business_customer_impact',
      request: {
        agentId: challenger.agentId,
        agentName: challenger.name,
        reason: 'Probe business impact, cost trade-offs, and customer-facing SLOs',
        targetCompetency: 'Engineering Economics & Customer SLOs',
        priority: 'medium',
        proposedProbe: 'That covers the technical mechanics well. What was the direct business or customer-facing SLO impact of that design, and what trade-offs did you make regarding infrastructure cost versus availability?'
      }
    };
  }

  // Case 8: Proactively intervene after initial questions if Challenger has not asked a question yet and candidate provided substantive technical response
  if (questionsCount >= 2 && challengerTurnsCount < 2) {
    const defaultProbes = [
      `Building on that architecture, what specific failure modes or network partition scenarios did you have to guard against in production, and how did you verify recovery?`,
      `How does your design handle sudden downstream latency spikes or backpressure when concurrent traffic scales 10x?`,
      `What were the key trade-offs in that implementation between immediate consistency and system throughput?`,
      `If you had to scale that pipeline to handle 10x your current load, where would the primary bottleneck emerge and how would you redesign it?`
    ];
    const selectedProbe = defaultProbes[challengerTurnsCount % defaultProbes.length];

    return {
      action: 'STRUCTURED_FLOOR_REQUEST',
      reason: 'specialist_core_competency_deep_dive',
      request: {
        agentId: challenger.agentId,
        agentName: challenger.name,
        reason: 'Specialist deep-dive into failure modes and scaling limits',
        targetCompetency: 'Distributed Architecture & Failure Resilience',
        priority: 'high',
        proposedProbe: selectedProbe
      }
    };
  }

  return { action: 'NO_INTERVENTION', reason: 'Candidate answer addressed current question adequately without unaddressed architectural risks.' };
}

/**
 * Records a candidate utterance into the shared state.
 * Transitions floorState to CANDIDATE_SPEAKING and records structured evidence.
 */
export function recordCandidateUtterance(
  state: InterviewState,
  utterance: string
): { 
  updatedState: InterviewState; 
  qualityReport: any; 
  floorRequestResult?: any;
  challengerObservation?: any;
  roundCompletion?: any;
  primaryDecision?: PrimaryDecision;
  challengerDecision?: ChallengerDecision;
  arbiterDecision?: ArbiterDecision;
  whyChallengerDidNotSpeak?: string;
  candidateDirectedTo?: 'challenger' | 'primary' | 'none';
} {
  const clean = utterance.trim();
  if (!clean) {
    return { 
      updatedState: state, 
      qualityReport: { classification: 'NO_ANSWER', qualityScore: 0 },
      roundCompletion: checkRoundCompletionCriteria(state),
      whyChallengerDidNotSpeak: 'CANDIDATE_SILENCE'
    };
  }

  let updated = setAuthoritativeFloorState(state, 'CANDIDATE_SPEAKING');
  updated.candidateAnswer = clean;

  // Classify answer quality
  const quality = classifyCandidateAnswer(clean);

  // Record structured competency evidence
  const evidenceRecord: CompetencyEvidence = {
    id: `ev_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    round: updated.currentRound,
    speaker: 'Candidate',
    questionAsked: updated.lastQuestion || 'Core Technical Architecture',
    candidateUtterance: clean,
    classification: quality.classification,
    verbatimQuote: quality.verbatimQuote,
    qualityScore: quality.qualityScore,
    topic: updated.currentTopic
  };

  if (!updated.structuredEvidence) updated.structuredEvidence = [];
  updated.structuredEvidence.push(evidenceRecord);

  // Update corresponding Competency Tracker
  if (updated.competencyTrackers && updated.competencyTrackers.length > 0) {
    const targetComp = updated.competencyTrackers.find(c => 
      (updated.currentTopic && c.competency.toLowerCase().includes(updated.currentTopic.toLowerCase())) ||
      c.questionsAsked.includes(updated.lastQuestion || '')
    ) || updated.competencyTrackers[0];

    if (targetComp) {
      targetComp.candidateResponses.push(clean);
      if (quality.classification === 'VALID_STRONG' || quality.classification === 'VALID_PARTIAL') {
        if (quality.verbatimQuote && !targetComp.evidence.includes(quality.verbatimQuote)) {
          targetComp.evidence.push(quality.verbatimQuote);
        }
        targetComp.evidenceQuality = quality.classification === 'VALID_STRONG' ? 'STRONG' : 'PARTIAL';
        if (targetComp.evidence.length >= 2) {
          targetComp.sufficientEvidence = true;
        }
        targetComp.score = Math.min(100, (targetComp.score || 0) + (quality.classification === 'VALID_STRONG' ? 45 : 30));
      } else if (quality.classification === 'GIBBERISH' || quality.classification === 'NO_ANSWER') {
        targetComp.evidenceQuality = 'NONE';
      }
    }
  }

  // Extract quick evidence snippet if valid
  if (quality.verbatimQuote && !updated.evidenceCollected.includes(quality.verbatimQuote)) {
    updated.evidenceCollected = [...updated.evidenceCollected, quality.verbatimQuote];
  }

  // 1. Detect candidate direct addressing
  const directAddress = detectCandidateDirectedInterviewer(clean, updated.activeAgents);
  const candidateDirectedTo = directAddress.directedTo;

  // 2. Dual-agent structured decisions
  const primaryDecision = evaluatePrimaryDecision(updated, clean, candidateDirectedTo);
  const observation = evaluateChallengerObservation(updated, clean, candidateDirectedTo);
  const challengerDecision: ChallengerDecision = {
    action: observation.action === 'STRUCTURED_FLOOR_REQUEST' ? 'REQUEST_FLOOR' : 'NO_INTERVENTION',
    reason: observation.reason,
    priority: observation.request?.priority,
    proposedProbe: observation.request?.proposedProbe,
    targetCompetency: observation.request?.targetCompetency,
    request: observation.request
  };

  // 3. Authoritative Turn Arbiter Resolution
  const primaryAgent = updated.activeAgents.find(a => a.isPrimary && a.isActive);
  const challengerAgent = updated.activeAgents.find(a => !a.isPrimary && a.isActive);

  let arbiterDecision: ArbiterDecision;
  let whyChallengerDidNotSpeak: string = 'ARJUN_DECIDED_NO_INTERVENTION';
  let floorRequestResult: any = null;

  if (updated.currentRound === 'hr') {
    const hrAgent = updated.activeAgents[0];
    arbiterDecision = {
      winningAgent: 'hr',
      winningAgentName: hrAgent?.name || 'HR Interviewer',
      action: 'HR_CONTINUE',
      reason: 'HR round single interviewer mode'
    };
    whyChallengerDidNotSpeak = 'NOT_APPLICABLE_HR_ROUND';
  } else if (candidateDirectedTo === 'challenger' && challengerAgent) {
    // Priority 1: Candidate directly addressed Challenger
    const probe = observation.request?.proposedProbe || `From an architectural perspective, I'd evaluate how that scales under sudden network partitions. In your design, how do you handle partition recovery?`;
    const floorRes = evaluateChallengerFloorRequest(updated, observation.request || {
      agentId: challengerAgent.agentId,
      agentName: challengerAgent.name,
      reason: 'candidate_directly_addressed_challenger',
      targetCompetency: updated.currentTopic || 'Distributed Architecture',
      priority: 'high',
      proposedProbe: probe
    }, true);

    updated = floorRes.updatedState;
    floorRequestResult = {
      granted: true,
      decisionReason: 'Granted: Candidate directly addressed Challenger.',
      proposedProbe: probe,
      targetCompetency: observation.request?.targetCompetency || 'Distributed Architecture',
      priority: 'high'
    };
    arbiterDecision = {
      winningAgent: 'challenger',
      winningAgentName: challengerAgent.name,
      action: 'GRANT_CHALLENGER',
      reason: 'Candidate directly addressed Challenger. Challenger takes the floor while Primary yields in silence.'
    };
    whyChallengerDidNotSpeak = 'ARJUN_RECEIVED_FLOOR';
  } else if (candidateDirectedTo === 'primary' && primaryAgent) {
    // Priority 1b: Candidate directly addressed Primary
    updated = setAuthoritativeFloorState(updated, 'PRIMARY_SPEAKING');
    arbiterDecision = {
      winningAgent: 'primary',
      winningAgentName: primaryAgent.name,
      action: 'GRANT_PRIMARY',
      reason: 'Candidate directly addressed Primary. Primary takes the floor.'
    };
    whyChallengerDidNotSpeak = 'CANDIDATE_DIRECTED_TO_PRIMARY';
  } else if (challengerDecision.action === 'REQUEST_FLOOR' && challengerDecision.request && challengerAgent) {
    // Priority 2: Challenger requests floor based on architectural triggers, contradiction, or proactive probe
    const arbiterRes = evaluateChallengerFloorRequest(updated, challengerDecision.request, true);
    if (arbiterRes.granted) {
      updated = arbiterRes.updatedState;
      floorRequestResult = {
        granted: true,
        decisionReason: arbiterRes.decisionReason,
        proposedProbe: challengerDecision.request.proposedProbe,
        targetCompetency: challengerDecision.request.targetCompetency,
        priority: challengerDecision.request.priority
      };
      arbiterDecision = {
        winningAgent: 'challenger',
        winningAgentName: challengerAgent.name,
        action: 'GRANT_CHALLENGER',
        reason: arbiterRes.decisionReason
      };
      whyChallengerDidNotSpeak = 'ARJUN_RECEIVED_FLOOR';
    } else {
      // Challenger requested floor but arbiter denied (e.g. cooldown)
      updated = setAuthoritativeFloorState(updated, 'PRIMARY_SPEAKING');
      floorRequestResult = {
        granted: false,
        decisionReason: arbiterRes.decisionReason
      };
      arbiterDecision = {
        winningAgent: 'primary',
        winningAgentName: primaryAgent?.name || 'Primary Interviewer',
        action: 'GRANT_PRIMARY',
        reason: `Challenger floor request denied (${arbiterRes.decisionReason}). Primary retains floor for blueprint progression.`
      };
      whyChallengerDidNotSpeak = 'ARBITER_DENIED_COOLDOWN';
    }
  } else {
    // Priority 3: Primary blueprint progression
    updated = setAuthoritativeFloorState(updated, 'PRIMARY_SPEAKING');
    arbiterDecision = {
      winningAgent: 'primary',
      winningAgentName: primaryAgent?.name || 'Primary Interviewer',
      action: 'GRANT_PRIMARY',
      reason: primaryDecision.reason || 'Primary continues blueprint progression; Challenger decided no intervention needed.'
    };
    whyChallengerDidNotSpeak = 'ARJUN_DECIDED_NO_INTERVENTION';
  }

  // Check for natural round completion
  const roundCompletion = checkRoundCompletionCriteria(updated);

  return { 
    updatedState: updated, 
    qualityReport: quality, 
    floorRequestResult,
    challengerObservation: observation,
    primaryDecision,
    challengerDecision,
    arbiterDecision,
    whyChallengerDidNotSpeak,
    candidateDirectedTo,
    roundCompletion 
  };
}

/**
 * Records an agent question / turn and sets authoritative floorState.
 */
export function recordAgentTurn(
  state: InterviewState,
  agentId: string,
  question: string,
  topic?: string
): InterviewState {
  const clean = question.trim();
  let updated = { ...state };

  // Set floor state based on agent role
  const isPrimary = updated.activeAgents.find(a => a.agentId === agentId)?.isPrimary ?? true;
  const newFloorState: FloorState = updated.currentRound === 'hr' 
    ? 'HR_SPEAKING' 
    : isPrimary ? 'PRIMARY_SPEAKING' : 'CHALLENGER_SPEAKING';

  updated = setAuthoritativeFloorState(updated, newFloorState);
  updated.lastQuestion = clean;
  updated.currentSpeaker = agentId;
  updated.questionsAsked = [...updated.questionsAsked, clean];

  if (topic) {
    updated.currentTopic = topic;
    if (!updated.topicsCovered.includes(topic)) {
      updated.topicsCovered = [...updated.topicsCovered, topic];
    }
  }

  // Update corresponding competency tracker
  if (updated.competencyTrackers && updated.competencyTrackers.length > 0) {
    const tracker = updated.competencyTrackers.find(c => 
      topic ? c.competency.toLowerCase().includes(topic.toLowerCase()) : false
    ) || updated.competencyTrackers[0];
    if (tracker) {
      tracker.questionsAsked.push(clean);
    }
  }

  const targetQuestions = updated.currentRound === 'technical' ? 8 : 4;
  updated.roundProgress = Math.min(100, Math.round((updated.questionsAsked.length / targetQuestions) * 100));
  updated.updatedAt = new Date().toISOString();

  return updated;
}

/**
 * Yields floor back to candidate / waiting state after an AI agent finishes asking a question.
 */
export function yieldFloorToCandidate(state: InterviewState): InterviewState {
  return setAuthoritativeFloorState(state, 'WAITING');
}

/**
 * Transitions state to HR Round cleanly.
 * DEACTIVATES technical agents, ACTIVATES single HR agent, sets floorState to HR_SPEAKING.
 */
export function transitionToHRRound(
  state: InterviewState,
  hrAgent: InterviewerProfile,
  technicalScore: number,
  technicalDecisionReason: string
): InterviewState {
  let updated = { ...state };

  updated.currentRound = 'hr';
  updated.interviewStatus = 'IN_PROGRESS';
  updated.roundProgress = 0;
  updated.structuredFloorRequests = [];
  updated.agentFloorRequests = [];
  updated.currentSpeaker = hrAgent.interviewerId;

  // Deactivate all technical agents, activate single HR agent
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

  updated = setAuthoritativeFloorState(updated, 'HR_SPEAKING');

  const techEvidenceSummary = `Technical Round Passed (Score: ${technicalScore}/100). Highlights: ${updated.evidenceCollected.slice(0, 3).join('; ')}. Panel Notes: ${technicalDecisionReason}`;
  updated.conversationSummary = `${updated.conversationSummary}\n--- TECHNICAL ROUND COMPLETED ---\n${techEvidenceSummary}`;
  updated.updatedAt = new Date().toISOString();

  return updated;
}

