"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { formatDateFullIST, formatTimeIST } from '@/lib/dateFormat';
import { 
  Calendar, 
  Clock, 
  Headphones, 
  Video, 
  ArrowRight,
  Shield,
  Volume2,
  CalendarPlus
} from 'lucide-react';

const InterviewRoom = dynamic(() => import('./InterviewRoom'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[460px] bg-[#030304] text-white animate-in fade-in duration-300">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
      <div className="text-sm font-sans font-medium text-white/90">Connecting to interview session...</div>
      <div className="text-xs font-mono text-zinc-500 mt-1">Initializing voice panel & workspace</div>
    </div>
  )
});

export default function InterviewLobbyWrapper({
  blueprint,
  interviewId,
  scheduledAt,
  candidateName,
  jobTitle,
  candidateContext,
  resumeText,
  mcpServerUrl
}: {
  blueprint: any;
  interviewId: string;
  scheduledAt: string;
  candidateName: string;
  jobTitle: string;
  candidateContext?: any;
  resumeText?: string;
  mcpServerUrl?: string;
}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isTimeArrived: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isTimeArrived: false
  });

  const formattedDate = formatDateFullIST(scheduledAt);
  const formattedTime = formatTimeIST(scheduledAt);

  useEffect(() => {
    setMounted(true);

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(scheduledAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isTimeArrived: true
        });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          isTimeArrived: false
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt]);

  // If candidate has entered the room, render the full multi-round voice agent room
  if (hasStarted) {
    return (
      <div className="h-full flex-1 bg-[#030304] flex flex-col overflow-hidden relative">
        <InterviewRoom
          blueprint={blueprint}
          interviewId={interviewId}
          candidateName={candidateName}
          jobTitle={jobTitle}
          candidateContext={candidateContext}
          resumeText={resumeText}
          mcpServerUrl={mcpServerUrl}
        />
      </div>
    );
  }

  // Google Calendar opener
  const handleOpenGoogleCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const dates = `${formatGCalDate(startTime)}/${formatGCalDate(endTime)}`;

    const title = encodeURIComponent(`Plantra Labs Technical Assessment: ${candidateName} (${jobTitle})`);
    const roomLink = typeof window !== 'undefined' ? window.location.href : '';
    const details = encodeURIComponent(
      `Candidate: ${candidateName}\nRole: ${jobTitle}${roomLink ? `\nRoom Link: ${roomLink}` : ''}\n\nTechnical interview powered by Plantra Meet.`
    );
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative min-h-[calc(100vh-65px)] flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      {/* Subtle Atmosphere Layer */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-purple-600/10 via-pink-600/5 to-transparent blur-[140px] opacity-70" />
      <div className="pointer-events-none absolute inset-0 dot-grid-fine opacity-10" />

      <div className="relative z-10 w-full max-w-xl mx-auto space-y-8 animate-in fade-in duration-300">
        
        {/* Header Title Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>Plantra Meet · Live Evaluation</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-sans font-semibold text-white tracking-tight">
            Welcome, {candidateName}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            You are confirmed for the <span className="text-zinc-200 font-medium">{jobTitle}</span> technical interview with the autonomous AI panel.
          </p>
        </div>

        {/* Central Entrance Card */}
        <div className="bg-[#09090d]/90 backdrop-blur-2xl rounded-2xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.6)] space-y-6">
          
          {/* Schedule Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-white/[0.06]">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                Scheduled Start Time
              </span>
              <div className="text-base sm:text-lg font-medium text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-zinc-300 self-start sm:self-center">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Countdown / Ready State */}
          <div className="text-center py-2 space-y-4">
            {!mounted ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs font-mono text-zinc-500">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                <span>Syncing session timer...</span>
              </div>
            ) : !timeLeft.isTimeArrived ? (
              <div className="space-y-3">
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Interview starts in
                </span>
                
                {/* Minimalist Monospace Countdown Pill */}
                <div className="inline-flex items-center justify-center gap-2 sm:gap-4 px-6 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-center">
                    <span className="text-xl sm:text-2xl font-mono font-semibold text-white">
                      {String(timeLeft.days).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] font-mono text-zinc-500 uppercase mt-0.5">Days</span>
                  </div>
                  <span className="text-zinc-600 font-mono text-sm">:</span>
                  <div className="text-center">
                    <span className="text-xl sm:text-2xl font-mono font-semibold text-white">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] font-mono text-zinc-500 uppercase mt-0.5">Hours</span>
                  </div>
                  <span className="text-zinc-600 font-mono text-sm">:</span>
                  <div className="text-center">
                    <span className="text-xl sm:text-2xl font-mono font-semibold text-white">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] font-mono text-zinc-500 uppercase mt-0.5">Mins</span>
                  </div>
                  <span className="text-zinc-600 font-mono text-sm">:</span>
                  <div className="text-center">
                    <span className="text-xl sm:text-2xl font-mono font-semibold text-purple-400">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] font-mono text-purple-400/70 uppercase mt-0.5">Secs</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 space-y-1.5">
                <div className="inline-flex items-center gap-2 text-emerald-400 font-medium text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Interview is ready to begin</span>
                </div>
                <p className="text-xs text-zinc-400">
                  The AI evaluation panel has entered the room.
                </p>
              </div>
            )}
          </div>

          {/* Action Group */}
          <div className="space-y-3 pt-2">
            {mounted && timeLeft.isTimeArrived ? (
              <button
                type="button"
                onClick={() => setHasStarted(true)}
                className="w-full py-3.5 px-6 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer"
              >
                <span>Join Interview Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-6 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Unlocks at {formattedTime}</span>
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setHasStarted(true)}
                    className="text-xs font-mono text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ready early? Test audio & video check in room</span>
                    <span className="text-purple-400">→</span>
                  </button>
                </div>
              </div>
            )}

            {/* Secondary Action: Add to Calendar */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleOpenGoogleCalendar}
                className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Add to Google Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pre-flight Checklist (Clean, Restrained Strip) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-zinc-300 text-xs font-medium">
              <Headphones className="w-3.5 h-3.5 text-purple-400" />
              <span>Headphones</span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">Prevents echo feedback</p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-zinc-300 text-xs font-medium">
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span>Camera & Mic</span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">Permissions required</p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-zinc-300 text-xs font-medium">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quiet Space</span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">Clear voice capture</p>
          </div>
        </div>

        {/* Proctoring & Integrity Footnote */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500 text-center px-4">
          <Shield className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span>Automated proctoring active: Camera, tab focus, and speech metrics are recorded for integrity.</span>
        </div>

      </div>
    </div>
  );
}

