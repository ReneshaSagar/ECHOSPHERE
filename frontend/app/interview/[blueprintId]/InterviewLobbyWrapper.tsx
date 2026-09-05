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
    <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[460px] bg-gray-900 rounded-2xl border border-gray-800 text-white animate-in fade-in">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="text-base font-bold">Entering Interview Room...</div>
      <div className="text-xs text-gray-400 mt-1">Connecting to Agora Voice Panel</div>
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

    const title = encodeURIComponent(`mr.technologies AI Interview: ${candidateName} (${jobTitle})`);
    const roomLink = typeof window !== 'undefined' ? window.location.href : '';
    const details = encodeURIComponent(
      `Candidate: ${candidateName}\nRole: ${jobTitle}${roomLink ? `\nRoom Link: ${roomLink}` : ''}\n\nPowered by mr.technologies Autonomous Voice AI.`
    );
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 animate-in fade-in duration-300">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>mr.technologies Autonomous Voice Panel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Welcome, {candidateName}
          </h1>
          <p className="text-gray-600 text-base max-w-lg mx-auto">
            You are confirmed for the <strong>{jobTitle}</strong> technical interview.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center space-y-6">
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Scheduled Start Time</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900">
              {formattedDate}
            </div>
            <div className="text-base font-semibold text-blue-600 flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formattedTime} (45 mins)</span>
            </div>
          </div>
          <div className="py-6 flex items-center justify-center gap-2 text-gray-500 text-sm font-semibold">
            <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            <span>Synchronizing interview session countdown...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>mr.technologies Autonomous Voice Panel</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Welcome, {candidateName}
        </h1>
        <p className="text-gray-600 text-base max-w-lg mx-auto">
          You are confirmed for the <strong>{jobTitle}</strong> technical interview.
        </p>
      </div>

      {/* Main Countdown & Time Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center space-y-6 relative overflow-hidden">
        <div className="space-y-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Scheduled Start Time</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">
            {formattedDate}
          </div>
          <div className="text-base font-semibold text-blue-600 flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formattedTime} (45 mins)</span>
          </div>
        </div>

        {/* Live Countdown Display */}
        {!timeLeft.isTimeArrived ? (
          <div className="py-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Interview Starts In
            </div>
            <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <div className="text-2xl sm:text-3xl font-black text-gray-900">{timeLeft.days}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Days</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <div className="text-2xl sm:text-3xl font-black text-gray-900">
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Hours</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
                <div className="text-2xl sm:text-3xl font-black text-gray-900">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Minutes</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl bg-blue-50/50 border-blue-200">
                <div className="text-2xl sm:text-3xl font-black text-blue-600 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] font-bold text-blue-600 uppercase">Seconds</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-base">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              Your interview is ready to begin!
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              The AI technical panel has entered the room. Click below to join now.
            </p>
          </div>
        )}

        {/* Motivational Encouragement Banner */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 max-w-lg mx-auto flex items-start gap-3 text-left">
          <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">All the best!</span> Our autonomous AI interview panel is excited to discuss your hands-on codecraft, project architecture, and system design. Speak naturally, ask questions, and take your time.
          </div>
        </div>

        {/* Action Button: Join Now (Unlocked when time arrives, with Early Access option) */}
        <div className="pt-2 space-y-3">
          {timeLeft.isTimeArrived ? (
            <button
              onClick={() => setHasStarted(true)}
              className="w-full sm:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-lg flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Mic className="w-5 h-5 animate-pulse" />
              <span>Join Interview Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="space-y-2">
              <button
                disabled
                className="w-full sm:w-auto px-10 py-4 bg-gray-200 text-gray-400 font-extrabold rounded-xl cursor-not-allowed text-base flex items-center justify-center gap-2 mx-auto"
              >
                <Clock className="w-4 h-4" />
                <span>Join Button Unlocks at {formattedTime}</span>
              </button>
              
              {/* Early Access / Practice Testing Option */}
              <div>
                <button
                  onClick={() => setHasStarted(true)}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  🚀 Ready early? Click here to join room now
                </button>
              </div>
            </div>
          )}

          {/* Add to Google Calendar Option */}
          <div>
            <button
              type="button"
              onClick={handleOpenGoogleCalendar}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium transition cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add to Google Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Equipment & Pre-flight Checklist */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Pre-Flight Audio & System Checklist</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2.5">
            <Headphones className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900">Use Headphones</div>
              <div className="text-gray-500 mt-0.5">Prevents echo and feedback for conversational voice AI.</div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2.5">
            <Mic className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900">Allow Mic Permission</div>
              <div className="text-gray-500 mt-0.5">Your browser will prompt for microphone access when joining.</div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2.5">
            <Volume2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-gray-900">Quiet Environment</div>
              <div className="text-gray-500 mt-0.5">Find a distraction-free space for optimal voice transcription.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
