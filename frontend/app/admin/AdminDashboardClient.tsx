"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDateTimeShortIST } from '@/lib/dateFormat';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  Mic,
  CalendarPlus,
  Sparkles,
  Copy,
  Check,
  Search,
  Filter,
  Layers,
  Radio,
  ShieldCheck,
  Award,
  ChevronRight,
  TrendingUp,
  FileText,
  Clock,
  Compass,
  ArrowUpRight,
  Zap,
  Github,
  Linkedin
} from 'lucide-react';

export interface DashboardStats {
  totalJobs: number;
  totalApplicants: number;
  inReviewCount: number;
  scheduledCount: number;
  completedCount: number;
  selectedCount: number;
  waitlistCount: number;
  rejectedCount: number;
}

export interface InterviewCardItem {
  id: string;
  applicationId: string;
  scheduledAt: string;
  status: string;
  candidate: {
    name: string;
    email: string;
  };
  job: {
    id: string;
    title: string;
  };
  blueprintId?: string;
  hasScorecard: boolean;
  overallScore?: number;
}

export interface RecentApplicantItem {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  status: string;
  createdAt: string;
  evaluationScore?: number;
  githubUrl?: string;
  linkedinUrl?: string;
  resumeDriveUrl?: string;
  interviewId?: string;
  blueprintId?: string;
}

export interface JobOverviewItem {
  id: string;
  title: string;
  description: string;
  applicantCount: number;
  activeInterviewsCount: number;
}

export interface PipelineStageItem {
  name: string;
  roundKey: string;
  count: number;
  percentage: number;
  color: string;
}

