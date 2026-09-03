"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplicationActions({ applicationId, currentStatus }: { applicationId: string, currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        router.refresh(); // Refresh the server component
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      alert("Error: " + err);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="font-bold text-lg mb-4">Screening Actions</h3>
      <div className="flex gap-4">
        <button 
          onClick={() => updateStatus('SELECTED')}
          disabled={loading || currentStatus === 'SELECTED'}
          className="px-6 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50"
        >
          Select for Interview
        </button>
        
        <button 
          onClick={() => updateStatus('REJECTED')}
          disabled={loading || currentStatus === 'REJECTED'}
          className="px-6 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:opacity-50"
        >
          Reject Candidate
        </button>

        {currentStatus === 'SELECTED' && (
          <button 
            onClick={() => alert('Interview Scheduling (Phase 4) is coming soon!')}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 ml-auto"
          >
            Schedule Interview →
          </button>
        )}
      </div>
    </div>
  );
}
