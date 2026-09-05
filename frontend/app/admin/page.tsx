import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import { formatDateTimeShortIST } from '@/lib/dateFormat';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  ExternalLink,
  Mic,
  CalendarPlus,
  Sparkles
} from 'lucide-react';

export default function AdminDashboard() {
  const db = getDb();
  
  const totalApps = db.applications.length;
  const inReviewApps = db.applications.filter(a => a.status === 'APPLIED' || a.status === 'UNDER_REVIEW').length;
  const scheduledInterviews = db.interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'COMPLETED');
  const selectedCount = db.applications.filter(a => a.status === 'SELECTED').length;
  const considerCount = db.applications.filter(a => a.status === 'CONSIDER_FOR_OTHER_ROLES').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      {/* Welcome & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-sans font-bold text-white tracking-tight">recruiting overview</h1>
          <p className="text-white/50 text-sm font-sans">
            Real-time pipeline analytics, autonomous Agora voice interviews, and talent allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/schedule"
            className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white font-mono text-xs rounded-full border border-white/[0.08] transition flex items-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>view schedule</span>
          </Link>
          <Link
            href="/admin/applicants"
            className="px-5 py-2 bg-white text-black hover:bg-neutral-200 font-sans font-bold text-xs rounded-full shadow-[0_0_20px_rgba(255,255,255,0.15)] transition flex items-center gap-2"
          >
            <Users className="w-3.5 h-3.5" />
            <span>manage applicants</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          href="/admin/jobs" 
          className="bg-[#0a0a0d] p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Active Openings</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4 text-white/70" />
            </div>
          </div>
          <p className="text-3xl font-mono font-bold text-white mt-3">{db.jobs.length}</p>
          <p className="text-xs font-mono text-white/50 mt-2 flex items-center gap-1">
            manage roles <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        <Link 
          href="/admin/applicants" 
          className="bg-[#0a0a0d] p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Total Applicants</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 text-white/70" />
            </div>
          </div>
          <p className="text-3xl font-mono font-bold text-white mt-3">{totalApps}</p>
          <p className="text-xs font-mono text-white/50 mt-2">
            <strong className="text-amber-400 font-bold">{inReviewApps}</strong> awaiting review
          </p>
        </Link>

        <Link 
          href="/admin/schedule" 
          className="bg-[#0a0a0d] p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white/40 uppercase tracking-wider">AI Interviews</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-mono font-bold text-white mt-3">{scheduledInterviews.length}</p>
          <p className="text-xs font-mono text-purple-300 mt-2 flex items-center gap-1">
            lined up in calendar <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </Link>

        <Link 
          href="/admin/applicants" 
          className="bg-[#0a0a0d] p-5 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white/40 uppercase tracking-wider">Accepted & Talent Pool</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-mono font-bold text-white mt-3">{selectedCount + considerCount}</p>
          <p className="text-xs font-mono text-emerald-400 mt-2">
            {selectedCount} selected · {considerCount} alt pool
          </p>
        </Link>
      </div>

      {/* Grid: Lined Up Interviews & Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lined-up Interviews Widget */}
        <div className="bg-[#0a0a0d] rounded-2xl border border-white/[0.08] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h2 className="text-base font-sans font-bold text-white">upcoming interviews</h2>
            </div>
            <Link 
              href="/admin/schedule" 
              className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              full calendar →
            </Link>
          </div>

          <div className="space-y-2.5">
            {db.interviews.slice(0, 4).map(interview => {
              const app = db.applications.find(a => a.id === interview.applicationId);
              const candidate = db.candidates.find(c => c.id === app?.candidateId);
              const job = db.jobs.find(j => j.id === app?.jobId);
              const blueprint = db.blueprints.find(b => b.interviewId === interview.id);

              return (
                <div 
                  key={interview.id} 
                  className="p-3.5 rounded-xl border border-white/[0.06] hover:border-white/15 bg-white/[0.02] flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <div className="font-sans font-bold text-sm text-white truncate">
                      {candidate?.name || 'Candidate'}
                    </div>
                    <div className="text-xs font-mono text-white/40 truncate mt-0.5" suppressHydrationWarning>
                      {job?.title} · {formatDateTimeShortIST(interview.scheduledAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {blueprint ? (
                      <Link
                        href={`/interview/${blueprint.id}`}
                        target="_blank"
                        className="px-3 py-1 bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-mono rounded-full border border-white/[0.1] flex items-center gap-1.5 transition"
                      >
                        <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span>room</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/interviews/${interview.id}/blueprint`}
                        className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono rounded-full hover:bg-amber-500/30 transition"
                      >
                        <span>blueprint</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            {db.interviews.length === 0 && (
              <div className="p-8 text-center text-white/40 text-xs font-mono">
                no interviews scheduled yet.
              </div>
            )}
          </div>
        </div>

        {/* Active Openings Widget */}
        <div className="bg-[#0a0a0d] rounded-2xl border border-white/[0.08] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-white/70" />
              <h2 className="text-base font-sans font-bold text-white">active job postings</h2>
            </div>
            <Link 
              href="/admin/jobs/new" 
              className="text-xs font-mono text-white/60 hover:text-white flex items-center gap-1"
            >
              + post new job
            </Link>
          </div>

          <div className="space-y-2.5">
            {db.jobs.slice(0, 4).map(job => {
              const appCount = db.applications.filter(a => a.jobId === job.id).length;
              return (
                <div 
                  key={job.id} 
                  className="p-3.5 rounded-xl border border-white/[0.06] hover:border-white/15 bg-white/[0.02] flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <div className="font-sans font-bold text-sm text-white truncate">{job.title}</div>
                    <div className="text-xs text-white/40 truncate mt-0.5">{job.description}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-0.5 text-[11px] font-mono font-medium bg-white/[0.05] text-white/70 rounded-full border border-white/[0.08]">
                      {appCount} {appCount === 1 ? 'applicant' : 'applicants'}
                    </span>
                    <Link 
                      href={`/admin/jobs/${job.id}`} 
                      className="text-xs font-mono text-white/60 hover:text-white transition"
                    >
                      manage →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

