export type PersonaName = 'alex' | 'maya' | 'david';
export type SessionStatus = 'setup' | 'live' | 'ended';
export type HireVerdict = 'STRONG HIRE' | 'LEAN HIRE' | 'NO HIRE';

export interface TranscriptEntry {
  id: string;
  speaker: string;  // 'alex' | 'maya' | 'david' | 'candidate'
  text: string;
  timestamp: number;
  vaguenessScore?: number;
}

export interface PillarScore {
  score: number;   // 0-10
  summary: string;
  evidence: string;
}

export interface SessionReport {
  session_id: string;
  job_title: string;
  overall_recommendation: HireVerdict;
  recommendation_reasoning: string;
  pillar_scores: {
    architecture: PillarScore;
    product_sense: PillarScore;
    scalability: PillarScore;
    clarity: PillarScore;
    ownership: PillarScore;
  };
  strengths: string[];
  improvement_areas: string[];
  communication_metrics: {
    avg_response_length_words: number;
    buzzword_density_percent: number;
    avg_vagueness_score: number;
  };
  evidence_quotes: Array<{
    quote: string;
    timestamp: number;
    utterance_id: string;
    speaker: string;
  }>;
  total_exchanges: number;
  interview_duration_seconds: number;
  avg_vagueness_score: number;
}

export interface OrchestrationResponse {
  next_persona: PersonaName;
  question: string;
  vagueness_score: number;
  detected_issues: string[];
  confidence: number;
}

export interface WSTelemetryEvent {
  type: 'speaker_change' | 'vagueness_alert' | 'transcript_line' | 'barge_in' | 'difficulty_change';
  session_id: string;
  payload: Record<string, unknown>;
}
