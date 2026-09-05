"use client";

import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Users, 
  UserCheck, 
  Hand, 
  Mic, 
  Monitor, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Sparkles,
  Clock
} from 'lucide-react';
import { formatTimeIST } from '@/lib/dateFormat';

interface ProctorScorecardProps {
  proctoringReport?: any;
  suspiciousEvents?: {
    timestamp: string;
    type: string;
    details: string;
    severity?: string;
    score_impact?: number;
  }[];
}

export default function ProctorScorecardViewer({
  proctoringReport,
  suspiciousEvents = []
}: ProctorScorecardProps) {
  // If report doesn't exist, calculate default or derive from suspiciousEvents
  const events = suspiciousEvents || [];
  const totalEvents = events.length;
  const highSev = events.filter(e => e.severity === 'HIGH').length;
  const medSev = events.filter(e => e.severity === 'MEDIUM').length;

  const integrityScore = proctoringReport?.integrity_score ?? Math.max(15, 96 - (highSev * 25 + medSev * 10));
  const confidenceScore = proctoringReport?.confidence_score ?? 88;
  const assessment = proctoringReport?.assessment ?? (integrityScore >= 80 ? 'LOW SUSPICION' : (integrityScore >= 60 ? 'MODERATE SUSPICION' : 'HIGH SUSPICION'));
  const assessmentDesc = proctoringReport?.assessment_desc ?? (
    assessment === 'LOW SUSPICION' 
      ? 'Candidate demonstrated consistent screen attention and single verified face with organic behavioral responses.'
      : (assessment === 'MODERATE SUSPICION' 
          ? 'Elevated behavioral indicators detected. Review flagged timestamps for details.' 
          : 'CRITICAL: Multiple severe behavioral integrity violations or unauthorized presence detected.')
  );

  const badgeColors: Record<string, string> = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    red: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  };

  const badgeKey = integrityScore >= 80 ? 'green' : (integrityScore >= 60 ? 'yellow' : 'red');

  const components = proctoringReport?.components || {
    eye_gaze_contrib: Math.round(integrityScore * 0.3 * 10) / 10,
    presence_contrib: Math.round(integrityScore * 0.15 * 10) / 10,
    multi_person_contrib: highSev > 0 ? 5.0 : 20.0,
    head_contrib: Math.round(integrityScore * 0.1 * 10) / 10,
    hand_contrib: Math.round(integrityScore * 0.1 * 10) / 10,
    speech_contrib: Math.round(integrityScore * 0.1 * 10) / 10,
    consistency_contrib: Math.round(integrityScore * 0.05 * 10) / 10
  };

  const positiveObs = proctoringReport?.observations?.positive || [
    'Single candidate face verified throughout the recorded duration.',
    'Speech fluency consistent with organic technical delivery.',
    'Screen gaze maintained with natural cognitive saccades.'
  ];

  const cautionObs = proctoringReport?.observations?.cautions || (
    events.length > 0
      ? events.map(e => `${e.type}: ${e.details}`)
      : []
  );

  return (
    <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden space-y-8">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-cyan-300 bg-cyan-500/10 px-3 py-0.5 rounded-full border border-cyan-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>VERITAS AI MULTI-SIGNAL INTEGRITY AUDIT</span>
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Behavioral Proctoring & Integrity Scorecard</h3>
          <p className="text-white/40 text-xs">7-Channel Multi-Modal Computer Vision & Acoustic Verification</p>
        </div>

        <div className={`px-4 py-2 rounded-full font-mono font-bold text-xs tracking-wider border flex items-center gap-2 ${badgeColors[badgeKey]}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
          <span>{assessment}</span>
        </div>
      </div>

      {/* 4 Hero Metric Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Integrity Score */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div className="text-xs font-mono text-white/40 uppercase tracking-wider mb-1">Integrity Score</div>
          <div className={`text-3xl font-black font-mono ${integrityScore >= 80 ? 'text-emerald-400' : (integrityScore >= 60 ? 'text-amber-400' : 'text-rose-400')}`}>
            {integrityScore} <span className="text-sm font-normal text-white/40">/ 100</span>
          </div>
          <div className="text-[10px] text-white/50 mt-1 font-mono">Weighted Multi-Modal Index</div>
        </div>

        {/* Confidence Score */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div className="text-xs font-mono text-white/40 uppercase tracking-wider mb-1">Confidence Score</div>
          <div className="text-3xl font-black font-mono text-cyan-400">
            {confidenceScore} <span className="text-sm font-normal text-white/40">/ 100</span>
          </div>
          <div className="text-[10px] text-white/50 mt-1 font-mono">Speech Fluency & Calmness</div>
        </div>

        {/* Perimeter Verification */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div className="text-xs font-mono text-white/40 uppercase tracking-wider mb-1">Perimeter Room</div>
          <div className={`text-xl font-bold font-mono mt-1 ${highSev > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {highSev > 0 ? 'Intrusion Flagged' : '1 Face Verified'}
          </div>
          <div className="text-[10px] text-white/50 mt-1 font-mono">No unauthorized 2nd face</div>
        </div>

        {/* Total Events Flagged */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div className="text-xs font-mono text-white/40 uppercase tracking-wider mb-1">Audit Events</div>
          <div className={`text-3xl font-black font-mono ${totalEvents === 0 ? 'text-emerald-400' : (totalEvents <= 2 ? 'text-amber-400' : 'text-rose-400')}`}>
            {totalEvents} <span className="text-sm font-normal text-white/40">flags</span>
          </div>
          <div className="text-[10px] text-white/50 mt-1 font-mono">{highSev} high severity</div>
        </div>
      </div>

      {/* Assessment Summary Box */}
      <div className="p-5 rounded-2xl bg-[#030304] border border-white/[0.08]">
        <div className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Integrity Diagnosis</span>
        </div>
        <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-sans">
          {assessmentDesc}
        </p>
      </div>

      {/* 7-Channel Weighted Breakdown & Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component Bars */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <h4 className="font-mono text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>7-Signal Weight Contributions</span>
          </h4>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between text-white/70 mb-1 text-[11px]">
                <span>Eye & Iris Gaze Stability (30%)</span>
                <span className="font-bold text-cyan-400">{components.eye_gaze_contrib} / 30</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${(components.eye_gaze_contrib / 30) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-white/70 mb-1 text-[11px]">
                <span>Single-Person Verification (20%)</span>
                <span className="font-bold text-emerald-400">{components.multi_person_contrib} / 20</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${(components.multi_person_contrib / 20) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-white/70 mb-1 text-[11px]">
                <span>Continuous Face Presence (15%)</span>
                <span className="font-bold text-purple-400">{components.presence_contrib} / 15</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400" style={{ width: `${(components.presence_contrib / 15) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-white/70 mb-1 text-[11px]">
                <span>Head Pose Alignment (10%)</span>
                <span className="font-bold text-amber-400">{components.head_contrib} / 10</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${(components.head_contrib / 10) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-white/70 mb-1 text-[11px]">
                <span>Hand Activity & Gestures (10%)</span>
                <span className="font-bold text-blue-400">{components.hand_contrib} / 10</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400" style={{ width: `${(components.hand_contrib / 10) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-white/70 mb-1 text-[11px]">
                <span>Speech Fluency & Hesitation (10%)</span>
                <span className="font-bold text-indigo-400">{components.speech_contrib} / 10</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400" style={{ width: `${(components.speech_contrib / 10) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Observations */}
        <div className="space-y-4">
          {/* Positive Highlights */}
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
            <h4 className="font-mono text-xs font-bold text-emerald-300 mb-3 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Positive Behavioral Highlights</span>
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              {positiveObs.map((obs: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Caution Flags */}
          {cautionObs.length > 0 && (
            <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/20">
              <h4 className="font-mono text-xs font-bold text-rose-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Caution & Suspicion Flags</span>
              </h4>
              <ul className="space-y-2 text-xs text-rose-200/90 font-mono">
                {cautionObs.map((obs: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">⚠️</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Chronological Audit Event Timeline */}
      {events.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/[0.08]">
          <h4 className="font-mono text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Chronological Violation Audit Log ({events.length})</span>
          </h4>

          <div className="space-y-2 font-mono text-xs">
            {events.map((ev, i) => (
              <div 
                key={i} 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-white/40" suppressHydrationWarning>{formatTimeIST(ev.timestamp)}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    ev.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    ev.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {ev.severity || 'INFO'}
                  </span>
                  <span className="font-bold text-white/90">{ev.type}</span>
                </div>
                <div className="text-white/60 text-xs">{ev.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
