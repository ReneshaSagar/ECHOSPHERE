/**
 * Central Scoring Configuration and Round Evaluation Engine for OmniPanel.
 * 
 * Defines deterministic scoring formulas, competency rubrics, weights,
 * demonstrated knowledge schemas, reasoning evidence, and multi-round aggregation.
 */

// Central Multi-Round Score Weights
export const ROUND_WEIGHTS = {
  CODING: 0.35,      // Round 1: Coding & System Design Assessment (35%)
  TECHNICAL: 0.50,   // Round 2: Technical Panel Interview (50%)
  HR: 0.15           // Round 3: HR & Cultural Alignment (15%)
} as const;

// Round 1: Coding Competency Rubric (100% total)
export const CODING_COMPETENCIES = [
  {
    key: 'problem_understanding',
    name: 'Problem Understanding & Requirements Clarification',
    weight: 0.15,
    description: 'Understands problem constraints, clarifies edge cases, and correctly identifies inputs/outputs.'
  },
  {
    key: 'approach_and_algorithm',
    name: 'Approach, Data Structures & Algorithm Design',
    weight: 0.20,
    description: 'Selects optimal data structures and designs a clean algorithmic approach (e.g. Sliding Window, Hash Map, Two Pointers).'
  },
  {
    key: 'implementation_correctness',
    name: 'Implementation Correctness & Code Quality',
    weight: 0.30,
    description: 'Translates approach into clean, modular, syntax-error-free code grounded in test execution pass rates.'
  },
  {
    key: 'complexity_and_scaling',
    name: 'Complexity, Optimization & Scaling Reasoning',
    weight: 0.15,
    description: 'Accurately articulates Time O(.) and Space O(.) complexities and discusses scalability/concurrency limits.'
  },
  {
    key: 'debugging_and_adaptability',
    name: 'Debugging, Adaptability & Inactivity/Hint Handling',
    weight: 0.10,
    description: 'Handles runtime errors, reacts effectively to hints or stuck signals, and methodically isolates bugs.'
  },
  {
    key: 'communication_and_explanation',
    name: 'Communication, Explanation & Code Walkthrough',
    weight: 0.10,
    description: 'Explains code structure, walks through execution logic clearly, and maintains structured verbal communication.'
  }
] as const;

// Round 1: System Design Competency Rubric (100% total)
export const SYSTEM_DESIGN_COMPETENCIES = [
  {
    key: 'requirements_and_scope',
    name: 'Requirements & Scope Definition',
    weight: 0.15,
    description: 'Defines functional/non-functional requirements, traffic scale estimates, latency budgets, and system scope.'
  },
  {
    key: 'architecture_and_decomposition',
    name: 'High-Level Architecture & System Decomposition',
    weight: 0.25,
    description: 'Decomposes system into modular microservices, API gateways, load balancers, and distributed data layers.'
  },
  {
    key: 'component_and_data_design',
    name: 'Component & Data Design',
    weight: 0.20,
    description: 'Designs schemas, data storage selection (SQL/NoSQL/Key-Value), cache models, and data pipelines.'
  },
  {
    key: 'scalability_and_reliability',
    name: 'Scalability, Performance & Reliability',
    weight: 0.15,
    description: 'Addresses horizontal scaling, failover mechanics, replication, backpressure, and fault isolation.'
  },
  {
    key: 'tradeoffs_and_deep_dive',
    name: 'Trade-offs & Deep Dive Reasoning',
    weight: 0.15,
    description: 'Justifies design decisions, articulates CAP/consistency trade-offs, and analyzes bottleneck failure modes.'
  },
  {
    key: 'communication_and_diagrams',
    name: 'Communication & Diagram Clarity',
    weight: 0.10,
    description: 'Uses whiteboard/Excalidraw effectively, explains component interactions with precision and clarity.'
  }
] as const;

// Round 2: Technical Competency Rubric (100% total)
export const TECHNICAL_COMPETENCIES = [
  {
    key: 'technical_knowledge',
    name: 'Technical Knowledge',
    weight: 0.25,
    description: 'Breadth and correctness of core engineering fundamentals, algorithms, system concepts, and job-relevant technologies.'
  },
  {
    key: 'technical_depth',
    name: 'Technical Depth',
    weight: 0.20,
    description: 'Deep understanding of underlying mechanisms, internals, failure modes, concurrency, and distributed protocols.'
  },
  {
    key: 'real_world_experience',
    name: 'Real-World Engineering Experience',
    weight: 0.20,
    description: 'Validation of claimed projects, personal ownership, architectural trade-offs, production outages, and scaling milestones.'
  },
  {
    key: 'engineering_judgment',
    name: 'Engineering Judgment',
    weight: 0.15,
    description: 'Sound architectural decision-making, evaluating trade-offs (latency vs throughput, consistency vs availability), and pragmatic design choices.'
  },
  {
    key: 'problem_solving_debugging',
    name: 'Problem Solving / Debugging',
    weight: 0.10,
    description: 'Structured analytical thinking, diagnosing root causes of complex bugs, isolation strategies, and edge case mitigation.'
  },
  {
    key: 'technical_communication',
    name: 'Technical Communication',
    weight: 0.10,
    description: 'Clarity, conciseness, structured explanations, and effective articulation of complex technical concepts.'
  }
] as const;

