import React from 'react';
import { Sparkles, Video, VideoOff, Mic, MicOff, UserCheck, Zap, ArrowRight } from 'lucide-react';
import ParticleTalkingOrb from '@/components/room/ParticleTalkingOrb';
import { useRouter } from 'next/navigation';

export interface RunningAgent {
  agentId: string;
  agentUid: number;
  name: string;
  role: string;
  voice: string;
  color: string;
  isPrimary: boolean;
  hasFloor: boolean;
  intervening: boolean;
}

interface AgentPanelProps {
  testState: string;
  wrapUpWarning: boolean;
  activePanelAgents: RunningAgent[];
  floorOwner: string;
  primaryAgent: RunningAgent | undefined;
  challengerAgent: RunningAgent | undefined;
  currentRound: number;
  blueprint: any;
  pendingFloorNotice: string | null;
  interviewId: string;
  micVolume: number;
  finishRound: (reason: string) => void;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  candidateName: string;
  localStream?: MediaStream | null;
  isVideoOff?: boolean;
  toggleCamera?: () => void;
  isMuted?: boolean;
  toggleMute?: () => void;
  isDeafened?: boolean;
  toggleDeafen?: () => void;
  isSidebar?: boolean;
}

export default function AgentPanel({
  testState,
  wrapUpWarning,
  activePanelAgents,
  floorOwner,
  primaryAgent,
  challengerAgent,
  currentRound,
  blueprint,
  pendingFloorNotice,
  interviewId,
  micVolume,
  finishRound,
  localVideoRef,
  candidateName,
  localStream,
  isVideoOff = false,
  toggleCamera,
  isMuted = false,
  toggleMute,
  isDeafened = false,
  toggleDeafen,
  isSidebar = false
}: AgentPanelProps) {
  const router = useRouter();
  
  const videoRefCallback = React.useCallback((node: HTMLVideoElement | null) => {
    if (localVideoRef) {
      (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    }
    if (node && localStream) {
      if (node.srcObject !== localStream) {
        node.srcObject = localStream;
      }
    }
  }, [localStream, localVideoRef]);

  // Attach webcam stream whenever localVideoRef or localStream updates
  React.useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, localVideoRef]);

  const currentRoundData = blueprint?.interview_rounds?.[currentRound];
  const roundInterviewers = currentRoundData?.interviewers && currentRoundData.interviewers.length > 0
    ? currentRoundData.interviewers
    : (currentRoundData?.interviewer ? [currentRoundData.interviewer] : []);

  const fallbackDisplayAgents: RunningAgent[] = roundInterviewers.map((intv: any, idx: number) => ({
    agentId: `preview_${intv.agent_uid || idx}`,
    agentUid: intv.agent_uid || (idx === 0 ? 9991 : 9992),
    name: intv.name || (idx === 0 ? 'Lead Evaluator' : 'Specialist Evaluator'),
    role: intv.role || (idx === 0 ? 'Lead Evaluator' : 'Specialist'),
    voice: intv.voice || 'Aoede',
    color: intv.color || (idx === 0 ? '#8B5CF6' : '#00AEEF'),
    isPrimary: idx === 0,
    hasFloor: idx === 0,
    intervening: false
  }));

  const effectiveAgents: RunningAgent[] = activePanelAgents.length > 0 ? activePanelAgents : fallbackDisplayAgents;
  const isSingleAgentMode = effectiveAgents.length === 1;
  const totalTiles = effectiveAgents.length + 1;
  const gridColsClass = totalTiles === 2 && !isSingleAgentMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="flex-1 w-full h-full p-2 flex flex-col relative min-h-0">
      {wrapUpWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-full font-mono text-xs shadow-lg backdrop-blur-md animate-pulse">
          ⏱️ Target Time Reached (4:50) — Wrapping up evaluation
        </div>
      )}

      {testState !== 'IDLE' ? (
        isSingleAgentMode && isSidebar ? (
          /* Vertical 50/50 Stacked Layout for Workspace Sidebar (Round 1) */
          <div className="flex-1 flex flex-col gap-3 p-1 h-full min-h-0">
            {/* 50% Top Tile: Single Interviewer Agent */}
            {effectiveAgents.map((agent) => {
              const isAgentSpeaking = floorOwner === 'PRIMARY_AI' || floorOwner === 'HR_AI';
              
              return (
                <div 
                  key={agent.agentUid} 
                  className={`flex-1 min-h-0 relative bg-[#09090d]/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center border transition-all duration-300 ${
                    isAgentSpeaking 
                      ? 'border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/40' 
                      : 'border-white/[0.08]'
                  }`}
                >
                  <div className="flex-1 w-full flex items-center justify-center min-h-0 relative z-10">
                    <ParticleTalkingOrb 
                      isSpeaking={isAgentSpeaking}
                      isListening={floorOwner === 'CANDIDATE'}
                      isThinking={agent.intervening || testState === 'STARTING' || testState === 'ROUND_TRANSITION' || activePanelAgents.length === 0}
                      size={140}
                      accentColor={agent.color || '#8B5CF6'}
                    />
                  </div>
                  
                  {/* Subtle Nameplate */}
                  <div className="absolute bottom-3 left-3 z-20 bg-[#030304]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.08] text-white text-xs font-medium flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isAgentSpeaking ? 'bg-purple-400 animate-pulse' : (testState === 'STARTING' || testState === 'ROUND_TRANSITION') ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`}></div>
                    <span>{agent.name}</span>
                    <span className="text-zinc-400 font-mono text-[10px]">({agent.role})</span>
                  </div>
                </div>
              );
            })}

            {/* 50% Bottom Tile: Candidate Local Camera Feed ("You") */}
            <div 
              className={`flex-1 min-h-0 relative bg-[#09090d]/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center border transition-all duration-300 ${
                floorOwner === 'CANDIDATE' 
                  ? 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40' 
                  : 'border-white/[0.08]'
              }`}
            >
              {isVideoOff ? (
                <div className="flex flex-col items-center justify-center text-zinc-500 gap-2 p-4">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <VideoOff className="w-5 h-5 text-zinc-400" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400">Camera Off</span>
                </div>
              ) : (
                <video 
                  ref={videoRefCallback}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
              
              <div className="absolute bottom-3 left-3 z-20 bg-[#030304]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.08] text-white text-xs font-medium flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${floorOwner === 'CANDIDATE' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}></div>
                <span>{candidateName || 'You'}</span>
                <span className="text-zinc-400 text-[10px] font-mono">(Candidate)</span>
              </div>
            </div>
          </div>
        ) : (
          /* Side-by-Side 2-Column Grid OR 3-Tile Multi-Agent Grid */
          <div className={`flex-1 grid gap-4 ${isSingleAgentMode ? 'grid-cols-1 md:grid-cols-2' : gridColsClass} p-2 h-full min-h-0`}>
            {/* Agent Tiles */}
            {effectiveAgents.map((agent) => {
              const isAgentSpeaking = isSingleAgentMode 
                ? (floorOwner === 'PRIMARY_AI' || floorOwner === 'HR_AI')
                : (floorOwner === (agent.isPrimary && effectiveAgents.length > 1 ? 'PRIMARY_AI' : (effectiveAgents.length > 1 ? 'CHALLENGER_AI' : (floorOwner === 'HR_AI' || floorOwner === 'PRIMARY_AI' ? floorOwner : 'NONE'))));
              
              return (
                <div 
                  key={agent.agentUid} 
                  className={`relative bg-[#09090d]/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center border transition-all duration-300 ${
                    isAgentSpeaking 
                      ? 'border-purple-500/60 shadow-[0_0_30px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/40' 
                      : 'border-white/[0.08]'
                  }`}
                >
                  <div className="flex-1 w-full flex items-center justify-center min-h-0 relative z-10">
                    <ParticleTalkingOrb 
                      isSpeaking={isAgentSpeaking}
                      isListening={floorOwner === 'CANDIDATE'}
                      isThinking={agent.intervening || testState === 'STARTING' || testState === 'ROUND_TRANSITION' || activePanelAgents.length === 0}
                      size={isSingleAgentMode ? 200 : 170}
                      accentColor={agent.color || '#8B5CF6'}
                    />
                  </div>
                  
                  <div className="absolute bottom-4 left-4 z-20 bg-[#030304]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/[0.08] text-white text-xs font-medium flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isAgentSpeaking ? 'bg-purple-400 animate-pulse' : (testState === 'STARTING' || testState === 'ROUND_TRANSITION') ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`}></div>
                    <span>{agent.name}</span>
                    <span className="text-zinc-400 text-[11px] font-mono">({agent.role})</span>
                  </div>
                </div>
              );
            })}

            {/* Local Candidate Tile (Next to Evaluator) */}
            <div 
              className={`relative bg-[#09090d]/90 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center border transition-all duration-300 ${
                floorOwner === 'CANDIDATE' 
                  ? 'border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40' 
                  : 'border-white/[0.08]'
              }`}
            >
              {isVideoOff ? (
                <div className="flex flex-col items-center justify-center text-zinc-500 gap-2 p-4">
                  <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <VideoOff className="w-6 h-6 text-zinc-400" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400">Camera Switched Off</span>
                </div>
              ) : (
                <video 
                  ref={videoRefCallback}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
              
              <div className="absolute bottom-4 left-4 z-20 bg-[#030304]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/[0.08] text-white text-xs font-medium flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${floorOwner === 'CANDIDATE' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}></div>
                <span>{candidateName || 'You'}</span>
                <span className="text-zinc-400 text-[11px] font-mono">(Candidate)</span>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Fallback for IDLE state */}
        </div>
      )}

      {/* Challenger Floor Request Alert Banner */}
      {pendingFloorNotice && (
        <div className="mt-3 max-w-md mx-auto bg-purple-950/40 border border-purple-500/30 rounded-xl px-4 py-2.5 text-xs text-purple-200 flex items-center gap-2.5 backdrop-blur-md animate-in fade-in duration-200">
          <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="font-mono">{pendingFloorNotice}</span>
        </div>
      )}

      {/* Floor Arbiter Indicator Pill */}
      {testState === 'RUNNING' && (
        <div className="mt-3 flex items-center justify-between px-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
            floorOwner === 'PRIMARY_AI' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 
            floorOwner === 'CHALLENGER_AI' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 
            floorOwner === 'HR_AI' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 
            floorOwner === 'CANDIDATE' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 
            floorOwner === 'CROSSTALK' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 
            'bg-white/[0.03] text-zinc-500 border border-white/[0.06]'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            <span>
              {floorOwner === 'PRIMARY_AI' ? `${primaryAgent?.name || 'Primary'} speaking` : 
               floorOwner === 'CHALLENGER_AI' ? `${challengerAgent?.name || 'Challenger'} intervening` : 
               floorOwner === 'HR_AI' ? 'HR Evaluator speaking' : 
               floorOwner === 'CANDIDATE' ? 'You are speaking' : 
               floorOwner === 'CROSSTALK' ? 'Simultaneous speech detected' : 
               'Panel listening...'}
            </span>
          </div>

          {/* Quick Round Advance Option */}
          <div>
            {currentRound === 0 ? (
              <button 
                onClick={() => finishRound('MANUAL_ADVANCE')} 
                disabled={testState !== 'RUNNING'}
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>Complete Round 1</span>
                <ArrowRight className="w-3 h-3 text-purple-400" />
              </button>
            ) : currentRound === 1 ? (
              <button 
                onClick={() => finishRound('MANUAL_ADVANCE')} 
                disabled={testState !== 'RUNNING'}
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>Complete Round 2</span>
                <ArrowRight className="w-3 h-3 text-purple-400" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Technical / Workspace Closing Overlay */}
      {testState === 'TECHNICAL_CLOSING' && (
        <div className="absolute inset-0 bg-[#030304]/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-xl rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-sans font-semibold">
            {currentRound === 0 ? 'Workspace Assessment Concluding' : 'Technical Round Concluding'}
          </h3>
          <p className="text-zinc-400 mt-2 text-center max-w-sm text-xs leading-relaxed font-sans">
            {currentRound === 0 
              ? 'Capturing final code & system design snapshot. Transitioning to panel...' 
              : 'The technical panel is wrapping up. Please wait...'}
          </p>
        </div>
      )}

      {/* HR Closing Overlay */}
      {testState === 'HR_CLOSING' && (
        <div className="absolute inset-0 bg-[#030304]/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-xl rounded-2xl p-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-sans font-semibold">Leadership Round Concluding</h3>
          <p className="text-zinc-400 mt-2 text-center max-w-sm text-xs leading-relaxed font-sans">
            The evaluator is concluding the session. Please hold on...
          </p>
        </div>
      )}

      {/* Evaluating / Decision Gate Overlay */}
      {(testState === 'EVALUATING' || testState === 'DECISION_GATE') && (
        <div className="absolute inset-0 bg-[#030304]/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-xl rounded-2xl p-6">
          <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-sans font-semibold">
            {testState === 'DECISION_GATE' ? 'Decision Gate Evaluation' : 'Evaluating Workspace & Evidence'}
          </h3>
          <p className="text-zinc-400 mt-2 text-center max-w-sm text-xs leading-relaxed font-sans">
            {testState === 'DECISION_GATE' 
              ? 'Synthesizing performance rubrics and transitioning to the next round...'
              : 'Analyzing live code execution, test pass rates, and architectural reasoning...'}
          </p>
        </div>
      )}

      {/* Round Transition Overlay */}
      {testState === 'ROUND_TRANSITION' && (
        <div className="absolute inset-0 bg-[#030304]/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-xl rounded-2xl p-6">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-sans font-semibold text-emerald-300">
            {currentRound === 1 
              ? 'Round 1 Assessment Complete' 
              : currentRound === 2 
                ? 'Technical Architecture Complete' 
                : `Round ${currentRound} Complete`}
          </h3>
          <p className="text-zinc-400 mt-2 text-center max-w-sm text-xs leading-relaxed font-sans">
            {currentRound === 1
              ? `Transitioning to Round 2 of 3: ${currentRoundData?.round_name || 'Technical Panel Interview'}. Your technical evaluators are joining...`
              : currentRound === 2
                ? `Transitioning to Round 3 of 3: ${currentRoundData?.round_name || 'Engineering Leadership & Culture'}. Your evaluator is joining...`
                : `Transitioning to Round ${Math.min(currentRound + 1, 3)}: ${currentRoundData?.round_name || 'Next Round'}...`}
          </p>
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mt-4"></div>
        </div>
      )}

      {/* Error Overlay with Reconnect Action */}
      {testState === 'ERROR' && (
        <div className="absolute inset-0 bg-[#030304]/95 z-30 flex flex-col items-center justify-center text-white backdrop-blur-xl rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mb-4 border border-rose-500/30">
            <MicOff className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-sans font-semibold text-white mb-1">Session Reconnection Needed</h3>
          <p className="text-zinc-400 max-w-sm text-xs mb-5 leading-relaxed font-sans">
            A temporary connection issue occurred while initializing the panel. Click below to reconnect to Round {currentRound + 1}.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-white text-black font-semibold rounded-full text-xs transition hover:bg-zinc-200 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            ↻ Reconnect to Session
          </button>
        </div>
      )}

      {/* Interview Complete Overlay */}
      {testState === 'INTERVIEW_COMPLETE' && (
        <div className="absolute inset-0 bg-[#030304]/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-xl rounded-2xl p-6">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-sans font-semibold">Finalizing Interview Session</h3>
          <p className="text-zinc-400 mt-2 text-center max-w-sm text-xs leading-relaxed font-sans">
            Synthesizing session evidence and saving your submission...
          </p>
        </div>
      )}

      {/* Ended State Overlay */}
      {testState === 'ENDED' && (
        <div className="absolute inset-0 bg-[#030304]/95 z-30 flex flex-col items-center justify-center text-white backdrop-blur-xl rounded-2xl p-6 text-center animate-in fade-in">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
            <UserCheck className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-sans font-semibold text-white mb-2">interview session completed!</h3>
          <p className="text-zinc-400 max-w-sm text-xs mb-5 font-sans">
            Thank you for meeting with our panel. Your interview session has concluded.
          </p>
          <button 
            onClick={() => {
              if (localStream) {
                localStream.getTracks().forEach(t => {
                  try { t.stop(); } catch (e) {}
                });
              }
              router.push(`/interview/${interviewId}/completed`);
            }}
            className="px-6 py-3 bg-white text-black font-semibold rounded-full text-xs transition hover:bg-zinc-200 shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer"
          >
            View Completion Status →
          </button>
        </div>
      )}
    </div>
  );
}
