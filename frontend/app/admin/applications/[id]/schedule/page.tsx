"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ScheduleInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then(p => setAppId(p.id));
  }, [params]);

  const handleSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!appId) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date');
    const time = formData.get('time');
    
    // Combine into ISO string
    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, scheduledAt })
      });

      if (res.ok) {
        router.push('/admin/interviews'); // Navigate to the interviews dashboard
      } else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Network Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Link href="/admin/jobs" className="text-gray-500 hover:underline mb-6 inline-block">← Back to Pipeline</Link>
      
      <div className="bg-white p-8 rounded-xl shadow border border-gray-200">
        <h1 className="text-2xl font-bold mb-6">Schedule AI Interview</h1>
        <p className="text-gray-600 mb-6">
          Pick a date and time for the candidate to complete their multi-agent AI interview.
        </p>

        <form onSubmit={handleSchedule} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Interview Date</label>
            <input name="date" type="date" required className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Interview Time</label>
            <input name="time" type="time" required className="w-full p-2 border rounded" />
          </div>

          <div className="pt-4 border-t mt-6">
            <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