// Round 3: HR & Cultural Alignment Competency Rubric (100% total)
export const HR_COMPETENCIES = [
  {
    key: 'communication_clarity',
    name: 'Communication & Clarity',
    weight: 0.20,
    description: 'Structure, active listening, precision, conciseness, and clarity in expressing thoughts and experiences.'
  },
  {
    key: 'ownership_accountability',
    name: 'Ownership & Accountability',
    weight: 0.20,
    description: 'Taking full responsibility for outcomes, admitting mistakes, reliability, and driving initiatives to completion.'
  },
  {
    key: 'collaboration_teamwork',
    name: 'Collaboration & Teamwork',
    weight: 0.15,
    description: 'Cross-functional alignment, empathy, supporting teammates, unblocking others, and constructive engagement.'
  },
  {
    key: 'conflict_resolution',
    name: 'Conflict Resolution',
    weight: 0.15,
    description: 'Navigating disagreements professionally, finding common ground, maintaining composure, and de-escalation.'
  },
  {
    key: 'adaptability_learning',
    name: 'Adaptability & Learning',
    weight: 0.10,
    description: 'Handling ambiguity, pivoting with changing priorities, learning from feedback and past failures.'
  },
  {
    key: 'initiative_leadership',
    name: 'Initiative / Leadership',
    weight: 0.10,
    description: 'Proactively identifying problems, proposing solutions, mentoring, and championing best practices.'
  },
  {
    key: 'cultural_alignment',
    name: 'Cultural Alignment',
    weight: 0.10,
    description: 'Values alignment, work ethic, customer obsession, transparency, and integrity.'
  }
] as const;

// Types for Demonstrated Knowledge and Evidence Quality
export type DemonstratedKnowledgeLevel = 'strong' | 'moderate' | 'weak' | 'not_demonstrated';
export type EvidenceQualityLevel = 'STRONG' | 'PARTIAL' | 'WEAK' | 'NONE';
export type EvidenceSufficiencyLevel = 'sufficient' | 'partial' | 'insufficient';
export type EvaluationConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type TechnicalBarStatus = 'met' | 'not_met' | 'insufficient_evidence';

export interface DemonstratedKnowledgeItem {
  topic: string;
  level: DemonstratedKnowledgeLevel;
  evidence: string; // Verbatim quote, code snippet, or explanation
  notes?: string;
}

export interface ValidatedExperienceItem {
  claim: string;
  demonstrated: string;
  strength: 'Strong' | 'Moderate' | 'Weak' | 'Not Demonstrated';
  details?: string;
  sourceSnippet?: string;
}

export interface ReasoningEvidence {
  approachExplanation?: string;
  algorithmChoices?: string;
  complexityReasoning?: string;
  edgeCasesIdentified?: string[];
  debuggingReasoning?: string;
}

export interface TestExecutionSummary {
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  compileSuccess?: boolean;
  runtimeErrors?: string[];
  rawOutput?: string;
  timestamp?: number;
}

export interface WorkspaceEvidenceSnapshot {
  code?: string;
  language?: string;
  codeExecutionResults?: TestExecutionSummary;
  diagramElementCount?: number;
  diagramSummary?: string;
  workEventsCount?: number;
  stuckEventsCount?: number;
  submittedAt?: string;
}

export interface CompetencyScoreItem {
  competency: string;
  weight: number;
  score: number;        // 0-100
  weightedScore: number;// score * weight
  evidenceQuality: EvidenceQualityLevel;
  evidence: string[];
  missingEvidence: string[];
  feedback?: string;
}

export interface BehavioralEvidenceItem {
  summary: string;
  quote: string;
  source: 'transcript';
}

export interface HRCompetencyScoreItem {
  competency: string;
  key: string;
  weight: number;
  score: number;        // 0-100
  weightedScore: number;// score * weight
  evidenceQuality?: EvidenceQualityLevel;
  evidence: BehavioralEvidenceItem[];
  missingEvidence?: string[];
  feedback?: string;
}

