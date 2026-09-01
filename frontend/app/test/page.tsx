"use client";

import React, { useState, useRef, useEffect } from 'react';

export default function AgoraTestLab() {
  const [status, setStatus] = useState<Record<string, 'IDLE' | 'PASS' | 'FAIL'>>({
    backend: 'IDLE',
    agent_creation: 'IDLE',
    agent_joined: 'IDLE',
    candidate_audio: 'IDLE',
    ai_audio_received: 'IDLE'
  });
  
  const [logs, setLogs] = useState<{time: string, comp: string, msg: string}[]>([]);
  const [transcript, setTranscript] = useState<{speaker: string, text: string}[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  
  // Diagnostic state
  const [llmRequestCount, setLlmRequestCount] = useState(0);
  const [lastRequestTime, setLastRequestTime] = useState('-');
  const [testCustomLlmStatus, setTestCustomLlmStatus] = useState<string>('IDLE');
  const [testOpenAiStatus, setTestOpenAiStatus] = useState<string>('IDLE');
  const [micVolume, setMicVolume] = useState<number>(0);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/agora-test/stats`);
        if (res.ok) {
          const data = await res.json();
          if (data.llm_request_count > llmRequestCount) {
             setLlmRequestCount(data.llm_request_count);
             setLastRequestTime(new Date().toLocaleTimeString());
          }
        }
      } catch (e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [llmRequestCount]);

  const rtcClientRef = useRef<any>(null);
  const localMicRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = (comp: string, msg: string) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), comp, msg }]);
  };

  const updateStatus = (key: string, val: 'PASS' | 'FAIL') => {
    setStatus(prev => ({ ...prev, [key]: val }));
  };

  const startTest = async () => {
    const sessionId = `test-${Math.random().toString(36).substring(7)}`;
    const candidateUid = String(Math.floor(Math.random() * 100000) + 1000);
    
    addLog('System', `Starting test session: ${sessionId}`);
    
    // 1. Check Backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const h = await fetch(`${API_URL}/api/agora-test/health`);
      if (h.ok) {
        updateStatus('backend', 'PASS');
        addLog('Backend', 'Health check passed');
      } else throw new Error('Backend health failed');
    } catch (e: any) {
      updateStatus('backend', 'FAIL');
      addLog('Backend', `Health check failed: ${e.message}`);
      return;
    }

    // 2. Start Agent
    let agentData;
    try {
      const res = await fetch(`${API_URL}/api/agora-test/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, candidate_uid: candidateUid })
      });
      updateStatus('backend', 'PASS');
      agentData = await res.json();
      
      addLog('Backend', `RAW AGORA RESPONSE: ${JSON.stringify(agentData.raw_response, null, 2)}`);
      
      if (!res.ok) {throw new Error(agentData.detail || 'Failed to start agent');
      }
      
      updateStatus('agent_creation', 'PASS');
      updateStatus('agent_creation_http', '200');
      setSessionInfo({
        sessionId,
        channel: agentData.channel_name,
        candidateUid: candidateUid,
        agentId: agentData.agent_id,
        webhookUrl: `${API_URL}/api/agora-test/llm/${sessionId}/chat/completions`
      });
      addLog('Backend', `Agent created successfully. Agent ID: ${agentData.agent_id}`);
      
      try {
        const statusRes = await fetch(`${API_URL}/api/agora-test/status/${agentData.agent_id}`);
        const statusData = await statusRes.json();
        addLog('Backend', `RAW AGENT STATUS: ${statusData.response}`);
        const parsed = JSON.parse(statusData.response);
        updateStatus('agent_actual_state', parsed.status || 'UNKNOWN');
      } catch (e: any) {
        addLog('Backend', `Failed to fetch actual status: ${e.message}`);
        updateStatus('agent_actual_state', 'UNKNOWN');
      }
    } catch (e: any) {
      updateStatus('agent_creation', 'FAIL');
      addLog('Backend', `Agent creation failed: ${e.message}`);
      return;
    }

    // 3. Connect WebSocket for Transcript
    const wsUrl = `${API_URL.replace('http', 'ws')}/ws/telemetry/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'test_transcript') {
        setTranscript(prev => [...prev, { speaker: msg.speaker, text: msg.text }]);
      }
    };

    // 4. Join Agora RTC
    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      rtcClientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        addLog('RTC', `Remote user published: ${user.uid} (${mediaType})`);
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          addLog('RTC', `Subscribing to AI audio and playing locally...`);
          user.audioTrack?.play();
          updateStatus('ai_audio_received', 'PASS');
        }
      });

      client.on('user-joined', (user) => {
        addLog('RTC', `User joined channel: ${user.uid}`);
        updateStatus('agent_joined', 'PASS');
      });

      await client.join(
        process.env.NEXT_PUBLIC_AGORA_APP_ID!,
        agentData.channel_name,
        agentData.candidate_token,
        candidateUid
      );
      addLog('RTC', `Browser joined channel successfully`);
      
      const localMic = await AgoraRTC.createMicrophoneAudioTrack();
      localMicRef.current = localMic;
      addLog('RTC', `Local microphone created. (NOT playing locally)`);
      
      await client.publish([localMic]);
      addLog('RTC', `Local microphone published to channel`);
      updateStatus('candidate_audio', 'PASS');
      
      // Start volume check
      setInterval(() => {
        if (localMicRef.current) {
          const vol = localMicRef.current.getVolumeLevel();
          setMicVolume(Math.floor(vol * 100));
        }
      }, 200);

    } catch (e: any) {
      addLog('RTC', `RTC setup failed: ${e.message}`);
    }
  };

  const endTest = async () => {
    if (localMicRef.current) {
      localMicRef.current.stop();
      localMicRef.current.close();
    }
    if (rtcClientRef.current) {
      await rtcClientRef.current.leave();
    }
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    if (sessionInfo) {
      await fetch(`${API_URL}/api/agora-test/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionInfo.sessionId, candidate_uid: 0 })
      });
    }
    if (wsRef.current) wsRef.current.close();
    
    addLog('System', 'Test ended.');
    setSessionInfo(null);
  };

  const testCustomLlm = async () => {
    setTestCustomLlmStatus('TESTING...');
    if (!sessionInfo?.sessionId) {
      setTestCustomLlmStatus('FAIL (Start agent first)');
      return;
    }
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${API_URL}/api/agora-test/llm/${sessionInfo.sessionId}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{role: "user", content: "Say exactly: Agora test successful."}],
          stream: true
        })
      });
      if (res.ok) setTestCustomLlmStatus('PASS (HTTP 200)');
      else setTestCustomLlmStatus(`FAIL (${res.status})`);
    } catch (e: any) {
      setTestCustomLlmStatus(`FAIL (${e.message})`);
    }
  };

  const testOpenAi = async () => {
    setTestOpenAiStatus('TESTING...');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${API_URL}/api/agora-test/test-openai`);
      if (res.ok) setTestOpenAiStatus('PASS (HTTP 200)');
      else setTestOpenAiStatus(`FAIL (${res.status})`);
    } catch (e: any) {
      setTestOpenAiStatus(`FAIL (${e.message})`);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto font-mono text-sm space-y-6">
      <h1 className="text-2xl font-bold border-b pb-2">AGORA TEST LAB</h1>
      
      <div className="flex gap-4 items-center">
        <button onClick={startTest} className="px-4 py-2 bg-blue-600 text-white rounded">Start Agora Test</button>
        <button onClick={endTest} className="px-4 py-2 bg-red-600 text-white rounded">End Test</button>
        
        <div className="border-l pl-4 flex gap-4 ml-4">
          <button onClick={testCustomLlm} className="px-3 py-1 bg-gray-800 text-white rounded">Test Custom LLM</button>
          <span>{testCustomLlmStatus}</span>
          
          <button onClick={testOpenAi} className="px-3 py-1 bg-gray-800 text-white rounded">Test OpenAI</button>
          <span>{testOpenAiStatus}</span>
        </div>
      </div>

      {/* Diagnostics Panel */}
      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <h2 className="font-bold mb-2 text-blue-800">Diagnostics (Webhook LLM & Audio)</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><span className="font-bold">Requests Received:</span> {llmRequestCount}</div>
          <div><span className="font-bold">Last Request Time:</span> {lastRequestTime}</div>
          <div><span className="font-bold">Mic Volume:</span> <span className={micVolume > 0 ? "text-green-600 font-bold" : "text-gray-500"}>{micVolume}%</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-bold bg-slate-100 p-2">Session Info</h2>
          {sessionInfo ? (
            <div className="text-xs space-y-1 break-all">
              <p>Session ID: {sessionInfo.sessionId}</p>
              <p>Channel: {sessionInfo.channel}</p>
              <p>Candidate UID: {sessionInfo.candidateUid}</p>
              <p>Agent ID: {sessionInfo.agentId}</p>
              <p>LLM Webhook: {sessionInfo.llmUrl}</p>
            </div>
          ) : <p className="text-slate-400">Not started</p>}
          
          <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="font-bold mb-2 text-gray-800">Pipeline Status</h2>
            <div className="space-y-1 font-mono text-sm">
              <div className="flex justify-between">
                <span>Agent actual state</span>
                <span className={status.agent_actual_state === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.agent_actual_state}</span>
              </div>
              <div className="flex justify-between">
                <span>Candidate RTC</span>
                <span className={status.candidate_rtc === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.candidate_rtc}</span>
              </div>
              <div className="flex justify-between">
                <span>Agent RTC</span>
                <span className={status.agent_rtc === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.agent_rtc}</span>
              </div>
              <div className="flex justify-between">
                <span>Agent listening UID</span>
                <span className={status.agent_listening_uid === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.agent_listening_uid}</span>
              </div>
              <div className="flex justify-between">
                <span>STT</span>
                <span className={status.stt === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.stt}</span>
              </div>
              <div className="flex justify-between">
                <span>LLM requests</span>
                <span className={status.llm_requests === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.llm_requests}</span>
              </div>
              <div className="flex justify-between">
                <span>TTS</span>
                <span className={status.tts === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.tts}</span>
              </div>
              <div className="flex justify-between">
                <span>AI audio</span>
                <span className={status.ai_audio === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.ai_audio}</span>
              </div>
              <div className="flex justify-between mt-4 border-t pt-2 border-gray-200">
                <span>agent_greeting_sent</span>
                <span className={status.agent_greeting_sent === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.agent_greeting_sent}</span>
              </div>
              <div className="flex justify-between">
                <span>ai_audio_received</span>
                <span className={status.ai_audio_received === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.ai_audio_received}</span>
              </div>
            </div>
          </div>
        </div>
          
          <h2 className="font-bold bg-slate-100 p-2 mt-4">Transcript</h2>
          <div className="h-48 overflow-y-auto border p-2 text-xs space-y-2 bg-slate-50">
            {transcript.map((t, i) => (
              <div key={i}>
                <span className="font-bold text-blue-600 uppercase">{t.speaker}: </span>
                <span>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="font-bold bg-slate-100 p-2">Error / Debug Log</h2>
          <div className="h-[400px] overflow-y-auto border p-2 text-xs space-y-1 bg-black text-green-400">
            {logs.map((l, i) => (
              <div key={i}>
                <span className="text-gray-500">[{l.time}]</span>{' '}
                <span className="text-yellow-400">[{l.comp}]</span>{' '}
                {l.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
