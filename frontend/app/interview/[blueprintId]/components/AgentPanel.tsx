import React from 'react';
import { Clock, Zap, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Sparkles, UserCheck } from 'lucide-react';
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
  toggleDeafen
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

  const isSingleAgentMode = activePanelAgents.length === 1;
  const totalTiles = activePanelAgents.length + 1;
  const gridColsClass = totalTiles === 2 && !isSingleAgentMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="flex-1 w-full h-full p-2 flex flex-col relative min-h-0">
      {wrapUpWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-black px-4 py-2 rounded-full font-bold text-xs shadow-lg animate-pulse">
          ⏱️ Target Time Reached (4:50) — Wrapping up...
        </div>
      )}

      {testState === 'RUNNING' || testState === 'STARTING' || testState === 'ROUND_TRANSITION' ? (
        isSingleAgentMode ? (
          /* Vertical 50/50 Stacked Layout for Workspace / Single Agent Round */
          <div className="flex-1 flex flex-col gap-3 p-1 h-full min-h-0">
            {/* 50% Top Tile: Single Interviewer Agent */}
            {activePanelAgents.map((agent) => {
              const isAgentSpeaking = floorOwner === 'PRIMARY_AI' || floorOwner === 'HR_AI';
              
              return (
                <div key={agent.agentUid} className={`flex-1 min-h-0 relative bg-[#3c4043] rounded-2xl overflow-hidden shadow-lg flex flex-col items-center justify-center border-2 transition-colors ${isAgentSpeaking ? 'border-blue-500' : 'border-transparent'}`}>
                  <div className="flex-1 w-full flex items-center justify-center min-h-0">
                    <ParticleTalkingOrb 
                      isSpeaking={isAgentSpeaking}
                      isListening={floorOwner === 'CANDIDATE'}
                      isThinking={agent.intervening || testState === 'STARTING' || testState === 'ROUND_TRANSITION'}
                      size={150}
                      accentColor={agent.color || '#3B82F6'}
                    />
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-xs font-medium flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isAgentSpeaking ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`}></div>
                    {agent.name} <span className="text-gray-400 text-[10px]">({agent.role})</span>
                  </div>
                </div>
              );
            })}

            {/* 50% Bottom Tile: Candidate Local Camera Feed ("You") */}
            <div className={`flex-1 min-h-0 relative bg-[#3c4043] rounded-2xl overflow-hidden shadow-lg flex flex-col items-center justify-center border-2 transition-colors ${floorOwner === 'CANDIDATE' ? 'border-blue-500' : 'border-transparent'}`}>
              {isVideoOff ? (
                <div className="flex flex-col items-center justify-center text-gray-400 gap-2 p-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                    <VideoOff className="w-6 h-6 text-gray-400" />
                  </div>
                  <span className="text-xs font-mono text-gray-300 font-medium">Camera Switched Off</span>
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
              <div className="absolute inset-0 ring-inset ring-black/10 pointer-events-none"></div>
              
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-xs font-medium flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${floorOwner === 'CANDIDATE' ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`}></div>
                You
              </div>

              {toggleCamera && (
                <button
                  onClick={toggleCamera}
                  className={`absolute bottom-3 right-3 p-2 rounded-xl transition-all backdrop-blur-md border cursor-pointer ${
                    isVideoOff 
                      ? 'bg-red-500/80 hover:bg-red-600/90 border-red-400 text-white shadow-lg shadow-red-500/20' 
                      : 'bg-black/60 hover:bg-black/80 border-white/20 text-emerald-400'
                  }`}
                  title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Grid Layout for Multi-Agent Panel Round */
          <div className={`flex-1 grid gap-4 ${gridColsClass} p-2 h-full min-h-0`}>
            {/* Agent Tiles */}
            {activePanelAgents.map((agent) => {
              const isAgentSpeaking = floorOwner === (agent.isPrimary && activePanelAgents.length > 1 ? 'PRIMARY_AI' : (activePanelAgents.length > 1 ? 'CHALLENGER_AI' : (floorOwner === 'HR_AI' || floorOwner === 'PRIMARY_AI' ? floorOwner : 'NONE')));
              
              return (
                <div key={agent.agentUid} className={`relative bg-[#3c4043] rounded-2xl overflow-hidden shadow-lg flex flex-col items-center justify-center border-2 transition-colors ${isAgentSpeaking ? 'border-blue-500' : 'border-transparent'}`}>
                  <div className="flex-1 w-full flex items-center justify-center min-h-0">
                    <ParticleTalkingOrb 
                      isSpeaking={isAgentSpeaking}
                      isListening={floorOwner === 'CANDIDATE'}
                      isThinking={agent.intervening || testState === 'STARTING' || testState === 'ROUND_TRANSITION'}
                      size={180}
                      accentColor={agent.color || '#3B82F6'}
                    />
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isAgentSpeaking ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`}></div>
                    {agent.name} <span className="text-gray-400 text-xs hidden sm:inline">({agent.role})</span>
                  </div>
                </div>
              );
            })}

            {/* Local Candidate Tile */}
            <div className={`relative bg-[#3c4043] rounded-2xl overflow-hidden shadow-lg flex flex-col items-center justify-center border-2 transition-colors ${floorOwner === 'CANDIDATE' ? 'border-blue-500' : 'border-transparent'}`}>
              {isVideoOff ? (
                <div className="flex flex-col items-center justify-center text-gray-400 gap-2 p-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                    <VideoOff className="w-6 h-6 text-gray-400" />
                  </div>
                  <span className="text-xs font-mono text-gray-300 font-medium">Camera Switched Off</span>
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
              <div className="absolute inset-0 ring-inset ring-black/10 pointer-events-none"></div>
              
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${floorOwner === 'CANDIDATE' ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`}></div>
                You
              </div>

              {toggleCamera && (
                <button
                  onClick={toggleCamera}
                  className={`absolute bottom-4 right-4 p-2 rounded-xl transition-all backdrop-blur-md border cursor-pointer ${
                    isVideoOff 
                      ? 'bg-red-500/80 hover:bg-red-600/90 border-red-400 text-white shadow-lg shadow-red-500/20' 
                      : 'bg-black/60 hover:bg-black/80 border-white/20 text-emerald-400'
                  }`}
                  title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Fallback for IDLE state is handled in InterviewRoom directly */}
        </div>
      )}

      {/* Challenger Floor Request Alert Banner */}
      {pendingFloorNotice && (
        <div className="mt-4 max-w-lg mx-auto bg-purple-900/40 border border-purple-500/50 rounded-xl p-3 text-xs text-purple-200 flex items-center gap-2.5 animate-in fade-in duration-200">
          <Zap className="w-4 h-4 text-purple-400 shrink-0 animate-bounce" />
          <span className="font-mono">{pendingFloorNotice}</span>
        </div>
      )}

      {/* Floor Arbiter Bar */}
      {testState === 'RUNNING' && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-800/80 p-3.5 rounded-xl border border-gray-700/60 backdrop-blur">
          <div className={`px-4 py-1.5 rounded-full font-bold tracking-wider uppercase text-xs flex items-center gap-2 ${
            floorOwner === 'PRIMARY_AI' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
            floorOwner === 'CHALLENGER_AI' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 
            floorOwner === 'HR_AI' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
            floorOwner === 'CANDIDATE' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
            floorOwner === 'CROSSTALK' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
            'bg-gray-900/60 text-gray-400'
          }`}>
            {floorOwner === 'PRIMARY_AI' ? `🎙️ ${primaryAgent?.name || 'Primary'} Speaking` : 
             floorOwner === 'CHALLENGER_AI' ? `⚡ ${challengerAgent?.name || 'Challenger'} Intervening` : 
             floorOwner === 'HR_AI' ? '🎙️ HR Interviewer Speaking' : 
             floorOwner === 'CANDIDATE' ? '🗣️ You are Speaking' : 
             floorOwner === 'CROSSTALK' ? '⚠️ Interruption Detected' : 
             'Listening...'}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Quick Media Controls */}
            <div className="flex items-center gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-700/80">
              {toggleMute && (
                <button
                  onClick={toggleMute}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}

              {toggleCamera && (
                <button
                  onClick={toggleCamera}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isVideoOff ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                  title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                </button>
              )}

              {toggleDeafen && (
                <button
                  onClick={toggleDeafen}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isDeafened ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-800 text-gray-300 hover:text-white'
                  }`}
                  title={isDeafened ? "Undeafen Audio" : "Deafen Agent Audio"}
                >
                  {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <div className="flex-1 sm:w-36">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-75" style={{width: `${micVolume}%`}}></div>
              </div>
            </div>
            {currentRound === 0 ? (
              <button 
                onClick={() => finishRound('MANUAL_ADVANCE')} 
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-xs transition shadow-md whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                title="Advance to Technical Round (Fast-Forward)"
              >
                <span>Next Round (Technical)</span>
                <span className="text-blue-200">→</span>
              </button>
            ) : currentRound === 1 ? (
              <button 
                onClick={() => finishRound('MANUAL_ADVANCE')} 
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold text-xs transition shadow-md whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                title="Advance to HR Round (Fast-Forward)"
              >
                <span>Next Round (HR)</span>
                <span className="text-purple-200">→</span>
              </button>
            ) : (
              <button 
                onClick={() => finishRound('MANUAL_END')} 
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg font-bold text-xs transition shadow-md whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                title="End Interview"
              >
                <span>End Interview</span>
                <span className="text-red-200">✗</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Technical Closing Overlay */}
      {testState === 'TECHNICAL_CLOSING' && (
        <div className="absolute inset-0 bg-gray-950/80 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-2xl p-6">
          <Mic className="w-10 h-10 text-blue-400 mb-4 animate-pulse" />
          <h3 className="text-xl font-bold">Technical Round Concluding</h3>
          <p className="text-gray-400 mt-2 text-center max-w-sm text-xs leading-relaxed">
            The primary interviewer is wrapping up. Please wait...
          </p>
        </div>
      )}

      {/* HR Closing Overlay */}
      {testState === 'HR_CLOSING' && (
        <div className="absolute inset-0 bg-gray-950/80 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm rounded-2xl p-6">
          <Mic className="w-10 h-10 text-orange-400 mb-4 animate-pulse" />
          <h3 className="text-xl font-bold">HR Round Concluding</h3>
          <p className="text-gray-400 mt-2 text-center max-w-sm text-xs leading-relaxed">
            The HR interviewer is wrapping up. Please wait...
          </p>
        </div>
      )}

      {/* Evaluating / Decision Gate Overlay */}
      {(testState === 'EVALUATING' || testState === 'DECISION_GATE') && (
        <div className="absolute inset-0 bg-gray-950/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-md rounded-2xl p-6">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <h3 className="text-xl font-bold">
            {testState === 'DECISION_GATE' ? 'Decision Gate' : 'Evaluating Round Performance'}
          </h3>
          <p className="text-gray-400 mt-2 text-center max-w-sm text-xs leading-relaxed">
            {testState === 'DECISION_GATE' 
              ? 'Determining whether the candidate proceeds to the next round...'
              : 'Synthesizing evidence from the interview panel...'}
          </p>
        </div>
      )}

      {/* Round Transition Overlay */}
      {testState === 'ROUND_TRANSITION' && (
        <div className="absolute inset-0 bg-gray-950/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-md rounded-2xl p-6">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/40">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-emerald-400">Technical Round Passed!</h3>
          <p className="text-gray-400 mt-2 text-center max-w-sm text-xs leading-relaxed">
            Transitioning to the HR & Culture round. Your HR interviewer will join shortly...
          </p>
          <svg className="animate-spin h-5 w-5 text-gray-500 mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
      )}

      {/* Interview Complete Overlay (generating scorecard) */}
      {testState === 'INTERVIEW_COMPLETE' && (
        <div className="absolute inset-0 bg-gray-950/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-md rounded-2xl p-6">
          <svg className="animate-spin h-10 w-10 text-emerald-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <h3 className="text-xl font-bold">Generating Final Scorecard</h3>
          <p className="text-gray-400 mt-2 text-center max-w-sm text-xs leading-relaxed">
            Synthesizing evidence across all rounds to produce your final evaluation...
          </p>
        </div>
      )}

      {/* Ended State Overlay */}
      {testState === 'ENDED' && (
        <div className="absolute inset-0 bg-gray-950/95 z-30 flex flex-col items-center justify-center text-white backdrop-blur-md rounded-2xl p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2">Interview Completed!</h3>
          <p className="text-gray-300 max-w-sm text-sm mb-5">
            Session telemetry and responses captured. Redirecting to your session completion report...
          </p>
          <button 
            onClick={() => router.push(`/interview/${interviewId}/completed`)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            View Session Summary →
          </button>
        </div>
      )}
    </div>
  );
}
