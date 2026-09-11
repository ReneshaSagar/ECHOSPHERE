"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ApplicationActionsProps {
  applicationId: string;
  currentStatus: string;
  hasInterview?: boolean;
  interviewStatus?: string;
}

export default function ApplicationActions({
  applicationId,
  currentStatus,
  hasInterview = false,
  interviewStatus
}: ApplicationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const updateStatus = async (status: string) => {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        if (status === 'SELECTED') {
          setFeedbackMessage('✓ Candidate successfully marked as Hired. Offer extended.');
        } else if (status === 'REJECTED') {
          setFeedbackMessage('✕ Candidate status updated to Rejected.');
        } else if (status === 'UNDER_REVIEW') {
          setFeedbackMessage('💬 Candidate placed Under Review for committee discussion.');
        } else if (status === 'SHORTLISTED') {
          setFeedbackMessage('✓ Candidate shortlisted for interview.');
        }
        router.refresh();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err: any) {
      alert("Error updating application status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine if this application is in the post-interview decision stage
  const isPostInterview = 
    hasInterview || 
    interviewStatus === 'COMPLETED' || 
    currentStatus === 'UNDER_REVIEW' || 
    currentStatus === 'INTERVIEW_COMPLETED' || 
    currentStatus === 'SELECTED' ||
    (currentStatus === 'REJECTED' && hasInterview);

  const isHired = currentStatus === 'SELECTED';
  const isRejected = currentStatus === 'REJECTED';
  const isUnderReview = currentStatus === 'UNDER_REVIEW' || currentStatus === 'INTERVIEW_COMPLETED';

  return (
    <div className="bg-[#0a0a0d] p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-sans font-bold text-lg text-white">
            {isPostInterview ? 'Hiring Decision & Final Outcome' : 'Screening & Pipeline Actions'}
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            {isPostInterview 
              ? 'Review the AI evidence scorecard above and record the hiring committee decision.' 
              : 'Move candidate across screening stages or advance to multi-agent interview.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Status:</span>
          {isHired ? (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
              ✓ HIRED / OFFER EXTENDED
            </span>
          ) : isRejected ? (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold flex items-center gap-1">
              ✕ REJECTED
            </span>
          ) : isUnderReview ? (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1">
              💬 UNDER REVIEW
            </span>
          ) : (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/80 font-bold">
              {currentStatus}
            </span>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div className={`mb-5 px-4 py-2.5 rounded-xl font-mono text-xs border flex items-center gap-2 transition-all ${
          isHired 
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
            : isRejected 
            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
        }`}>
          {feedbackMessage}
        </div>
      )}
      
      <div className="flex flex-wrap items-center gap-3">
        {isPostInterview ? (
          <>
            <button 
              onClick={() => updateStatus('SELECTED')}
              disabled={loading || isHired}
              className={`px-5 py-2.5 rounded-full font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isHired 
                  ? 'bg-emerald-500/25 text-emerald-200 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-default'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50'
              } disabled:opacity-80`}
            >
              <span>✓</span> {isHired ? 'Marked as Hired' : 'Mark as Hired'}
            </button>
            
            <button 
              onClick={() => updateStatus('REJECTED')}
              disabled={loading || isRejected}
              className={`px-5 py-2.5 rounded-full font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isRejected 
                  ? 'bg-rose-500/25 text-rose-200 border-2 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.25)] cursor-default'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50'
              } disabled:opacity-80`}
            >
              <span>✕</span> {isRejected ? 'Candidate Rejected' : 'Reject Candidate'}
            </button>

            <button 
              onClick={() => updateStatus('UNDER_REVIEW')}
              disabled={loading || isUnderReview}
              className={`px-5 py-2.5 rounded-full font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isUnderReview 
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-default'
                  : 'bg-white/[0.05] text-white/70 border border-white/[0.1] hover:bg-white/[0.1]'
              } disabled:opacity-80`}
            >
              <span>💬</span> {isUnderReview ? 'Currently Under Review' : 'Move to Under Review'}
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => updateStatus('SHORTLISTED')}
              disabled={loading || currentStatus === 'SHORTLISTED'}
              className="px-5 py-2.5 rounded-full font-mono text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>✓</span> Select for Interview
            </button>
            
            <button 
              onClick={() => updateStatus('REJECTED')}
              disabled={loading || currentStatus === 'REJECTED'}
              className="px-5 py-2.5 rounded-full font-mono text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>✕</span> Reject Candidate
            </button>

            {currentStatus === 'SHORTLISTED' && (
              <button 
                onClick={() => router.push(`/admin/applications/${applicationId}/schedule`)}
                className="sm:ml-auto px-6 py-2.5 bg-white text-black font-sans font-bold text-xs rounded-full hover:bg-neutral-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Schedule Interview</span>
                <span>→</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

