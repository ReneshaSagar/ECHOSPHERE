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
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    channel: string;
    candidateUid: number;
    agentId: string;
  } | null>(null);
  
  type TestState = 'IDLE' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'ENDED' | 'ERROR';
  const [testState, setTestState] = useState<TestState>('IDLE');
  
  // Cleanup on tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionInfo?.agentId) {
        navigator.sendBeacon('/api/agora-mllm/stop-mllm', JSON.stringify({ 
          session_id: sessionInfo.sessionId, 
          agent_id: sessionInfo.agentId 
        }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionInfo]);

  const [micVolume, setMicVolume] = useState(0);

  // Orchestrator State
  const [jd, setJd] = useState('Senior Backend Engineer\n- Python\n- FastAPI\n- PostgreSQL\n- REST APIs');
  const [resume, setResume] = useState('Candidate has 5 years Python/FastAPI experience and previously built scalable REST APIs.');
  const [blueprint, setBlueprint] = useState<any>(null);
  const [orchestratorStatus, setOrchestratorStatus] = useState('IDLE');
  const [scorecard, setScorecard] = useState<any>(null);
  const [evalStatus, setEvalStatus] = useState('IDLE');

  // Removed legacy status polling

  const rtcClientRef = useRef<any>(null);
  const localMicRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = (comp: string, msg: string) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), comp, msg }]);
  };

  const updateStatus = (key: string, val: 'PASS' | 'FAIL') => {
    setStatus(prev => ({ ...prev, [key]: val }));
  };

  const generateBlueprint = async () => {
    setOrchestratorStatus('GENERATING...');
    addLog('Orchestrator', 'Generating interview blueprint...');
    
    try {
      const res = await fetch(`/api/orchestrator/blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jd, resume })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBlueprint(data);
      setOrchestratorStatus('READY');
      addLog('Orchestrator', 'Blueprint generated successfully.');
    } catch (e: any) {
      setOrchestratorStatus('FAILED');
      addLog('Orchestrator', `Failed: ${e.message}`);
    }
  };

  const startTest = async () => {
    if (!blueprint) {
      alert("Generate blueprint first!");
      return;
    }
    if (testState === 'STARTING' || testState === 'RUNNING') {
      console.warn("Test already starting or running.");
      return;
    }
    setTestState('STARTING');
    
    const sessionId = `test-${Math.random().toString(36).substring(7)}`;
    const candidateUid = Math.floor(Math.random() * 100000) + 1000;
    
    addLog('System', `Starting test session: ${sessionId}`);
    
    // 1. Check Backend
    
    try {
      const h = await fetch(`/api/agora-test/health`);
      if (h.ok) {
        updateStatus('backend', 'PASS');
        addLog('Backend', 'Health check passed');
      } else throw new Error('Backend health failed');
    } catch (e: any) {
      updateStatus('backend', 'FAIL');
      addLog('Backend', `Health check failed: ${e.message}`);
      return;
    }

    // 2. Start Agent via Backend
    let agentData;
    try {
      const interviewer = blueprint.interview_rounds[0].interviewer;
      const res = await fetch(`/api/agora-mllm/start-dynamic-mllm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          candidate_uid: candidateUid,
          instructions: interviewer.instructions,
          greeting_message: interviewer.greeting_message
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
        agentId: agentData.agent_id
      });
      addLog('Backend', `Agent created successfully. Agent ID: ${agentData.agent_id}`);
      
      try {
        const statusRes = await fetch(`/api/agora-test/status/${agentData.agent_id}`);
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry/${sessionId}`;
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

      client.on("user-joined", (user) => {
        addLog('RTC', `[user-joined] Remote UID ${user.uid} joined the channel`);
        updateStatus('agent_connected', 'PASS');
      });

      client.on("user-published", async (user, mediaType) => {
        addLog('RTC', `[user-published] Remote UID ${user.uid} published ${mediaType}`);
        if (mediaType === "audio") {
          updateStatus('agent_audio_published', 'PASS');
          try {
            await client.subscribe(user, "audio");
            addLog('RTC', `REMOTE AUDIO SUBSCRIBED`);
            
            if (user.audioTrack) {
              user.audioTrack.play();
              addLog('RTC', `REMOTE AUDIO PLAY() CALLED`);
              updateStatus('ai_audio_received', 'PASS');
            } else {
              addLog('RTC', `ERROR: No audioTrack found after subscribe`);
            }
          } catch (e: any) {
            addLog('RTC', `Failed to subscribe: ${e.message}`);
          }
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        addLog('RTC', `[user-unpublished] Remote UID ${user.uid} unpublished ${mediaType}`);
      });

      client.on("user-left", (user, reason) => {
        addLog('RTC', `[user-left] Remote UID ${user.uid} left channel. Reason: ${reason}`);
      });

      client.on('stream-message', (uid, data) => {
        try {
          const text = new TextDecoder().decode(data);
          addLog('RTC Stream', `Data received: ${text}`);
          const parsed = JSON.parse(text);
          const speaker = parsed.speaker || (String(uid) === String(candidateUid) ? 'CANDIDATE' : 'ALEX');
          const messageText = parsed.text || parsed.content || JSON.stringify(parsed);
          setTranscript(prev => [...prev, { speaker, text: messageText }]);
        } catch (err) {
          const rawText = new TextDecoder().decode(data);
          if (rawText) {
            setTranscript(prev => [...prev, { speaker: 'ALEX', text: rawText }]);
          }
        }
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
      updateStatus('candidate_audio_published', 'PASS');
      
      setInterval(() => {
        if (localMicRef.current) {
          const vol = localMicRef.current.getVolumeLevel();
          setMicVolume(Math.floor(vol * 100));
        }
      }, 200);

      setTestState('RUNNING');
    } catch (e: any) {
      addLog('RTC', `RTC setup failed: ${e.message}`);
      setTestState('ERROR');
    }
  };

  const endTest = async () => {
    if (testState === 'STOPPING') return;
    setTestState('STOPPING');
    
    if (localMicRef.current) {
      localMicRef.current.stop();
      localMicRef.current.close();
    }
    if (rtcClientRef.current) {
      await rtcClientRef.current.leave();
    }
    
    if (sessionInfo && sessionInfo.agentId) {
      try {
        const stopRes = await fetch(`/api/agora-mllm/stop-mllm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionInfo.sessionId, agent_id: sessionInfo.agentId })
        });
        if (!stopRes.ok) {
          addLog('System', `Failed to stop agent: HTTP ${stopRes.status}`);
        } else {
          addLog('System', `Agent stopped successfully via backend.`);
        }
      } catch (err: any) {
        addLog('System', `Error stopping agent: ${err.message}`);
      }
    } else {
      addLog('System', `No active agent ID to stop.`);
    }
    if (wsRef.current) wsRef.current.close();
    
    addLog('System', 'Test ended.');
    setSessionInfo(null);
    setTestState('ENDED');
  };

  const evaluateInterview = async () => {
    if (!blueprint || transcript.length === 0) {
      alert("No blueprint or empty transcript!");
      return;
    }
    setEvalStatus('EVALUATING...');
    addLog('Evaluator', 'Analyzing transcript and generating scorecard...');
    
    try {
      const res = await fetch(`/api/evaluator/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          job_description: jd, 
          resume: resume,
          rubric: blueprint.rubric || {},
          transcript: transcript
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScorecard(data);
      setEvalStatus('READY');
      addLog('Evaluator', 'Scorecard generated successfully.');
    } catch (e: any) {
      setEvalStatus('FAILED');
      addLog('Evaluator', `Failed: ${e.message}`);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans text-sm space-y-6">
      <h1 className="text-2xl font-bold border-b pb-2">Dynamic Interview Orchestrator</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-bold mb-2">Job Description</h2>
          <textarea 
            value={jd} 
            onChange={(e) => setJd(e.target.value)}
            className="w-full h-32 p-2 border rounded text-black"
          />
        </div>
        <div>
          <h2 className="font-bold mb-2">Candidate Resume</h2>
          <textarea 
            value={resume} 
            onChange={(e) => setResume(e.target.value)}
            className="w-full h-32 p-2 border rounded text-black"
          />
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <button onClick={generateBlueprint} className="px-4 py-2 bg-purple-600 text-white rounded">
          1. Generate Blueprint
        </button>
        <span className="font-bold text-gray-600">Status: {orchestratorStatus}</span>
      </div>

      {blueprint && (
        <div className="bg-purple-50 p-4 border border-purple-200 rounded">
          <h3 className="font-bold text-purple-900 mb-2">Generated Blueprint (Alex's Context)</h3>
          <pre className="text-xs overflow-auto max-h-40 text-black">{JSON.stringify(blueprint, null, 2)}</pre>
        </div>
      )}

      <div className="flex gap-4 items-center pt-4 border-t">
        <button 
          onClick={startTest} 
          disabled={!blueprint || testState === 'STARTING' || testState === 'RUNNING' || testState === 'STOPPING'} 
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          2. Start Voice Interview
        </button>
        <button 
          onClick={endTest} 
          disabled={testState !== 'RUNNING' && testState !== 'STARTING'}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          End Test
        </button>
        <button onClick={evaluateInterview} disabled={transcript.length === 0} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
          3. Evaluate Transcript
        </button>
        <span className="font-bold text-gray-600">Status: {evalStatus}</span>
      </div>

      {scorecard && (
        <div className="bg-green-50 p-4 border border-green-200 rounded">
          <h3 className="font-bold text-green-900 mb-2">Final Candidate Scorecard</h3>
          <div className="text-black space-y-2">
            <p><strong>Recommendation:</strong> {scorecard.overall_recommendation}</p>
            <p><strong>Summary:</strong> {scorecard.overall_summary}</p>
          </div>
          <pre className="text-xs overflow-auto max-h-64 mt-4 text-black border-t pt-2">{JSON.stringify(scorecard, null, 2)}</pre>
        </div>
      )}

      {/* Diagnostics Panel */}
      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <h2 className="font-bold mb-2 text-blue-800">Diagnostics (MLLM & Audio)</h2>
        <div className="grid grid-cols-3 gap-4">
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
            </div>
          ) : <p className="text-slate-400">Not started</p>}
          
          <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="font-bold mb-2 text-gray-800">Pipeline Status</h2>
            <div className="space-y-1 font-mono text-sm">
              <div className="flex justify-between">
                <span>Browser mic active</span>
                <span className={micVolume > 0 ? 'text-green-600' : 'text-gray-400'}>{micVolume > 0 ? 'PASS' : 'IDLE'}</span>
              </div>
              <div className="flex justify-between">
                <span>Candidate audio publishing</span>
                <span className={status.candidate_audio_published === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.candidate_audio_published || 'IDLE'}</span>
              </div>
              <div className="flex justify-between">
                <span>Agora agent connected</span>
                <span className={status.agent_connected === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.agent_connected || 'IDLE'}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span>MLLM Agent Status</span>
                <span className={status.agent_actual_state === 'RUNNING' ? 'text-green-600' : 'text-gray-400'}>{status.agent_actual_state || 'IDLE'}</span>
              </div>
              <div className="flex justify-between">
                <span>Agent audio published</span>
                <span className={status.agent_audio_published === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.agent_audio_published || 'IDLE'}</span>
              </div>
              <div className="flex justify-between">
                <span>Browser subscribed</span>
                <span className={status.ai_audio_received === 'PASS' ? 'text-green-600' : 'text-gray-400'}>{status.ai_audio_received || 'IDLE'}</span>
              </div>
              <div className="flex justify-between mt-4 border-t pt-2 border-gray-200">
                <span>Auth / Errors</span>
                <span className={logs.some(l => l.msg.includes('500') || l.msg.includes('failed') || l.msg.includes('Error')) ? 'text-red-600 font-bold' : 'text-green-600'}>
                  {logs.some(l => l.msg.includes('500') || l.msg.includes('failed') || l.msg.includes('Error')) ? 'FAIL' : 'PASS'}
                </span>
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
