"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDatePartsIST } from '@/lib/dateFormat';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Briefcase, 
  ExternalLink, 
  Mic, 
  FileText, 
  CheckCircle2, 
  CalendarPlus, 
  Download,
  Filter,
  Search
} from 'lucide-react';

export interface InterviewScheduleItem {
  id: string;
  applicationId: string;
  scheduledAt: string;
  status: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    linkedinUrl?: string;
    githubUrl?: string;
  };
  job: {
    id: string;
    title: string;
    department?: string;
  };
  blueprint?: {
    id: string;
    roundsCount: number;
  };
}

export default function ScheduleClient({ 
  interviews 
}: { 
  interviews: InterviewScheduleItem[] 
}) {
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to format Google Calendar URL
  const getGoogleCalendarUrl = (item: InterviewScheduleItem) => {
    const startTime = new Date(item.scheduledAt);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000); // 45 min default duration

    const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const dates = `${formatGCalDate(startTime)}/${formatGCalDate(endTime)}`;

    const title = encodeURIComponent(`Nexora Labs AI Interview: ${item.candidate.name} (${item.job.title})`);
    const details = encodeURIComponent(
      `Candidate: ${item.candidate.name} (${item.candidate.email})\n` +
      `Role: ${item.job.title}\n` +
      `Interview Room: http://localhost:3000/interview/${item.blueprint?.id || ''}\n` +
      `ATS Profile: http://localhost:3000/admin/applications/${item.applicationId}\n\n` +
      `Powered by OmniPanel for Nexora Labs.`
    );
    const location = encodeURIComponent(`Nexora Labs Virtual Voice Room (http://localhost:3000/interview/${item.blueprint?.id || ''})`);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  // Helper to generate and download .ics file
  const downloadIcs = (item: InterviewScheduleItem) => {
    const startTime = new Date(item.scheduledAt);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    const formatIcsDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Nexora Labs//AI Interview Scheduler//EN',
      'BEGIN:VEVENT',
      `UID:nexoralabs-interview-${item.id}@nexoralabs.com`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startTime)}`,
      `DTEND:${formatIcsDate(endTime)}`,
      `SUMMARY:Nexora Labs AI Interview: ${item.candidate.name} - ${item.job.title}`,
      `DESCRIPTION:Candidate: ${item.candidate.name}\\nRole: ${item.job.title}\\nRoom: http://localhost:3000/interview/${item.blueprint?.id || ''}`,
      `LOCATION:Nexora Labs Virtual Room`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `interview-${item.candidate.name.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const now = new Date();
  const filteredInterviews = interviews.filter(item => {
    const itemDate = new Date(item.scheduledAt);
    if (filter === 'UPCOMING' && itemDate < now && item.status === 'COMPLETED') return false;
    if (filter === 'COMPLETED' && item.status !== 'COMPLETED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.candidate.name.toLowerCase().includes(q);
      const matchRole = item.job.title.toLowerCase().includes(q);
      const matchEmail = item.candidate.email.toLowerCase().includes(q);
      return matchName || matchRole || matchEmail;
    }
    return true;
  }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-sans font-bold text-white tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-purple-400" />
            <span>interview schedule</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Track and synchronize lined-up candidate interviews with Google Calendar.
          </p>
        </div>

        {/* Global Google Calendar Quick Link */}
        <div className="flex items-center gap-3">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full text-xs font-mono text-white transition flex items-center gap-2"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>open google calendar</span>
          </a>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-[#0a0a0d] p-4 rounded-2xl border border-white/[0.08] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#030304] p-1 rounded-xl border border-white/[0.08] w-full sm:w-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              filter === 'ALL' ? 'bg-white/[0.1] text-white font-bold' : 'text-white/40 hover:text-white'
            }`}
          >
            all ({interviews.length})
          </button>
          <button
            onClick={() => setFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              filter === 'UPCOMING' ? 'bg-white/[0.1] text-white font-bold' : 'text-white/40 hover:text-white'
            }`}
          >
            upcoming ({interviews.filter(i => i.status !== 'COMPLETED').length})
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              filter === 'COMPLETED' ? 'bg-white/[0.1] text-white font-bold' : 'text-white/40 hover:text-white'
            }`}
          >
            completed ({interviews.filter(i => i.status === 'COMPLETED').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Interview List Cards */}
      <div className="space-y-4">
        {filteredInterviews.map((item) => {
          const dateObj = new Date(item.scheduledAt);
          const parts = getDatePartsIST(item.scheduledAt);
          const isUpcoming = dateObj > now && item.status !== 'COMPLETED';
          const isToday = dateObj.toDateString() === now.toDateString();

          return (
            <div
              key={item.id}
              className="bg-[#0a0a0d] rounded-2xl border border-white/[0.08] p-5 shadow-[0_0_30px_rgba(0,0,0,0.4)] hover:border-white/20 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            >
              {/* Date & Time Badge */}
              <div className="flex items-center gap-4 shrink-0">
                <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border ${
                  isToday 
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' 
                    : 'bg-white/[0.03] border-white/[0.08] text-white'
                }`}>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/50" suppressHydrationWarning>
                    {parts.month}
                  </span>
                  <span className="text-xl font-mono font-bold leading-none mt-0.5" suppressHydrationWarning>
                    {parts.day}
                  </span>
                  <span className="text-[10px] font-mono text-white/40 mt-0.5" suppressHydrationWarning>
                    {parts.weekday}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-sm font-mono font-bold text-white" suppressHydrationWarning>
                      {parts.time}
                    </span>
                    <span className="text-xs font-mono text-white/40">(45 mins)</span>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : isUpcoming
                        ? 'bg-white/[0.05] text-white/80 border border-white/[0.1]'
                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    }`}>
                      {item.status === 'COMPLETED' ? '✓ completed' : '⚡ lined up'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Candidate & Role Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-sans font-bold text-white truncate">
                    {item.candidate.name}
                  </h3>
                  <span className="text-xs text-white/30">•</span>
                  <span className="text-sm font-sans font-semibold text-white/70 truncate">
                    {item.job.title}
                  </span>
                </div>

                <div className="text-xs font-mono text-white/40 mt-1 flex items-center gap-3 flex-wrap">
                  <span>{item.candidate.email}</span>
                  {item.blueprint && (
                    <span className="text-purple-300 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {item.blueprint.roundsCount} Round Blueprint Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* 1-Click Google Calendar */}
                <a
                  href={getGoogleCalendarUrl(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] font-mono text-xs rounded-xl border border-white/[0.08] flex items-center gap-1.5 transition shadow-xs"
                  title="Add to Google Calendar with Room Link"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-purple-400" />
                  <span>google cal</span>
                </a>

                {/* Download .ics */}
                <button
                  onClick={() => downloadIcs(item)}
                  className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white rounded-xl border border-white/[0.08] text-xs transition"
                  title="Download .ics Calendar File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Inspect Blueprint */}
                <Link
                  href={`/admin/interviews/${item.id}/blueprint`}
                  className="px-3.5 py-2 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] font-mono text-xs rounded-xl border border-white/[0.08] flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>blueprint</span>
                </Link>

                {/* View Completed Report */}
                {item.status === 'COMPLETED' && (
                  <Link
                    href={`/admin/applications/${item.applicationId}`}
                    className="px-3.5 py-2 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-mono text-xs rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition shadow-xs"
                    title="View Final Interview Report & Scorecard"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>report</span>
                  </Link>
                )}

                {/* Live Interview Room */}
                {item.blueprint?.id ? (
                  <Link
                    href={`/interview/${item.blueprint.id}`}
                    target="_blank"
                    className="px-4 py-2 bg-white text-black hover:bg-neutral-200 font-sans font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center gap-1.5 transition"
                  >
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>enter room</span>
                  </Link>
                ) : (
                  <Link
                    href={`/admin/interviews/${item.id}/blueprint`}
                    className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-xs rounded-xl transition"
                  >
                    <span>generate blueprint</span>
                  </Link>
                )}

                {/* ATS Review Link */}
                <Link
                  href={`/admin/applications/${item.applicationId}`}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-xl transition"
                  title="View ATS Application"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}

        {filteredInterviews.length === 0 && (
          <div className="bg-[#0a0a0d] p-12 rounded-2xl border border-white/[0.08] text-center shadow-xs">
            <CalendarIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-sans font-bold text-white">no scheduled interviews found</h3>
            <p className="text-xs font-mono text-white/40 mt-1 max-w-sm mx-auto">
              Interviews scheduled from candidate ATS applications will appear lined up here with 1-click Google Calendar sync.
            </p>
            <Link
              href="/admin/applicants"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs font-sans font-bold rounded-full hover:bg-neutral-200 transition shadow-sm"
            >
              browse applicants to schedule
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

