export type HireVerdict = 'STRONG HIRE' | 'LEAN HIRE' | 'NO HIRE';

export interface DynamicPersona {
  name: string;
  role: string;
  voice_id: string;
  color: string;
  agent_uid: number;
  specialties: string[];
  system_prompt: string;
}

export interface RoundConfig {
  type: 'oa' | 'technical' | 'hr' | 'portfolio' | 'creative' | 'culture' | 'custom';
  label: string;
  personas: DynamicPersona[];
  platform_url: string | null; // for OA rounds
}

export interface RubricPillar {
  label: string;
  description: string;
  key_signals: string[];
}

export interface CreateSessionResponse {
  session_id: string;
  job_title: string;
  rubric: Record<string, RubricPillar>;
  round_plan: RoundConfig[];
  opening_question: string;
  ats_score: number;
}

export interface TokenResponse {
  rtc_token: string;
  rtm_token: string;
  uid: number;
  channel_name: string;
}

export interface OrchestrationResponse {
  next_persona: string;
  question: string;
  vagueness_score: number;
  buzzwords_found: string[];
  pillar_scores: Record<string, number>;
  detected_issues: string[];
  confidence: number;
}

export interface PillarScore {
  score: number;
  summary: string;
  evidence: string;
}

export interface ProctorLog {
  timestamp: number;
  type: string;
  detail: string;
}

export interface SessionReport {
  session_id: string;
  job_title: string;
  overall_recommendation: HireVerdict;
  recommendation_reasoning: string;
  pillar_scores: Record<string, PillarScore>;
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
  ats_score?: number;
  final_composite_score?: number;
  proctoring?: {
    total_alerts: number;
    is_suspicious: boolean;
    alerts_log: ProctorLog[];
    screen_recorded: boolean;
  };
  hesitation_metrics?: {
    total_count: number;
    avg_duration_ms: number;
    log: Array<{ timestamp: number; duration_ms: number }>;
  };
  suspected_ai_answers?: boolean;
  recruiter_mom?: {
    summary: string;
    key_moments: string[];
    decision_markers: string[];
  };
  candidate_mom?: {
    summary: string;
    action_items: string[];
  };
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  vaguenessScore?: number;
}

export interface WSTelemetryEvent {
  type: string;
  session_id?: string;
  event?: Record<string, any>;
  payload?: Record<string, any>;
}

export interface UploadResumeResponse {
  text: string;
  ats_score: number;
  page_count: number;
  word_count: number;
}
