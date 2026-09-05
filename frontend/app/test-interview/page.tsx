'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bot, 
  Sparkles, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Users, 
  ShieldCheck, 
  Clock, 
  Database, 
  ExternalLink, 
  FileText, 
  RefreshCw,
  Cpu,
  Layers,
  ArrowRightCircle
} from 'lucide-react';

export default function TestInterviewSuitePage() {
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Initialize demo test interview and launch
  const handleLaunchLiveInterview = async () => {
    try {
      setIsSeeding(true);
      setMessage('Seeding isolated demo candidate (Alex Rivera) and 2-round blueprint...');
      
      const res = await fetch('/api/dev/demo-interview', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setMessage('Launching live interview room...');
        router.push('/interview/demo-blueprint-test');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Failed: ${e.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Run full synthetic simulation without waiting for audio
  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      setSimResult(null);
      setMessage('1/4: Initializing demo candidate and blueprint...');
      
      // 1. Seed
      await fetch('/api/dev/demo-interview', { method: 'POST' });

      // 2. Simulate Round 1 (Technical Round)
      setMessage('2/4: Simulating Round 1 (Technical Interview: Concurrency & Raft)...');
      const r1Transcript = [
        { round: "Round 1: Technical Panel", speaker: "Priya Nair", text: "Hi Alex, welcome to Nexora Labs. Could you walk us through how you handled log batch replication in your Chronos-Raft engine?" },
        { round: "Round 1: Technical Panel", speaker: "Alex Rivera", text: "In Chronos-Raft, we batch append-entry RPCs using non-blocking ring buffers in Go. We vectorize disk writes via fdatasync to ensure zero disk stalls under heavy concurrency." },
        { round: "Round 1: Technical Panel", speaker: "Priya Nair", text: "Arjun, do you want to ask Alex about their Kafka backpressure handling?" },
        { round: "Round 1: Technical Panel", speaker: "Arjun Malhotra", text: "Alex, how do you prevent consumer group rebalancing storms when partitions scale to hundreds of topics?" },
        { round: "Round 1: Technical Panel", speaker: "Alex Rivera", text: "We utilize cooperative sticky assignors and isolate heartbeats on dedicated goroutines to avoid false lease timeouts during long GC pauses." },
        { round: "Round 1: Technical Panel", speaker: "Arjun Malhotra", text: "Solid explanation. Back to you, Priya." }
      ];

      await fetch('/api/interviews/demo-interview-test/evaluate-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundName: "Round 1: Technical Panel (Systems & Concurrency)",
          transcript: r1Transcript,
          rubric: { "Concurrency": "Go channels and lock-free data structures", "Distributed Consensus": "Raft log replication" }
        })
      });

      // 3. Simulate Round 2 (HR & Culture Round)
      setMessage('3/4: Simulating Round 2 (HR & Culture Round: Ownership & Incident Leadership)...');
      const r2Transcript = [
        { round: "Round 2: HR, Culture & Leadership", speaker: "Sarah Jenkins", text: "Hi Alex! Priya and Arjun shared strong notes from your tech round. Tell me about a time you owned a major production incident." },
        { round: "Round 2: HR, Culture & Leadership", speaker: "Alex Rivera", text: "During a black-swan network partition, I coordinated the incident war room, applied a rate-limiting circuit breaker, and conducted a blameless post-mortem establishing automated canary alerts." },
        { round: "Round 2: HR, Culture & Leadership", speaker: "Sarah Jenkins", text: "How do you mentor junior and mid-level engineers on code quality?" },
        { round: "Round 2: HR, Culture & Leadership", speaker: "Alex Rivera", text: "I focus on architectural RFCs and pairing sessions, encouraging ownership rather than gatekeeping PRs." }
      ];

      await fetch('/api/interviews/demo-interview-test/evaluate-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundName: "Round 2: HR, Culture & Engineering Leadership",
          transcript: r2Transcript,
          rubric: { "Ownership": "Blameless post-mortems", "Mentorship": "Team collaboration" }
        })
      });

      // 4. Final Evaluation & Report Generation
      setMessage('4/4: Generating Master Scorecard & updating Admin Dashboard...');
      const evalRes = await fetch('/api/interviews/demo-interview-test/evaluate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: [...r1Transcript, ...r2Transcript]
        })
      });

      const evalData = await evalRes.json();
      setSimResult(evalData.scorecard);
      setMessage('✅ Simulation Complete! Scorecard generated and stored in Admin Dashboard.');
    } catch (e: any) {
      setMessage(`Simulation failed: ${e.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030304] text-[#f4f4f5] p-6 sm:p-12 font-sans selection:bg-amber-500/30 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-xs text-amber-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>ISOLATED INTERVIEW TEST ENVIRONMENT // SUITE v1.0</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <Bot className="w-9 h-9 text-amber-400" />
              Interview Pipeline Test Studio
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Self-contained sandbox with pre-configured demo candidate (Alex Rivera). Test Round 1 (Technical Panel with Floor Arbiter) → Autonomous Handoff → Round 2 (HR Round) → Final Scorecard & Admin Report generation.
            </p>
          </div>

          <Link
            href="/admin"
            className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-mono text-zinc-300 hover:text-white transition flex items-center gap-2 self-start"
          >
            <span>Admin Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Status Message Banner */}
        {message && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-3 animate-in fade-in">
            <RefreshCw className={`w-4 h-4 shrink-0 ${isSeeding || isSimulating ? 'animate-spin' : ''}`} />
            <span>{message}</span>
          </div>
        )}

        {/* Candidate Profile & Blueprint Overview Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#07070a] shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-lg">
                AR
              </div>
              <div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Alex Rivera</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Pre-Seeded Demo
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">Senior Backend Engineer candidate · alex.rivera@example.com</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">Target Role:</span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-white/[0.04] text-zinc-200 border border-white/[0.08]">
                Senior Backend Engineer (Job #j1)
              </span>
            </div>
          </div>

          {/* 2-Round Pipeline Flow Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Round 1 Box */}
            <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-blue-400 uppercase font-bold tracking-wider">
                  ROUND 1 // TECHNICAL PANEL (5 MIN)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300">
                  2 Agents
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">Distributed Concurrency & Raft</h3>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <strong>Priya Nair</strong> (Lead, Aoede voice) — Coordinates flow & Kafka probing
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <strong>Arjun Malhotra</strong> (Challenger, Charon voice) — Probes Raft & locks
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 pt-1 border-t border-white/[0.06] font-mono">
                ✨ Smooth wrap-up notice at 4:50 mark → auto-conclusion at 5:00.
              </p>
            </div>

            {/* Round 2 Box */}
            <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-amber-400 uppercase font-bold tracking-wider">
                  ROUND 2 // HR & CULTURE (3 MIN)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
                  1 Agent
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">Leadership & Production Ownership</h3>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <strong>Sarah Jenkins</strong> (VP Culture, Puck voice) — Incident post-mortems & mentorship
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 pt-1 border-t border-white/[0.06] font-mono">
                ✨ Auto-transitions from Round 1 → evaluates final scorecard → updates Admin DB.
              </p>
            </div>

          </div>
        </div>

        {/* Primary Test Launcher Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Action 1: Live Interactive Test */}
          <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.1] bg-[#07070a] hover:border-white/20 transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Play className="w-5 h-5 fill-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Launch Live Interactive Interview</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Starts the real Agora voice room with live AI audio, floor arbitration, and proctoring. You can speak to the agents directly or use the in-room fast-forward buttons.
              </p>
            </div>

            <button
              onClick={handleLaunchLiveInterview}
              disabled={isSeeding || isSimulating}
              className="w-full py-3.5 px-6 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Initialize & Launch Live Test</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action 2: 1-Click Instant Simulator */}
          <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.1] bg-[#07070a] hover:border-white/20 transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">1-Click Instant Pipeline Simulation</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Instantly runs both rounds synthetically, evaluates the rubric, calculates the final integrity score, generates the full scorecard, and pushes results directly to the Admin Dashboard in 2 seconds.
              </p>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSeeding || isSimulating}
              className="w-full py-3.5 px-6 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-[0_0_25px_rgba(147,51,234,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSimulating ? 'Simulating Pipeline...' : 'Run Instant Simulation (2s)'}</span>
            </button>
          </div>

        </div>

        {/* Simulation Output Card (if generated) */}
        {simResult && (
          <div className="p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Final Evaluation Scorecard Created</h3>
                  <p className="text-xs text-emerald-300/80 font-mono">Persisted to Admin Dashboard for Alex Rivera</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-zinc-400 font-mono">Overall Score</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">{simResult.overallScore || 88}/100</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  {simResult.overall_recommendation || 'Hire'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <div className="font-bold text-white">Executive Assessment:</div>
              <p className="leading-relaxed text-zinc-300/90 font-sans">{simResult.overall_summary}</p>
            </div>

            <div className="flex items-center gap-4 flex-wrap pt-2">
              <Link
                href="/admin/applications/demo-app-test"
                className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition flex items-center gap-2"
              >
                <span>View Full Scorecard on Admin Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/interview/demo-blueprint-test/completed"
                className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-mono text-zinc-300 transition flex items-center gap-2"
              >
                <span>View Candidate Completed Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Direct Navigation & Telemetry Quick Links */}
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#07070a] space-y-3">
          <div className="font-mono text-xs text-zinc-500 uppercase tracking-wider">
            Quick Telemetry & Inspection Links
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <Link
              href="/admin/applications/demo-app-test"
              className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] flex items-center justify-between text-zinc-300 hover:text-white transition"
            >
              <span>1. Admin Application Scorecard</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </Link>
            <Link
              href="/interview/demo-blueprint-test/agent_persona"
              className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] flex items-center justify-between text-zinc-300 hover:text-white transition"
            >
              <span>2. AI Persona & Prompt Inspector</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </Link>
            <Link
              href="/admin/schedule"
              className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] flex items-center justify-between text-zinc-300 hover:text-white transition"
            >
              <span>3. ATS Schedule Overview</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
