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
        router.push('/admin/schedule'); // Navigate to the interviews dashboard
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
    <div className="max-w-xl mx-auto mt-8 pb-16">
      <Link 
        href="/admin/jobs" 
        className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all font-mono text-xs inline-flex items-center gap-1.5 mb-6"
      >
        <span>←</span> Back to Jobs & Pipeline
      </Link>
      
      <div className="bg-[#0a0a0d] p-8 sm:p-10 rounded-3xl border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] text-cyan-300 bg-cyan-500/10 px-3 py-0.5 rounded-full border border-cyan-500/20 mb-4">
          <span>📅</span> SESSION DISPATCH
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Schedule AI Interview</h1>
        <p className="text-xs text-white/50 mb-8 leading-relaxed">
          Select a date and time to orchestrate the multi-agent AI interview panel and dispatch candidate access credentials.
        </p>

        <form onSubmit={handleSchedule} className="space-y-5">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Interview Date
            </label>
            <input 
              name="date" 
              type="date" 
              required 
              className="w-full bg-[#030304] border border-white/[0.1] rounded-2xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Interview Time (Local)
            </label>
            <input 
              name="time" 
              type="time" 
              required 
              className="w-full bg-[#030304] border border-white/[0.1] rounded-2xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all" 
            />
          </div>

          <div className="pt-6 border-t border-white/[0.06]">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3.5 bg-white text-black font-sans font-bold text-xs rounded-full hover:bg-neutral-200 disabled:opacity-40 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  <span>Scheduling Session...</span>
                </>
              ) : (
                <>
                  <span>Confirm Schedule & Generate Blueprint</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

