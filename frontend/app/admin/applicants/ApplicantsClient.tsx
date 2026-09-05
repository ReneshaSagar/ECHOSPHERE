"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateTimeShortIST } from '@/lib/dateFormat';
import { 
  Users, 
  Search, 
  Filter, 
  ExternalLink, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  HelpCircle,
  Briefcase,
  GitBranch,
  Linkedin,
  Github,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

export interface ApplicantRow {
  id: string;
  jobId: string;
  candidateId: string;
  name: string;
  email: string;
  role: string;
  status: string; // 'APPLIED' | 'UNDER_REVIEW' | 'INTERVIEW_SCHEDULED' | 'SELECTED' | 'CONSIDER_FOR_OTHER_ROLES' | 'REJECTED'
  decisionStage?: string;
  decisionReason?: string;
  recommendedAlternativeRoles?: string[];
  evaluationScore?: number;
  evaluationSummary?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  resumeDriveUrl?: string;
  resumeFileName?: string;
  totalCommits?: number;
  recentCommits30Days?: number;
  pinnedProjectsCount?: number;
  interviewId?: string;
  interviewStatus?: string;
  hasScorecard?: boolean;
  scheduledAt?: string;
}

export default function ApplicantsClient({ 
  initialApplicants, 
  jobs 
}: { 
  initialApplicants: ApplicantRow[]; 
  jobs: { id: string; title: string }[]; 
}) {
  const router = useRouter();
  const [applicants, setApplicants] = useState<ApplicantRow[]>(initialApplicants);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedJob, setSelectedJob] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Decision Modal State
  const [activeModalApp, setActiveModalApp] = useState<ApplicantRow | null>(null);
  const [modalStatus, setModalStatus] = useState<string>('REJECTED');
  const [modalStage, setModalStage] = useState<string>('RESUME_SCREENING');
  const [modalReason, setModalReason] = useState<string>('');
  const [modalAltRoles, setModalAltRoles] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Status Metrics
  const metrics = {
    total: applicants.length,
    inReview: applicants.filter(a => a.status === 'APPLIED' || a.status === 'UNDER_REVIEW').length,
    scheduled: applicants.filter(a => a.status === 'INTERVIEW_SCHEDULED').length,
    selected: applicants.filter(a => a.status === 'SELECTED').length,
    consider: applicants.filter(a => a.status === 'CONSIDER_FOR_OTHER_ROLES').length,
    rejected: applicants.filter(a => a.status === 'REJECTED').length
  };

  const openDecisionModal = (app: ApplicantRow, targetStatus: string) => {
    setActiveModalApp(app);
    setModalStatus(targetStatus);
    setModalStage(app.decisionStage || (app.interviewId ? 'ROUND_2_SYSTEM_DESIGN' : 'RESUME_SCREENING'));
    setModalReason(app.decisionReason || '');
    setModalAltRoles((app.recommendedAlternativeRoles || []).join(', '));
  };

  const handleSaveDecision = async () => {
    if (!activeModalApp) return;
    setIsUpdating(true);

    try {
      const altRolesArray = modalAltRoles.split(',').map(r => r.trim()).filter(Boolean);
      const res = await fetch(`/api/applications/${activeModalApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: modalStatus,
          decisionStage: modalStage,
          decisionReason: modalReason || undefined,
          recommendedAlternativeRoles: altRolesArray.length > 0 ? altRolesArray : undefined
        })
      });

      if (res.ok) {
        setApplicants(prev => prev.map(a => {
          if (a.id === activeModalApp.id) {
            return {
              ...a,
              status: modalStatus,
              decisionStage: modalStage,
              decisionReason: modalReason,
              recommendedAlternativeRoles: altRolesArray
            };
          }
          return a;
        }));
        setActiveModalApp(null);
      }
    } catch (e) {
      console.error('Failed to update decision:', e);
    }
    setIsUpdating(false);
  };

  const handleSaveAndSchedule = async () => {
    if (!activeModalApp) return;
    const appId = activeModalApp.id;
    await handleSaveDecision();
    router.push(`/admin/applications/${appId}/schedule`);
  };

  const filtered = applicants.filter(app => {
    if (selectedStatus === 'UNDER_REVIEW') {
      if (app.status !== 'UNDER_REVIEW' && app.status !== 'APPLIED') return false;
    } else if (selectedStatus !== 'ALL' && app.status !== selectedStatus) {
      return false;
    }
    if (selectedJob !== 'ALL' && app.jobId !== selectedJob) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.name.toLowerCase().includes(q);
      const matchRole = app.role.toLowerCase().includes(q);
      const matchEmail = app.email.toLowerCase().includes(q);
      return matchName || matchRole || matchEmail;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-sans font-bold text-white tracking-tight flex items-center gap-3">
          <Users className="w-7 h-7 text-white/70" />
          <span>candidate pipeline & evaluation</span>
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Review all applicants, manage decision stages, inspect AI interview reports, and track alternative role allocations.
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setSelectedStatus('ALL')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            selectedStatus === 'ALL' 
              ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/30' 
              : 'bg-[#0a0a0d] border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="text-xs font-mono text-white/40 uppercase">Total</div>
          <div className="text-2xl font-mono font-bold text-white mt-1">{metrics.total}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('UNDER_REVIEW')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            selectedStatus === 'UNDER_REVIEW' 
              ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/40' 
              : 'bg-[#0a0a0d] border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="text-xs font-mono text-amber-400 uppercase">In Review</div>
          <div className="text-2xl font-mono font-bold text-amber-300 mt-1">{metrics.inReview}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('INTERVIEW_SCHEDULED')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            selectedStatus === 'INTERVIEW_SCHEDULED' 
              ? 'bg-purple-500/15 border-purple-500/40 ring-1 ring-purple-500/40' 
              : 'bg-[#0a0a0d] border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="text-xs font-mono text-purple-400 uppercase">Interviewing</div>
          <div className="text-2xl font-mono font-bold text-purple-300 mt-1">{metrics.scheduled}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('SELECTED')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            selectedStatus === 'SELECTED' 
              ? 'bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/40' 
              : 'bg-[#0a0a0d] border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="text-xs font-mono text-emerald-400 uppercase">Selected</div>
          <div className="text-2xl font-mono font-bold text-emerald-300 mt-1">{metrics.selected}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('CONSIDER_FOR_OTHER_ROLES')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            selectedStatus === 'CONSIDER_FOR_OTHER_ROLES' 
              ? 'bg-cyan-500/15 border-cyan-500/40 ring-1 ring-cyan-500/40' 
              : 'bg-[#0a0a0d] border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="text-xs font-mono text-cyan-400 uppercase">Talent Pool</div>
          <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">{metrics.consider}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('REJECTED')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            selectedStatus === 'REJECTED' 
              ? 'bg-rose-500/15 border-rose-500/40 ring-1 ring-rose-500/40' 
              : 'bg-[#0a0a0d] border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="text-xs font-mono text-rose-400 uppercase">Rejected</div>
          <div className="text-2xl font-mono font-bold text-rose-300 mt-1">{metrics.rejected}</div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-[#0a0a0d] p-4 rounded-2xl border border-white/[0.08] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 border border-white/[0.1] rounded-xl text-xs font-mono bg-[#030304] text-white focus:outline-none focus:border-white/30"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNDER_REVIEW">In Review (Applied & Reviewing)</option>
            <option value="APPLIED">Applied (Fresh Only)</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="SELECTED">Selected / Accepted</option>
            <option value="CONSIDER_FOR_OTHER_ROLES">Consider for Other Roles</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Job Role Dropdown */}
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="px-3.5 py-2 border border-white/[0.1] rounded-xl text-xs font-mono bg-[#030304] text-white focus:outline-none focus:border-white/30 max-w-xs truncate"
          >
            <option value="ALL">All Job Openings</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            suppressHydrationWarning
            autoComplete="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
          />
        </div>
      </div>

      {/* Applicants Table */}
      <div className="bg-[#0a0a0d] rounded-2xl border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.02] border-b border-white/[0.06] text-[11px] font-mono font-semibold text-white/50 uppercase tracking-wider">
              <tr>
                <th className="p-4">Candidate & Links</th>
                <th className="p-4">Applied Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Decision Stage & Evaluation Stats</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm font-sans">
              {filtered.map(app => {
                return (
                  <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Candidate */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-white/20 to-white/5 border border-white/20 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
                          {app.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link 
                            href={`/admin/applications/${app.id}`}
                            className="font-bold text-white hover:text-white/80 truncate block text-base transition"
                          >
                            {app.name}
                          </Link>
                          <div className="text-xs font-mono text-white/40 truncate">{app.email}</div>
                          
                          {/* Links & Commit Badges */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {app.linkedinUrl && (
                              <a 
                                href={app.linkedinUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-white/60 hover:text-white transition"
                                title="LinkedIn Profile"
                              >
                                <Linkedin className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {app.githubUrl && (
                              <a 
                                href={app.githubUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-white/60 hover:text-white flex items-center gap-1 transition"
                                title="GitHub Profile"
                              >
                                <Github className="w-3.5 h-3.5" />
                                {app.recentCommits30Days !== undefined && app.recentCommits30Days > 0 && (
                                  <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                    ⚡ {app.recentCommits30Days} commits/mo
                                  </span>
                                )}
                              </a>
                            )}
                            {app.resumeDriveUrl && (
                              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                🔗 Drive Resume
                              </span>
                            )}
                            {app.resumeFileName && !app.resumeDriveUrl && (
                              <span className="text-[10px] font-mono text-white/60 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                                📄 {app.resumeFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Applied Role */}
                    <td className="p-4">
                      <div className="font-semibold text-white">{app.role}</div>
                      <div className="text-xs font-mono text-white/40 mt-0.5">Application #{app.id.substring(4)}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      {app.status === 'SELECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Selected / Accepted
                        </span>
                      )}
                      {app.status === 'CONSIDER_FOR_OTHER_ROLES' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Talent Pool / Alt Role
                        </span>
                      )}
                      {app.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      )}
                      {app.status === 'INTERVIEW_SCHEDULED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <Calendar className="w-3.5 h-3.5" />
                          Interview Scheduled
                        </span>
                      )}
                      {app.status === 'UNDER_REVIEW' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" />
                          Under Review
                        </span>
                      )}
                      {app.status === 'APPLIED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-white/[0.05] text-white/80 border border-white/[0.1]">
                          <Sparkles className="w-3.5 h-3.5" />
                          Applied
                        </span>
                      )}
                    </td>

                    {/* Decision Stage & Breakdown Stats */}
                    <td className="p-4 max-w-sm font-sans">
                      {/* REJECTED BREAKDOWN */}
                      {app.status === 'REJECTED' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400">
                            <span>Stage:</span>
                            <span className="bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-mono">
                              {app.decisionStage || 'Resume Screening'}
                            </span>
                          </div>
                          <p className="text-xs text-white/50 line-clamp-2 italic font-sans">
                            "{app.decisionReason || 'Candidate profile did not meet key architectural or concurrency qualifications for this role.'}"
                          </p>
                        </div>
                      )}

                      {/* SELECTED BREAKDOWN */}
                      {app.status === 'SELECTED' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                              Score: {app.evaluationScore ? `${app.evaluationScore}%` : '92% Strong Hire'}
                            </span>
                            <span className="text-[11px] font-mono text-white/40">Completed 3 Rounds</span>
                          </div>
                          <p className="text-xs text-white/60 line-clamp-2 font-sans">
                            {app.evaluationSummary || 'Exceptional problem-solving, structured technical communication, and validated codecraft.'}
                          </p>
                        </div>
                      )}

                      {/* CONSIDER FOR OTHER ROLES */}
                      {app.status === 'CONSIDER_FOR_OTHER_ROLES' && (
                        <div className="space-y-1">
                          <div className="text-xs font-mono font-bold text-cyan-300">Recommended Next Roles:</div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {(app.recommendedAlternativeRoles && app.recommendedAlternativeRoles.length > 0
                              ? app.recommendedAlternativeRoles
                              : ['Senior Frontend Engineer', 'Fullstack Tech Lead']
                            ).map((r, i) => (
                              <span key={i} className="text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                {r}
                              </span>
                            ))}
                          </div>
                          {app.decisionReason && (
                            <p className="text-[11px] text-white/40 italic mt-0.5 truncate font-sans">
                              Note: {app.decisionReason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* INTERVIEW SCHEDULED */}
                      {app.status === 'INTERVIEW_SCHEDULED' && (
                        <div className="space-y-1 text-xs">
                          <div className="font-mono font-semibold text-purple-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span suppressHydrationWarning>{app.scheduledAt ? formatDateTimeShortIST(app.scheduledAt) : 'Date Pending'}</span>
                          </div>
                          <p className="text-white/40 font-sans">Autonomous Agora voice interview room active.</p>
                        </div>
                      )}

                      {/* APPLIED / UNDER REVIEW */}
                      {(app.status === 'APPLIED' || app.status === 'UNDER_REVIEW') && (
                        <div className="text-xs text-white/40 font-sans">
                          Pending AI ATS evaluation and recruiter review.
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status Change Dropdown Menu */}
                        <div className="relative inline-block text-left">
                          <select
                            value={app.status}
                            onChange={(e) => {
                              const newSt = e.target.value;
                              if (newSt === 'INTERVIEW_SCHEDULED') {
                                router.push(`/admin/applications/${app.id}/schedule`);
                                return;
                              }
                              if (newSt === 'REJECTED' || newSt === 'CONSIDER_FOR_OTHER_ROLES' || newSt === 'SELECTED') {
                                openDecisionModal(app, newSt);
                              } else {
                                fetch(`/api/applications/${app.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: newSt })
                                }).then(res => {
                                  if (res.ok) {
                                    setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status: newSt } : a));
                                  }
                                });
                              }
                            }}
                            className="text-xs font-mono font-semibold px-3 py-1.5 border border-white/[0.1] rounded-xl bg-[#030304] hover:bg-white/[0.04] focus:outline-none focus:border-white/30 text-white"
                          >
                            <option value="APPLIED">Applied</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="INTERVIEW_SCHEDULED">Schedule Interview</option>
                            <option value="SELECTED">✓ Select / Accept</option>
                            <option value="CONSIDER_FOR_OTHER_ROLES">💡 Consider for Alt Role</option>
                            <option value="REJECTED">✗ Reject</option>
                          </select>
                        </div>

                        {/* View Full ATS Report — only shown when interview is completed! */}
                        {(app.interviewStatus === 'COMPLETED' || app.hasScorecard || app.evaluationScore !== undefined) && (
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className="px-3.5 py-1.5 bg-white/[0.08] text-white hover:bg-white/[0.15] font-mono text-xs rounded-xl border border-white/[0.1] transition flex items-center gap-1.5 shadow-xs"
                            title="View Full Application & Report"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-400" />
                            <span>report</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-white/40 font-mono text-sm">
                    <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p>no applicants match your filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Configuration Modal */}
      {activeModalApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0d] rounded-3xl max-w-lg w-full p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/[0.1] space-y-6 animate-in fade-in zoom-in-95 font-sans">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-xl font-sans font-bold text-white">
                  update candidate decision
                </h3>
                <p className="text-xs font-mono text-white/40">
                  candidate: <strong className="text-white">{activeModalApp.name}</strong> · role: <strong className="text-white">{activeModalApp.role}</strong>
                </p>
              </div>
              <button
                onClick={() => setActiveModalApp(null)}
                className="text-white/40 hover:text-white font-mono text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-white/70">Target Decision</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full p-3 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-white/30"
                >
                  <option value="SELECTED">✓ Selected / Extend Offer</option>
                  <option value="CONSIDER_FOR_OTHER_ROLES">💡 Consider for Other Roles (Talent Pool)</option>
                  <option value="REJECTED">✗ Reject Candidate</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-white/70">Decision Stage</label>
                <select
                  value={modalStage}
                  onChange={(e) => setModalStage(e.target.value)}
                  className="w-full p-3 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-white/30"
                >
                  <option value="RESUME_SCREENING">Resume & Profile Screening</option>
                  <option value="ROUND_1_TECHNICAL">Technical Architecture (Round 1)</option>
                  <option value="ROUND_2_SYSTEM_DESIGN">System Design & Concurrency (Round 2)</option>
                  <option value="ROUND_3_BEHAVIORAL">Leadership & Culture (Round 3)</option>
                  <option value="FINAL_DECISION">Final Recruiter Panel Review</option>
                </select>
              </div>

              {modalStatus === 'CONSIDER_FOR_OTHER_ROLES' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-medium text-white/70">
                    Alternative Roles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={modalAltRoles}
                    onChange={(e) => setModalAltRoles(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer, Staff DevOps, Fullstack Architect"
                    className="w-full p-3 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                    suppressHydrationWarning
                    autoComplete="off"
                  />
                  <p className="text-[11px] font-mono text-white/40">
                    Candidate will be flagged in the talent pool for these matching opportunities.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-white/70">
                  {modalStatus === 'REJECTED' 
                    ? 'Rejection Reason / Skill Gaps' 
                    : modalStatus === 'SELECTED'
                    ? 'Hiring Justification & Key Strengths'
                    : 'Notes / Match Rationale'}
                </label>
                <textarea
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  rows={3}
                  placeholder={
                    modalStatus === 'REJECTED'
                      ? 'e.g. Lacks required distributed concurrency experience; candidate answered vaguely on Redis caching...'
                      : 'e.g. Exceptional answers on system scalability, verified high commit velocity...'
                  }
                  className="w-full p-3 bg-[#030304] border border-white/[0.1] rounded-xl text-xs font-sans text-white placeholder-white/30 focus:outline-none focus:border-white/30 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModalApp(null)}
                className="px-5 py-2.5 border border-white/[0.1] rounded-full text-xs font-mono text-white/60 hover:text-white transition"
              >
                cancel
              </button>
              {modalStatus === 'SELECTED' && (
                <button
                  type="button"
                  onClick={handleSaveAndSchedule}
                  disabled={isUpdating}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-mono font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{isUpdating ? 'Saving...' : 'Save & Pick Slot →'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveDecision}
                disabled={isUpdating}
                className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 rounded-full text-xs font-sans font-bold shadow-sm transition disabled:opacity-50"
              >
                {isUpdating ? 'saving...' : 'save decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

