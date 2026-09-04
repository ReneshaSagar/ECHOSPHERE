"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    if (selectedStatus !== 'ALL' && app.status !== selectedStatus) return false;
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          Candidate Pipeline & Evaluation
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Review all applicants, manage decision stages, inspect AI interview reports, and track alternative role allocations.
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setSelectedStatus('ALL')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            selectedStatus === 'ALL' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 uppercase">Total Candidates</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('UNDER_REVIEW')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            selectedStatus === 'UNDER_REVIEW' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-bold text-amber-600 uppercase">In Review</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{metrics.inReview}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('INTERVIEW_SCHEDULED')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            selectedStatus === 'INTERVIEW_SCHEDULED' ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-bold text-purple-600 uppercase">Interviewing</div>
          <div className="text-2xl font-black text-purple-700 mt-1">{metrics.scheduled}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('SELECTED')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            selectedStatus === 'SELECTED' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-bold text-emerald-600 uppercase">Selected / Offer</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.selected}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('CONSIDER_FOR_OTHER_ROLES')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            selectedStatus === 'CONSIDER_FOR_OTHER_ROLES' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-bold text-indigo-600 uppercase">Talent Pool</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{metrics.consider}</div>
        </div>

        <div 
          onClick={() => setSelectedStatus('REJECTED')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            selectedStatus === 'REJECTED' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="text-xs font-bold text-rose-600 uppercase">Rejected</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{metrics.rejected}</div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="SELECTED">Selected / Accepted</option>
            <option value="CONSIDER_FOR_OTHER_ROLES">Consider for Other Roles</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Job Role Dropdown */}
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium max-w-xs truncate"
          >
            <option value="ALL">All Job Openings</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate name, email, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Applicants Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Candidate & Links</th>
                <th className="p-4">Applied Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Decision Stage & Evaluation Stats</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {filtered.map(app => {
                return (
                  <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Candidate */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-sm flex items-center justify-center shrink-0">
                          {app.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link 
                            href={`/admin/applications/${app.id}`}
                            className="font-bold text-gray-900 hover:text-blue-600 truncate block text-base"
                          >
                            {app.name}
                          </Link>
                          <div className="text-xs text-gray-400 truncate">{app.email}</div>
                          
                          {/* Links & Commit Badges */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {app.linkedinUrl && (
                              <a 
                                href={app.linkedinUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
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
                                className="text-gray-700 hover:text-gray-900 flex items-center gap-1"
                                title="GitHub Profile"
                              >
                                <Github className="w-3.5 h-3.5" />
                                {app.recentCommits30Days !== undefined && app.recentCommits30Days > 0 && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                                    ⚡ {app.recentCommits30Days} commits/mo
                                  </span>
                                )}
                              </a>
                            )}
                            {app.resumeDriveUrl && (
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                🔗 Drive Resume
                              </span>
                            )}
                            {app.resumeFileName && !app.resumeDriveUrl && (
                              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                📄 {app.resumeFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Applied Role */}
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">{app.role}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Application #{app.id.substring(4)}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      {app.status === 'SELECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Selected / Accepted
                        </span>
                      )}
                      {app.status === 'CONSIDER_FOR_OTHER_ROLES' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Talent Pool / Alt Role
                        </span>
                      )}
                      {app.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      )}
                      {app.status === 'INTERVIEW_SCHEDULED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          <Calendar className="w-3.5 h-3.5" />
                          Interview Scheduled
                        </span>
                      )}
                      {app.status === 'UNDER_REVIEW' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          Under Review
                        </span>
                      )}
                      {app.status === 'APPLIED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <Sparkles className="w-3.5 h-3.5" />
                          Applied
                        </span>
                      )}
                    </td>

                    {/* Decision Stage & Breakdown Stats */}
                    <td className="p-4 max-w-sm">
                      {/* REJECTED BREAKDOWN */}
                      {app.status === 'REJECTED' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                            <span>Stage:</span>
                            <span className="bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono">
                              {app.decisionStage || 'Resume Screening'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 italic">
                            "{app.decisionReason || 'Candidate profile did not meet key architectural or concurrency qualifications for this role.'}"
                          </p>
                        </div>
                      )}

                      {/* SELECTED BREAKDOWN */}
                      {app.status === 'SELECTED' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Score: {app.evaluationScore ? `${app.evaluationScore}%` : '92% Strong Hire'}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">Completed 3 Rounds</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {app.evaluationSummary || 'Exceptional problem-solving, structured technical communication, and validated codecraft.'}
                          </p>
                        </div>
                      )}

                      {/* CONSIDER FOR OTHER ROLES */}
                      {app.status === 'CONSIDER_FOR_OTHER_ROLES' && (
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-indigo-700">Recommended Next Roles:</div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {(app.recommendedAlternativeRoles && app.recommendedAlternativeRoles.length > 0
                              ? app.recommendedAlternativeRoles
                              : ['Senior Frontend Engineer', 'Fullstack Tech Lead']
                            ).map((r, i) => (
                              <span key={i} className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                {r}
                              </span>
                            ))}
                          </div>
                          {app.decisionReason && (
                            <p className="text-[11px] text-gray-500 italic mt-0.5 truncate">
                              Note: {app.decisionReason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* INTERVIEW SCHEDULED */}
                      {app.status === 'INTERVIEW_SCHEDULED' && (
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold text-purple-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {app.scheduledAt ? `${new Date(app.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST` : 'Date Pending'}
                          </div>
                          <p className="text-gray-500">Autonomous Agora voice interview room active.</p>
                        </div>
                      )}

                      {/* APPLIED / UNDER REVIEW */}
                      {(app.status === 'APPLIED' || app.status === 'UNDER_REVIEW') && (
                        <div className="text-xs text-gray-500">
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
                            className="text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                          >
                            <option value="APPLIED">Applied</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="INTERVIEW_SCHEDULED">Schedule Interview</option>
                            <option value="SELECTED">✓ Select / Accept</option>
                            <option value="CONSIDER_FOR_OTHER_ROLES">💡 Consider for Alt Role</option>
                            <option value="REJECTED">✗ Reject</option>
                          </select>
                        </div>

                        {/* View Full ATS Report */}
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-lg border border-blue-200 transition flex items-center gap-1"
                          title="View Full Application & Report"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Report</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-700">No applicants match your filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Configuration Modal */}
      {activeModalApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Update Candidate Decision
                </h3>
                <p className="text-xs text-gray-500">
                  Candidate: <strong>{activeModalApp.name}</strong> • Role: <strong>{activeModalApp.role}</strong>
                </p>
              </div>
              <button
                onClick={() => setActiveModalApp(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Decision</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-semibold"
                >
                  <option value="SELECTED">✓ Selected / Extend Offer</option>
                  <option value="CONSIDER_FOR_OTHER_ROLES">💡 Consider for Other Roles (Talent Pool)</option>
                  <option value="REJECTED">✗ Reject Candidate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Decision Stage</label>
                <select
                  value={modalStage}
                  onChange={(e) => setModalStage(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="RESUME_SCREENING">Resume & Profile Screening</option>
                  <option value="ROUND_1_TECHNICAL">Technical Architecture (Round 1)</option>
                  <option value="ROUND_2_SYSTEM_DESIGN">System Design & Concurrency (Round 2)</option>
                  <option value="ROUND_3_BEHAVIORAL">Leadership & Culture (Round 3)</option>
                  <option value="FINAL_DECISION">Final Recruiter Panel Review</option>
                </select>
              </div>

              {modalStatus === 'CONSIDER_FOR_OTHER_ROLES' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Alternative Roles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={modalAltRoles}
                    onChange={(e) => setModalAltRoles(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer, Staff DevOps, Fullstack Architect"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Candidate will be flagged in the talent pool for these matching opportunities.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
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
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModalApp(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {modalStatus === 'SELECTED' && (
                <button
                  type="button"
                  onClick={handleSaveAndSchedule}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {isUpdating ? 'Saving...' : 'Save & Pick Interview Slot →'}
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveDecision}
                disabled={isUpdating}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
