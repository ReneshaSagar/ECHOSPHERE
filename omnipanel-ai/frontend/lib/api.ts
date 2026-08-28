/**
 * OmniPanel AI — Type-safe API client
 */
import type {
  OrchestrationResponse,
  SessionReport,
  TokenResponse,
  CreateSessionResponse,
  UploadResumeResponse,
} from './types';

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

// ── Resume Upload ──────────────────────────────────────────────

/** Upload a PDF resume file; returns extracted text + ATS score. */
export async function uploadResume(file: File): Promise<UploadResumeResponse> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<UploadResumeResponse>('/api/upload/resume', {
    method: 'POST',
    body: form,
  });
}

// ── Session management ─────────────────────────────────────────

/** Create a new interview session. Returns session_id + rubric + round_plan. */
export async function createSession(params: {
  job_title: string;
  jd_text: string;
  resume_text?: string;
  ats_score?: number;
}): Promise<CreateSessionResponse> {
  const formData = new FormData();
  formData.append('job_title', params.job_title);
  formData.append('jd_text', params.jd_text);
  formData.append('resume_text', params.resume_text ?? '');
  formData.append('ats_score', String(params.ats_score ?? 0));
  return apiFetch<CreateSessionResponse>('/api/sessions/create', {
    method: 'POST',
    body: formData,
  });
}

/** Advance session to the next round. */
export async function advanceRound(sessionId: string): Promise<{
  status: string;
  round_index: number;
  round?: import('./types').RoundConfig;
}> {
  return apiFetch(`/api/sessions/${sessionId}/advance_round`, { method: 'POST' });
}

// ── Agora ──────────────────────────────────────────────────────

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

/** Start AI panel agents for the current round (personas from session). */
export async function startAgents(params: {
  session_id: string;
  channel_name: string;
  round_index?: number;
}): Promise<{ agent_ids: Record<string, string>; round_type?: string }> {
  return apiFetch('/api/agora/agents/start', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** Stop a specific Agora agent. */
export async function stopAgent(agentId: string): Promise<void> {
  await apiFetch(`/api/agora/agents/${agentId}`, { method: 'DELETE' });
}

// ── Orchestration ──────────────────────────────────────────────

export async function orchestrateTurn(
  sessionId: string,
  params: { candidate_utterance: string; utterance_id: string },
): Promise<OrchestrationResponse> {
  return apiFetch<OrchestrationResponse>(`/api/sessions/${sessionId}/orchestrate`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Session lifecycle ──────────────────────────────────────────

export async function endSession(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/sessions/${sessionId}/end`, {
    method: 'POST',
  });
}

export async function getSessionStatus(sessionId: string) {
  return apiFetch<{
    session_id: string;
    job_title: string;
    current_persona: string | null;
    transcript_count: number;
    status: string;
    elapsed_seconds: number;
    current_round_index: number;
    current_round: import('./types').RoundConfig;
    round_plan: import('./types').RoundConfig[];
    rubric: Record<string, import('./types').RubricPillar>;
    ats_score: number;
  }>(`/api/sessions/${sessionId}/status`);
}

// ── Report ─────────────────────────────────────────────────────

export async function getReport(sessionId: string): Promise<SessionReport> {
  return apiFetch<SessionReport>(`/api/sessions/${sessionId}/report`);
}
