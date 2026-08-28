const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CreateSessionParams {
  job_title: string;
  jd_text: string;
  resume_file: File;
}

export async function createSession(params: CreateSessionParams): Promise<any> {
  const formData = new FormData();
  formData.append('job_title', params.job_title);
  formData.append('jd_text', params.jd_text);
  formData.append('resume_file', params.resume_file);

  const res = await fetch(`${API_URL}/api/sessions/create`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create session: ${err}`);
  }
  return res.json();
}

export async function getToken(params: { channel_name: string; uid: number; role?: number }): Promise<any> {
  const query = new URLSearchParams({
    channel_name: params.channel_name,
    uid: params.uid.toString(),
  });
  if (params.role !== undefined) query.append('role', params.role.toString());

  const res = await fetch(`${API_URL}/api/agora/token?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to get token');
  return res.json();
}

export async function startAgents(params: {
  session_id: string;
  channel_name: string;
}): Promise<{ agent_ids: Record<string, string> }> {
  // Use modern endpoint prefix matching backend router prefix
  const res = await fetch(`${API_URL}/api/agora/agents/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to start agents');
  return res.json();
}

export async function gradeRound(sessionId: string, params: { round_index: number; submission_content: string }): Promise<any> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to grade round');
  return res.json();
}

export async function orchestrateTurn(sessionId: string, params: any): Promise<any> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/orchestrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to orchestrate turn');
  return res.json();
}

export async function endSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/end`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to end session');
}

export async function getSessionStatus(sessionId: string): Promise<any> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/status`);
  if (!res.ok) throw new Error('Failed to get session status');
  return res.json();
}

export async function getReport(sessionId: string): Promise<any> {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/report`);
  if (!res.ok) throw new Error('Failed to fetch report');
  return res.json();
}
