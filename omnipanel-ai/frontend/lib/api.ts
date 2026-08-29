/**
 * OmniPanel AI — Type-safe API client
 * Communicates with the FastAPI backend at NEXT_PUBLIC_API_URL
 */
import type { OrchestrationResponse, SessionReport } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: isFormData
      ? { ...(options?.headers ?? {}) }
      : { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }
  return res.json() as Promise<T>;
}

// ── Session management ──────────────────────────────────────────────────────

export interface CreateSessionResponse {
  session_id: string;
  job_title: string;
  rubric: Record<string, {
    label: string;
    description: string;
    key_signals: string[];
  }>;
}

/**
 * Create a new interview session. Returns session_id + LLM-generated rubric.
 * Uses multipart form data as the backend expects Form fields.
 */
export async function createSession(params: {
  job_title: string;
  jd_text: string;
  resume_text: string;
}): Promise<CreateSessionResponse> {
  const formData = new FormData();
  formData.append('job_title', params.job_title);
  formData.append('jd_text', params.jd_text);
  formData.append('resume_text', params.resume_text);

  return apiFetch<CreateSessionResponse>('/api/sessions/create', {
    method: 'POST',
    body: formData,
  });
}

// ── Agora ───────────────────────────────────────────────────────────────────

export interface TokenResponse {
  rtc_token: string;
  rtm_token: string;
  uid: number;
  channel_name: string;
}

/** Fetch RTC + RTM tokens for an Agora channel. */
export async function getToken(params: {
  channel_name: string;
  uid: number;
  role?: string;
}): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/api/agora/token', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface StartAgentsResponse {
  agent_ids: Record<string, string>;
}

/** Start all 3 AI panel agents in the Agora channel. */
export async function startAgents(params: {
  session_id: string;
  channel_name: string;
  personas?: string[];
}): Promise<StartAgentsResponse> {
  return apiFetch<StartAgentsResponse>('/api/agora/agents/start', {
    method: 'POST',
    body: JSON.stringify({ personas: ['alex', 'maya', 'david'], ...params }),
  });
}

// ── Orchestration ───────────────────────────────────────────────────────────

/** Submit candidate utterance and get next speaker + question. */
export async function orchestrateTurn(
  sessionId: string,
  params: { candidate_utterance: string; utterance_id: string },
): Promise<OrchestrationResponse> {
  return apiFetch<OrchestrationResponse>(`/api/sessions/${sessionId}/orchestrate`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Session lifecycle ───────────────────────────────────────────────────────

export interface SessionStatus {
  session_id: string;
  job_title: string;
  current_persona: string | null;
  transcript_count: number;
  status: 'active' | 'ended';
  elapsed_seconds: number;
}

/** End the interview session and stop AI agents. */
export async function endSession(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/sessions/${sessionId}/end`, {
    method: 'POST',
  });
}

/** Get live session status. */
export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  return apiFetch<SessionStatus>(`/api/sessions/${sessionId}/status`);
}

// ── Report ──────────────────────────────────────────────────────────────────

/** Fetch the full post-interview evaluation report. */
export async function getReport(sessionId: string): Promise<SessionReport> {
  return apiFetch<SessionReport>(`/api/sessions/${sessionId}/report`);
}
