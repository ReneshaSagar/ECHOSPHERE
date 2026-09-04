import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
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
  CalendarPlus
} from 'lucide-react';

export default function AdminDashboard() {
  const db = getDb();
  
  const totalApps = db.applications.length;
  const inReviewApps = db.applications.filter(a => a.status === 'APPLIED' || a.status === 'UNDER_REVIEW').length;
  const scheduledInterviews = db.interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'COMPLETED');
  const selectedCount = db.applications.filter(a => a.status === 'SELECTED').length;
  const considerCount = db.applications.filter(a => a.status === 'CONSIDER_FOR_OTHER_ROLES').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Recruiting Overview</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time pipeline analytics, autonomous Agora voice interviews, and talent allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/schedule"
            className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-sm rounded-lg border border-purple-200 shadow-xs flex items-center gap-2 transition"
          >
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>View Schedule</span>
          </Link>
          <Link
            href="/admin/applicants"
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 transition"
          >
            <Users className="w-4 h-4" />
            <span>Manage Applicants</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link 
          href="/admin/jobs" 
          className="bg-white p-5 rounded-xl shadow-xs border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Openings</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{db.jobs.length}</p>
          <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
            Manage Roles <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        <Link 
          href="/admin/applicants" 
          className="bg-white p-5 rounded-xl shadow-xs border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Applicants</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{totalApps}</p>
          <p className="text-xs text-gray-500 mt-1">
            <strong className="text-amber-600 font-bold">{inReviewApps}</strong> awaiting review
          </p>
        </Link>

        <Link 
          href="/admin/schedule" 
          className="bg-white p-5 rounded-xl shadow-xs border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Interviews</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{scheduledInterviews.length}</p>
          <p className="text-xs text-purple-600 font-medium mt-1 flex items-center gap-1">
            Lined up in Calendar <ArrowRight className="w-3 h-3" />
          </p>
        </Link>

        <Link 
          href="/admin/applicants" 
          className="bg-white p-5 rounded-xl shadow-xs border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Accepted & Talent Pool</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 mt-2">{selectedCount + considerCount}</p>
          <p className="text-xs text-emerald-700 font-semibold mt-1">
            {selectedCount} Selected • {considerCount} Alt Pool
          </p>
        </Link>
      </div>

      {/* Grid: Lined Up Interviews & Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lined-up Interviews Widget */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Upcoming Interviews</h2>
            </div>
            <Link 
              href="/admin/schedule" 
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
            >
              Full Calendar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {db.interviews.slice(0, 4).map(interview => {
              const app = db.applications.find(a => a.id === interview.applicationId);
              const candidate = db.candidates.find(c => c.id === app?.candidateId);
              const job = db.jobs.find(j => j.id === app?.jobId);
              const blueprint = db.blueprints.find(b => b.interviewId === interview.id);

              return (
                <div 
                  key={interview.id} 
                  className="p-3 rounded-lg border border-gray-100 hover:border-purple-200 bg-gray-50/50 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">
                      {candidate?.name || 'Candidate'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {job?.title} • {new Date(interview.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {blueprint ? (
                      <Link
                        href={`/interview/${blueprint.id}`}
                        target="_blank"
                        className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded shadow-2xs hover:bg-blue-700 flex items-center gap-1 transition"
                      >
                        <Mic className="w-3 h-3 animate-pulse" />
                        <span>Room</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/interviews/${interview.id}/blueprint`}
                        className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded hover:bg-amber-600 transition"
                      >
                        <span>Blueprint</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            {db.interviews.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-xs">
                No interviews scheduled yet.
              </div>
            )}
          </div>
        </div>

        {/* Active Openings Widget */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Active Job Postings</h2>
            </div>
            <Link 
              href="/admin/jobs/new" 
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              + Post New Job
            </Link>
          </div>

          <div className="space-y-3">
            {db.jobs.slice(0, 4).map(job => {
              const appCount = db.applications.filter(a => a.jobId === job.id).length;
              return (
                <div 
                  key={job.id} 
                  className="p-3 rounded-lg border border-gray-100 hover:border-blue-200 bg-gray-50/50 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">{job.title}</div>
                    <div className="text-xs text-gray-500 truncate">{job.description}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">
                      {appCount} {appCount === 1 ? 'applicant' : 'applicants'}
                    </span>
                    <Link 
                      href={`/admin/jobs/${job.id}`} 
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Manage
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
