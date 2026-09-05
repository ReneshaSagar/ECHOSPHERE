"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { formatDateFullIST, formatTimeIST } from '@/lib/dateFormat';
import { 
  Calendar, 
  Clock, 
  Mic, 
  Headphones, 
  Volume2, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Zap,
  CalendarPlus
} from 'lucide-react';

const InterviewRoom = dynamic(() => import('./InterviewRoom'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[460px] bg-[#0a0a0d] rounded-3xl border border-white/[0.08] text-white animate-in fade-in">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
      <div className="text-base font-sans font-bold">entering interview room...</div>
      <div className="text-xs font-mono text-white/40 mt-1">connecting to agora voice panel</div>
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
      <InterviewRoom
        blueprint={blueprint}
        interviewId={interviewId}
        candidateName={candidateName}
        jobTitle={jobTitle}
        candidateContext={candidateContext}
        resumeText={resumeText}
        mcpServerUrl={mcpServerUrl}
      />
    );
  }

  // Google Calendar opener
  const handleOpenGoogleCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const dates = `${formatGCalDate(startTime)}/${formatGCalDate(endTime)}`;

    const title = encodeURIComponent(`Nexora Labs AI Interview: ${candidateName} (${jobTitle})`);
    const roomLink = typeof window !== 'undefined' ? window.location.href : '';
    const details = encodeURIComponent(
      `Candidate: ${candidateName}\nRole: ${jobTitle}${roomLink ? `\nRoom Link: ${roomLink}` : ''}\n\nPowered by OmniPanel for Nexora Labs.`
    );
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-300">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white/70">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>nexora labs · powered by omnipanel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight">
            welcome, {candidateName}
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-lg mx-auto font-sans">
            You are confirmed for the <strong className="text-white">{jobTitle}</strong> technical interview at <strong className="text-white">Nexora Labs</strong>.
          </p>
        </div>

        <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-8 sm:p-12 text-center space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
          <div className="space-y-2">
            <div className="text-xs font-mono text-white/40 uppercase tracking-wider flex items-center justify-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-white/50" />
              <span>scheduled start time</span>
            </div>
            <div className="text-2xl sm:text-3xl font-sans font-bold text-white">
              {formattedDate}
            </div>
            <div className="text-sm font-mono text-purple-400 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedTime} (45 mins)</span>
            </div>
          </div>
          <div className="py-6 flex items-center justify-center gap-3 text-white/40 text-xs font-mono">
            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            <span>synchronizing interview session countdown...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white/70">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>nexora labs · powered by omnipanel</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight">
          welcome, {candidateName}
        </h1>
        <p className="text-white/60 text-sm sm:text-base max-w-lg mx-auto font-sans">
          You are confirmed for the <strong className="text-white">{jobTitle}</strong> technical interview at <strong className="text-white">Nexora Labs</strong>.
        </p>
      </div>

      {/* Main Countdown & Time Card */}
      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-8 sm:p-12 text-center space-y-8 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        {/* Subtle radial ambient glows */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="text-xs font-mono text-white/40 uppercase tracking-wider flex items-center justify-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-white/50" />
            <span>scheduled start time</span>
          </div>
          <div className="text-2xl sm:text-3xl font-sans font-bold text-white">
            {formattedDate}
          </div>
          <div className="text-sm font-mono text-purple-300 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedTime} (45 mins)</span>
          </div>
        </div>

        {/* Live Countdown Display */}
        {!timeLeft.isTimeArrived ? (
          <div className="py-4 relative z-10">
            <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4">
              interview starts in
            </div>
            <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
              <div className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-white">{timeLeft.days}</div>
                <div className="text-[10px] font-mono text-white/40 uppercase mt-1">Days</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase mt-1">Hours</div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <div className="text-[10px] font-mono text-white/40 uppercase mt-1">Minutes</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-purple-300 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] font-mono text-purple-400 uppercase mt-1">Seconds</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 max-w-md mx-auto relative z-10 space-y-2">
            <div className="flex items-center justify-center gap-2 text-emerald-300 font-sans font-bold text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              Your interview is ready to begin!
            </div>
            <p className="text-xs text-emerald-300/80 font-sans">
              The AI technical panel has entered the room. Click below to join now.
            </p>
          </div>
        )}

        {/* Motivational Encouragement Banner */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-xs text-white/60 max-w-lg mx-auto flex items-start gap-3 text-left relative z-10 font-sans leading-relaxed">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">All the best!</span> Our autonomous AI interview panel is excited to discuss your hands-on codecraft, project architecture, and system design. Speak naturally, ask questions, and take your time.
          </div>
        </div>

        {/* Action Button: Join Now */}
        <div className="pt-2 space-y-4 relative z-10">
          {timeLeft.isTimeArrived ? (
            <button
              onClick={() => setHasStarted(true)}
              className="w-full sm:w-auto px-10 py-4 bg-white text-black hover:bg-neutral-200 font-sans font-bold rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all transform hover:scale-102 text-base flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>join interview now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-3">
              <button
                disabled
                className="w-full sm:w-auto px-10 py-4 bg-white/[0.05] border border-white/[0.08] text-white/30 font-sans font-bold rounded-full cursor-not-allowed text-sm flex items-center justify-center gap-2 mx-auto"
              >
                <Clock className="w-4 h-4" />
                <span>join button unlocks at {formattedTime}</span>
              </button>
              
              {/* Early Access / Practice Testing Option */}
              <div>
                <button
                  onClick={() => setHasStarted(true)}
                  className="text-xs font-mono text-purple-400 hover:text-purple-300 transition cursor-pointer"
                >
                  🚀 ready early? click here to enter room now →
                </button>
              </div>
            </div>
          )}

          {/* Add to Google Calendar Option */}
          <div>
            <button
              type="button"
              onClick={handleOpenGoogleCalendar}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/40 hover:text-white transition cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-white/60" />
              <span>add to google calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Equipment & Pre-flight Checklist */}
      <div className="bg-[#0a0a0d] rounded-3xl border border-white/[0.08] p-6 sm:p-8 space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <h3 className="text-xs font-mono font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>pre-flight audio & system checklist</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/[0.06] flex items-start gap-3">
            <Headphones className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-white">Use Headphones</div>
              <div className="text-white/50 text-xs leading-relaxed">Prevents echo and feedback for conversational voice AI.</div>
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/[0.06] flex items-start gap-3">
            <Mic className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-white">Allow Mic Permission</div>
              <div className="text-white/50 text-xs leading-relaxed">Your browser will prompt for microphone access when joining.</div>
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/[0.06] flex items-start gap-3">
            <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-white">Quiet Environment</div>
              <div className="text-white/50 text-xs leading-relaxed">Find a distraction-free space for optimal voice transcription.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

