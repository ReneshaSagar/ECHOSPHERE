"use client";

import React, { useState } from 'react';
import Link from 'next/link';
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

    const title = encodeURIComponent(`EchoSphere AI Interview: ${item.candidate.name} (${item.job.title})`);
    const details = encodeURIComponent(
      `Candidate: ${item.candidate.name} (${item.candidate.email})\n` +
      `Role: ${item.job.title}\n` +
      `Interview Room: http://localhost:3000/interview/${item.blueprint?.id || ''}\n` +
      `ATS Profile: http://localhost:3000/admin/applications/${item.applicationId}\n\n` +
      `Powered by EchoSphere Autonomous Voice AI Agent.`
    );
    const location = encodeURIComponent(`EchoSphere Virtual Voice Room (http://localhost:3000/interview/${item.blueprint?.id || ''})`);

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
      'PRODID:-//EchoSphere//AI Interview Scheduler//EN',
      'BEGIN:VEVENT',
      `UID:echosphere-interview-${item.id}@echosphere.ai`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startTime)}`,
      `DTEND:${formatIcsDate(endTime)}`,
      `SUMMARY:EchoSphere AI Interview: ${item.candidate.name} - ${item.job.title}`,
      `DESCRIPTION:Candidate: ${item.candidate.name}\\nRole: ${item.job.title}\\nRoom: http://localhost:3000/interview/${item.blueprint?.id || ''}`,
      `LOCATION:EchoSphere Virtual Room`,
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            Interview Schedule
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track and synchronize lined-up candidate interviews with Google Calendar.
          </p>
        </div>

        {/* Global Google Calendar Quick Link */}
        <div className="flex items-center gap-3">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-xs flex items-center gap-2 transition"
          >
            <CalendarPlus className="w-4 h-4 text-blue-600" />
            Open Google Calendar
          </a>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              filter === 'ALL' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({interviews.length})
          </button>
          <button
            onClick={() => setFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              filter === 'UPCOMING' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upcoming ({interviews.filter(i => i.status !== 'COMPLETED').length})
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              filter === 'COMPLETED' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed ({interviews.filter(i => i.status === 'COMPLETED').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Interview List Cards */}
      <div className="space-y-4">
        {filteredInterviews.map((item) => {
          const dateObj = new Date(item.scheduledAt);
          const isUpcoming = dateObj > now && item.status !== 'COMPLETED';
          const isToday = dateObj.toDateString() === now.toDateString();

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            >
              {/* Date & Time Badge */}
              <div className="flex items-center gap-4 shrink-0">
                <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center border ${
                  isToday 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {dateObj.toLocaleDateString(undefined, { month: 'short' })}
                  </span>
                  <span className="text-xl font-black leading-none">
                    {dateObj.getDate()}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500">
                    {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-800">
                      {dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">(45 mins)</span>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : isUpcoming
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.status === 'COMPLETED' ? '✓ Completed' : '⚡ Lined Up'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Candidate & Role Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900 truncate">
                    {item.candidate.name}
                  </h3>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-sm font-semibold text-blue-600 truncate">
                    {item.job.title}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                  <span>{item.candidate.email}</span>
                  {item.blueprint && (
                    <span className="text-purple-600 font-semibold flex items-center gap-1">
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
                  className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg border border-blue-200 flex items-center gap-1.5 transition shadow-xs"
                  title="Add to Google Calendar with Room Link"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Google Calendar</span>
                </a>

                {/* Download .ics */}
                <button
                  onClick={() => downloadIcs(item)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 text-xs transition"
                  title="Download .ics Calendar File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Inspect Blueprint */}
                <Link
                  href={`/admin/interviews/${item.id}/blueprint`}
                  className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-xs rounded-lg border border-purple-200 flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Blueprint</span>
                </Link>

                {/* Live Interview Room */}
                {item.blueprint?.id ? (
                  <Link
                    href={`/interview/${item.blueprint.id}`}
                    target="_blank"
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>Enter Room</span>
                  </Link>
                ) : (
                  <Link
                    href={`/admin/interviews/${item.id}/blueprint`}
                    className="px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 font-bold text-xs rounded-lg transition"
                  >
                    <span>Generate Blueprint</span>
                  </Link>
                )}

                {/* ATS Review Link */}
                <Link
                  href={`/admin/applications/${item.applicationId}`}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition"
                  title="View ATS Application"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}

        {filteredInterviews.length === 0 && (
          <div className="bg-white p-12 rounded-xl border border-gray-200 text-center shadow-xs">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-700">No scheduled interviews found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Interviews scheduled from candidate ATS applications will appear lined up here with 1-click Google Calendar sync.
            </p>
            <Link
              href="/admin/applicants"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
            >
              Browse Applicants to Schedule
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