export interface HRKeyMoment {
  situation: string;
  action: string;
  outcome: string;
  competency: string;
  quote: string;
}

export interface Round1EvaluationResult {
  roundName: string;
  roundType: 'coding' | 'system_design';
  decision: 'PASS' | 'FAIL';
  score: number; // 0-100 derived strictly from weighted competencies
  reason: string;
  evidenceQuality: EvidenceQualityLevel;
  evidenceSufficiency: EvidenceSufficiencyLevel;
  confidence: EvaluationConfidenceLevel;
  competencyEvaluations: CompetencyScoreItem[];
  demonstratedKnowledge: DemonstratedKnowledgeItem[];
  reasoningEvidence: ReasoningEvidence;
  workspaceEvidence: WorkspaceEvidenceSnapshot;
  keyEvidence: string[];
  missingEvidence: string[];
  evaluatedAt: string;
}

export interface Round2TechnicalEvaluationResult {
  roundName: string;
  roundType: 'technical';
  score: number; // 0-100 derived strictly from weighted technical competencies
  decision: 'PASS' | 'FAIL';
  reason: string;
  technicalBar: TechnicalBarStatus;
  evidenceQuality: EvidenceQualityLevel;
  evidenceSufficiency: EvidenceSufficiencyLevel;
  confidence: EvaluationConfidenceLevel;
  competencies: {
    technicalKnowledge: { score: number; weight: number; evidence: string[]; feedback?: string; confidence: 'high' | 'medium' | 'low' };
    technicalDepth: { score: number; weight: number; evidence: string[]; feedback?: string; confidence: 'high' | 'medium' | 'low' };
    realWorldExperience: { score: number; weight: number; evidence: string[]; feedback?: string; confidence: 'high' | 'medium' | 'low' };
    engineeringJudgment: { score: number; weight: number; evidence: string[]; feedback?: string; confidence: 'high' | 'medium' | 'low' };
    problemSolving: { score: number; weight: number; evidence: string[]; feedback?: string; confidence: 'high' | 'medium' | 'low' };
    technicalCommunication: { score: number; weight: number; evidence: string[]; feedback?: string; confidence: 'high' | 'medium' | 'low' };
  };
  competencyEvaluations: CompetencyScoreItem[];
  demonstratedExpertise: Array<{ topic: string; level: 'Strong' | 'Moderate' | 'Weak' | 'Not Demonstrated'; evidence: string }>;
  validatedExperience: ValidatedExperienceItem[];
  unvalidatedClaims: string[];
  areasOfConcern: string[];
  strengths: string[];
  weaknesses: string[];
  keyEvidence: string[];
  missingEvidence: string[];
  evaluatedAt: string;
}

export interface Round3HREvaluationResult {
  roundName: string;
  roundType: 'hr';
  score: number; // 0-100 derived strictly from weighted competencies
  decision: 'PASS' | 'FAIL';
  reason: string;
  overallRecommendation: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Leaning No Hire' | 'No Hire';
  evidenceQuality: EvidenceQualityLevel;
  evidenceSufficiency: EvidenceSufficiencyLevel;
  confidence: EvaluationConfidenceLevel;
  competencies: HRCompetencyScoreItem[];
  behavioralStrengths: string[];
  behavioralConcerns: string[];
  keyMoments: HRKeyMoment[];
  culturalFitSummary: string;
  missingEvidence: string[];
  evaluatedAt: string;
}

export interface MultiRoundContribution {
  roundName: string;
  roundType: 'coding' | 'system_design' | 'technical' | 'hr';
  rawScore: number;
  weight: number;
  weightedScore: number;
}

export interface FinalScoreAggregation {
  finalScore: number;
  rounds: MultiRoundContribution[];
  formula: string;
  recommendation: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Leaning No Hire' | 'No Hire' | 'Disqualified / No Hire';
}

/**
 * Computes HR Round composite score strictly from weighted competencies.
 */