export default function AdminDashboardClient({
  stats,
  interviews,
  recentApplicants,
  jobs,
  pipelineStages
}: {
  stats: DashboardStats;
  interviews: InterviewCardItem[];
  recentApplicants: RecentApplicantItem[];
  jobs: JobOverviewItem[];
  pipelineStages: PipelineStageItem[];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [interviewFilter, setInterviewFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyLink = (blueprintId: string, id: string) => {
    const url = `${window.location.origin}/interview/${blueprintId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredInterviews = interviews.filter(item => {
    const matchesFilter = 
      interviewFilter === 'ALL' ? true :
      interviewFilter === 'UPCOMING' ? (item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS') :
      (item.status === 'COMPLETED');

    const matchesSearch = 
      item.candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.candidate.email.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans pb-16">
      
      {/* ── Top Executive Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-white/[0.06]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              Plantra Labs ATS Control
            </span>
            <span className="text-white/30 text-xs font-mono">•</span>
            <span className="text-xs font-mono text-white/50">Multi-Agent Voice Panel Engine</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Recruiting Operations & Evaluation Center
          </h1>
          <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
            Real-time pipeline analytics, autonomous 3-round Agora voice rooms, and talent allocation.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/admin/jobs/new"
            className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white font-medium text-xs rounded-xl border border-white/[0.08] transition flex items-center gap-2"
          >
            <Briefcase className="w-3.5 h-3.5 text-white/60" />
            <span>+ Post Role</span>
          </Link>

          <Link
            href="/admin/schedule"
            className="px-4 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 font-medium text-xs rounded-xl border border-purple-500/30 transition flex items-center gap-2"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>Schedule Session</span>
          </Link>

          <Link
            href="/admin/applicants"
            className="px-4 py-2 bg-white text-black hover:bg-neutral-200 font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] transition flex items-center gap-2"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Candidates</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Metric Cards Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Openings */}
        <Link 
          href="/admin/jobs" 
          className="group relative bg-[#0a0a0e] hover:bg-[#0f0f15] p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 tracking-wider font-mono uppercase">Active Openings</span>
            <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4 text-white/70" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{stats.totalJobs}</span>
            <span className="text-xs text-white/40">positions</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-white/50">
            <span>Manage job requisitions</span>
            <ArrowRight className="w-3 h-3 text-white/40 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Total Applicants */}
        <Link 
          href="/admin/applicants" 
          className="group relative bg-[#0a0a0e] hover:bg-[#0f0f15] p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 tracking-wider font-mono uppercase">Candidate Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4 text-white/70" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{stats.totalApplicants}</span>
            <span className="text-xs text-amber-400 font-medium">({stats.inReviewCount} pending triage)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-white/50">
            <span>Review submitted profiles</span>
            <ArrowRight className="w-3 h-3 text-white/40 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: AI Voice Sessions */}
        <Link 
          href="/admin/schedule" 
          className="group relative bg-[#0a0a0e] hover:bg-[#0f0f15] p-5 rounded-2xl border border-white/[0.08] hover:border-purple-500/30 transition-all duration-300 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300 tracking-wider font-mono uppercase">AI Voice Panels</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mic className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{stats.scheduledCount + stats.completedCount}</span>
            <span className="text-xs text-purple-300 font-medium">({stats.scheduledCount} lined up)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-purple-400/80">
            <span>View room calendar</span>
            <ArrowRight className="w-3 h-3 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 4: Offers & Talent Pool */}
        <Link 
          href="/admin/applicants" 
          className="group relative bg-[#0a0a0e] hover:bg-[#0f0f15] p-5 rounded-2xl border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-300 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 tracking-wider font-mono uppercase">Selected & Pool</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{stats.selectedCount + stats.waitlistCount}</span>
            <span className="text-xs text-emerald-400 font-medium">({stats.selectedCount} offers)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-emerald-400/80">
            <span>{stats.waitlistCount} in priority talent pool</span>
            <ArrowRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* ── 3-Round Pipeline Funnel Velocity ──────────────────────────────────── */}
      <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
              3-Round Technical Evaluation Pipeline
            </h2>
          </div>
          <span className="text-xs font-mono text-white/40">
            Autonomous Panel Distribution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {pipelineStages.map((stage, idx) => (
            <div 
              key={idx} 
              className="bg-[#0e0e13] p-4 rounded-xl border border-white/[0.05] hover:border-white/[0.12] transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-white/40 uppercase mb-2">
                  <span>Step 0{idx + 1}</span>
                  <span className={`w-2 h-2 rounded-full ${stage.color}`}></span>
                </div>
                <div className="text-xs font-bold text-white leading-snug line-clamp-2">
                  {stage.name}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white font-mono">{stage.count}</span>
                <span className="text-[11px] font-mono text-white/40">{stage.percentage}% active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Section: Live Interview Command Center & Recent Applicants ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Live & Upcoming Voice Interviews */}
        <div className="lg:col-span-2 bg-[#0a0a0e] rounded-2xl border border-white/[0.08] p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Scheduled Voice Interview Sessions
                </h2>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Autonomous 3-round panel rooms with live proctoring.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
              {(['ALL', 'UPCOMING', 'COMPLETED'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setInterviewFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                    interviewFilter === tab 
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30 font-semibold' 
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'UPCOMING' ? 'Upcoming' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar inside interview card */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#040406] border border-white/[0.08] focus:border-purple-500/50 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/30 focus:outline-none transition"
            />
          </div>

          {/* Interview Cards List */}
          <div className="space-y-3">
            {filteredInterviews.map((interview) => {
              const isCompleted = interview.status === 'COMPLETED';
              const isCopied = copiedId === interview.id;

              return (
                <div
                  key={interview.id}
                  className="bg-[#0e0e13] hover:bg-[#121219] p-4 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                        {interview.candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {interview.candidate.name}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          }`}>
                            {isCompleted ? 'COMPLETED' : 'SCHEDULED'}
                          </span>
                        </div>
                        <div className="text-xs text-white/50 truncate mt-0.5">
                          {interview.job.title}
                        </div>
                      </div>
                    </div>

                    {/* Schedule Time Badge */}
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-xs font-mono text-purple-300 font-medium" suppressHydrationWarning>
                        {formatDateTimeShortIST(interview.scheduledAt)}
                      </div>
                      <div className="text-[10.5px] text-white/40 mt-0.5">
                        45-minute 3-round session
                      </div>
                    </div>
                  </div>

                  {/* 3-Round Structure Bar */}
                  <div className="bg-[#060608] p-2.5 rounded-lg border border-white/[0.04] grid grid-cols-3 gap-2 text-[10.5px] font-mono text-white/60">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span className="truncate">R1: Workspace</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      <span className="truncate">R2: Arch Panel</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                      <span className="truncate">R3: Leadership</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/applications/${interview.applicationId}`}
                        className="text-xs font-mono text-white/50 hover:text-white flex items-center gap-1 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Candidate Dossier</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      {interview.blueprintId && (
                        <button
                          onClick={() => handleCopyLink(interview.blueprintId!, interview.id)}
                          className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white rounded-lg text-xs font-mono border border-white/[0.06] transition flex items-center gap-1.5"
                          title="Copy candidate room link"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      )}

                      {interview.blueprintId ? (
                        <Link
                          href={`/interview/${interview.blueprintId}`}
                          target="_blank"
                          className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/35 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5"
                        >
                          <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span>Join Room</span>
                          <ArrowUpRight className="w-3 h-3 text-purple-300" />
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/interviews/${interview.id}/blueprint`}
                          className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 rounded-lg text-xs font-mono transition"
                        >
                          <span>Generate Blueprint</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredInterviews.length === 0 && (
              <div className="p-8 text-center bg-[#060608] rounded-xl border border-white/[0.04] text-white/40 text-xs font-mono">
                No interview sessions found matching your criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Active Requisitions & System Status */}
        <div className="space-y-6">
          
          {/* Active Job Requisitions Widget */}
          <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.08] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-white/70" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Active Requisitions
                </h3>
              </div>
              <Link 
                href="/admin/jobs/new"
                className="text-xs font-mono text-purple-400 hover:text-purple-300"
              >
                + New Role
              </Link>
            </div>

            <div className="space-y-2.5">
              {jobs.slice(0, 4).map(job => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${job.id}`}
                  className="block p-3 rounded-xl bg-[#0e0e13] hover:bg-[#121219] border border-white/[0.05] hover:border-white/[0.12] transition group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-xs text-white group-hover:text-purple-300 transition line-clamp-1">
                      {job.title}
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white/[0.06] text-white/80 rounded-full border border-white/[0.08] shrink-0">
                      {job.applicantCount} apps
                    </span>
                  </div>
                  <div className="text-[11px] text-white/40 mt-1 line-clamp-1">
                    {job.description}
                  </div>
                </Link>
              ))}

              {jobs.length === 0 && (
                <div className="p-6 text-center text-white/40 text-xs font-mono">
                  No active jobs posted.
                </div>
              )}
            </div>

            <Link
              href="/admin/jobs"
              className="block text-center py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/[0.04] text-xs font-mono text-white/60 hover:text-white transition"
            >
              View all {jobs.length} postings →
            </Link>
          </div>

          {/* System Telemetry & Operational Health */}
          <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.08] p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Platform Telemetry
                </h3>
              </div>
              <span className="text-[10.5px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                HEALTHY
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#060608] border border-white/[0.04] flex items-center justify-between">
                <span className="text-white/60">Voice RTC:</span>
                <span className="text-emerald-400 font-semibold">Agora WebRTC 2.0</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#060608] border border-white/[0.04] flex items-center justify-between">
                <span className="text-white/60">AI Panel Arbiter:</span>
                <span className="text-purple-300 font-semibold">Emily · Marcus · Sarah</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#060608] border border-white/[0.04] flex items-center justify-between">
                <span className="text-white/60">Anti-Cheat Monitor:</span>
                <span className="text-sky-300 font-semibold">Multi-Modal Vision Active</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#060608] border border-white/[0.04] flex items-center justify-between">
                <span className="text-white/60">Email Gateway:</span>
                <span className="text-emerald-400 font-semibold">Gmail SMTP + Resend</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Recent Applicants Triage Feed ────────────────────────────────────── */}
      <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.08] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/70" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Recent Applicant Submissions & Triage
              </h2>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Review extracted qualifications, GitHub signals, and progress candidates to AI interviews.
            </p>
          </div>

          <Link
            href="/admin/applicants"
            className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            Full ATS Table ({stats.totalApplicants}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[11px] font-mono text-white/40 uppercase tracking-wider border-b border-white/[0.06] bg-white/[0.01]">
              <tr>
                <th className="py-3 px-4 font-semibold">Candidate</th>
                <th className="py-3 px-4 font-semibold">Target Position</th>
                <th className="py-3 px-4 font-semibold">Signals</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {recentApplicants.slice(0, 6).map((app) => {
                const initials = app.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                
                return (
                  <tr key={app.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10.5px] font-bold text-white">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{app.name}</div>
                          <div className="text-[11px] text-white/40">{app.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white/90 truncate max-w-xs">{app.jobTitle}</div>
                      <div className="text-[10.5px] text-white/40 mt-0.5 font-mono" suppressHydrationWarning>
                        Applied {formatDateTimeShortIST(app.createdAt)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 text-white/60">
                        {app.githubUrl && (
                          <a href={app.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white" title="GitHub">
                            <Github className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {app.linkedinUrl && (
                          <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white" title="LinkedIn">
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {app.resumeDriveUrl && (
                          <a href={app.resumeDriveUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                            PDF
                          </a>
                        )}
                        {!app.githubUrl && !app.linkedinUrl && !app.resumeDriveUrl && (
                          <span className="text-[10px] text-white/30 font-mono">Profile Verified</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 text-[10.5px] font-mono font-bold rounded-full ${
                        app.status === 'SELECTED'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : app.status === 'CONSIDER_FOR_OTHER_ROLES'
                          ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                          : app.status === 'INTERVIEW_SCHEDULED'
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      }`}>
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white font-mono text-xs rounded-xl border border-white/[0.08] transition inline-flex items-center gap-1.5"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3 h-3 text-white/40" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {recentApplicants.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/40 font-mono text-xs">
                    No applicants submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
