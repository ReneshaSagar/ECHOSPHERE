"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Applicant = {
  id: string;
  status: string;
  candidate?: {
    name: string;
    email: string;
  };
};

const STAGES = [
  { id: 'APPLIED', label: 'Applied', color: 'text-white/70' },
  { id: 'UNDER_REVIEW', label: 'Under Review', color: 'text-cyan-300' },
  { id: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled', color: 'text-indigo-300' },
  { id: 'SELECTED', label: 'Selected / Offer', color: 'text-emerald-300' },
  { id: 'CONSIDER_FOR_OTHER_ROLES', label: 'Talent Pool', color: 'text-amber-300' },
  { id: 'REJECTED', label: 'Rejected', color: 'text-rose-300' }
];

export default function PipelineBoard({ applicants }: { applicants: Applicant[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const updateStatus = async (appId: string, newStatus: string) => {
    setLoadingId(appId);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      alert("Error: " + err);
    }
    setLoadingId(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 overflow-x-auto pb-6 custom-scrollbar">
      {STAGES.map(stage => {
        const stageApps = applicants.filter(a => a.status === stage.id);
        
        return (
          <div key={stage.id} className="flex-1 min-w-[280px] bg-[#0a0a0d] rounded-3xl p-4 border border-white/[0.08] shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className={`font-sans font-bold text-xs uppercase tracking-wider ${stage.color}`}>{stage.label}</h3>
              <span className="bg-white/[0.06] text-white/70 font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                {stageApps.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {stageApps.map(app => (
                <div key={app.id} className="bg-[#030304] p-4 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all relative group shadow-sm">
                  <div className="font-bold text-white text-sm tracking-tight">{app.candidate?.name}</div>
                  <div className="text-xs text-white/40 mb-3 font-mono truncate">{app.candidate?.email}</div>
                  
                  <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/[0.06]">
                    <Link href={`/admin/applications/${app.id}`} className="text-xs text-cyan-400 hover:underline font-medium">
                      Review App →
                    </Link>
                    
                    <div className="flex gap-1">
                      <select 
                        className="text-[11px] font-mono border border-white/[0.1] rounded-xl px-2 py-1 bg-black text-white/80 focus:outline-none focus:border-white/30 cursor-pointer"
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        disabled={loadingId === app.id}
                      >
                        {STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {app.status === 'SELECTED' && (
                    <div className="mt-3">
                      <Link 
                        href={`/admin/applications/${app.id}/schedule`}
                        className="block text-center w-full py-2 bg-white text-black font-sans font-bold text-xs rounded-full hover:bg-neutral-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                      >
                        Schedule Interview →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
              
              {stageApps.length === 0 && (
                <div className="text-center py-8 text-xs font-mono text-white/30 border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]">
                  No candidates
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

