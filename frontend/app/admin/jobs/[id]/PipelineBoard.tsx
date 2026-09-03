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
  { id: 'APPLIED', label: 'Applied' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'SELECTED', label: 'Selected for Interview' },
  { id: 'REJECTED', label: 'Rejected' }
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
    <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4">
      {STAGES.map(stage => {
        const stageApps = applicants.filter(a => a.status === stage.id);
        
        return (
          <div key={stage.id} className="flex-1 min-w-[280px] bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700">{stage.label}</h3>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                {stageApps.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {stageApps.map(app => (
                <div key={app.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative group">
                  <div className="font-bold text-gray-900">{app.candidate?.name}</div>
                  <div className="text-sm text-gray-500 mb-3">{app.candidate?.email}</div>
                  
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                    <Link href={`/admin/applications/${app.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                      Review App
                    </Link>
                    
                    <div className="flex gap-1">
                      <select 
                        className="text-xs border rounded p-1 bg-gray-50 cursor-pointer"
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
                        className="block text-center w-full py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition"
                      >
                        Schedule Interview
                      </Link>
                    </div>
                  )}
                </div>
              ))}
              
              {stageApps.length === 0 && (
                <div className="text-center p-4 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
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