export function calculateHRRoundScore(
  competencyEvaluations: HRCompetencyScoreItem[]
): number {
  if (!competencyEvaluations || competencyEvaluations.length === 0) return 0;
  const totalWeight = competencyEvaluations.reduce((sum, c) => sum + (c.weight || 0), 0);
  const weightedSum = competencyEvaluations.reduce((sum, c) => sum + (c.score * (c.weight || 0)), 0);
  if (totalWeight <= 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Computes Technical Round composite score strictly from weighted competencies.
 */
export function calculateTechnicalRoundScore(
  competencyEvaluations: CompetencyScoreItem[]
): number {
  if (!competencyEvaluations || competencyEvaluations.length === 0) return 0;
  const totalWeight = competencyEvaluations.reduce((sum, c) => sum + (c.weight || 0), 0);
  const weightedSum = competencyEvaluations.reduce((sum, c) => sum + (c.score * (c.weight || 0)), 0);
  if (totalWeight <= 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Computes Round 1 composite score strictly from weighted competencies.
 */
export function calculateRound1Score(
  competencyEvaluations: CompetencyScoreItem[]
): number {
  if (!competencyEvaluations || competencyEvaluations.length === 0) return 0;

  const totalWeight = competencyEvaluations.reduce((sum, c) => sum + (c.weight || 0), 0);
  const weightedSum = competencyEvaluations.reduce((sum, c) => sum + (c.score * (c.weight || 0)), 0);

  if (totalWeight <= 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Computes the deterministic final interview score from all completed round evaluations:
 * Final Score = Coding (35%) + Technical (50%) + HR (15%)
 * If certain rounds are not configured, weights are proportionally normalized.
 */
export function calculateFinalAggregateScore(
  roundResults: Array<{
    roundName?: string;
    roundType?: 'coding' | 'system_design' | 'technical' | 'hr' | string;
    score: number;
  }>
): FinalScoreAggregation {
  if (!roundResults || roundResults.length === 0) {
    return {
      finalScore: 0,
      rounds: [],
      formula: 'No rounds evaluated',
      recommendation: 'No Hire'
    };
  }

  const activeContributions: MultiRoundContribution[] = [];

  for (const r of roundResults) {
    const rawType = (r.roundType || '').toLowerCase();
    let normType: 'coding' | 'system_design' | 'technical' | 'hr' = 'technical';
    let baseWeight: number = ROUND_WEIGHTS.TECHNICAL;

    if (rawType.includes('coding') || rawType.includes('dsa') || rawType.includes('sliding') || rawType.includes('round 1')) {
      normType = 'coding';
      baseWeight = ROUND_WEIGHTS.CODING;
    } else if (rawType.includes('system') || rawType.includes('architecture')) {
      normType = 'system_design';
      baseWeight = ROUND_WEIGHTS.CODING;
    } else if (rawType.includes('hr') || rawType.includes('culture') || rawType.includes('behavioral')) {
      normType = 'hr';
      baseWeight = ROUND_WEIGHTS.HR;
    } else {
      normType = 'technical';
      baseWeight = ROUND_WEIGHTS.TECHNICAL;
    }

    activeContributions.push({
      roundName: r.roundName || (normType === 'coding' ? 'Round 1: Coding' : normType === 'hr' ? 'Round 3: HR & Culture' : 'Round 2: Technical Panel'),
      roundType: normType,
      rawScore: Math.max(0, Math.min(100, r.score || 0)),
      weight: baseWeight,
      weightedScore: 0 // to be computed after normalization
    });
  }

  // Normalize weights if total active weight != 1.0 (e.g. if HR round was skipped)
  const totalBaseWeight = activeContributions.reduce((sum, c) => sum + c.weight, 0);
  let totalWeightedScore = 0;

  for (const c of activeContributions) {
    const normalizedWeight = totalBaseWeight > 0 ? c.weight / totalBaseWeight : (1 / activeContributions.length);
    c.weight = Number(normalizedWeight.toFixed(3));
    c.weightedScore = Number((c.rawScore * normalizedWeight).toFixed(2));
    totalWeightedScore += c.weightedScore;
  }

  const finalScore = Math.round(totalWeightedScore);

  const formulaParts = activeContributions.map(c => 
    `(${c.rawScore} × ${(c.weight * 100).toFixed(0)}% [${c.roundType.toUpperCase()}])`
  );
  const formula = `${formulaParts.join(' + ')} = ${finalScore}/100`;

  let recommendation: 'Strong Hire' | 'Hire' | 'Leaning Hire' | 'Leaning No Hire' | 'No Hire' | 'Disqualified / No Hire' = 'No Hire';
  if (finalScore >= 85) {
    recommendation = 'Strong Hire';
  } else if (finalScore >= 75) {
    recommendation = 'Hire';
  } else if (finalScore >= 60) {
    recommendation = 'Leaning Hire';
  } else if (finalScore >= 45) {
    recommendation = 'Leaning No Hire';
  } else {
    recommendation = 'No Hire';
  }

  return {
    finalScore,
    rounds: activeContributions,
    formula,
    recommendation
  };
}
