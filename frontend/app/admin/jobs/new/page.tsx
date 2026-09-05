"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      requirements: formData.get('requirements'),
      stages: formData.get('stages')?.toString().split(',').map(s => s.trim()) || ['Technical', 'HR'],
      mcpServerUrl: formData.get('mcpServerUrl')
    };

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push('/admin/jobs');
      } else {
        alert("Failed to create job");
      }
    } catch (err) {
      alert("Error: " + err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/jobs" 
          className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all font-mono text-xs flex items-center gap-1.5"
        >
          <span>←</span> Back to Jobs
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Create Job Requisition</h1>
      </div>

      <div className="bg-[#0a0a0d] p-8 sm:p-10 rounded-3xl border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="inline-flex items-center gap-2 font-mono text-[11px] text-cyan-300 bg-cyan-500/10 px-3 py-0.5 rounded-full border border-cyan-500/20 mb-4">
          <span>⚡</span> NEW REQUISITION CONFIG
        </div>
        <p className="text-xs text-white/50 mb-8 leading-relaxed">
          Define role requirements, multi-stage evaluation criteria, and optional Model Context Protocol (MCP) integrations.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Job Title
            </label>
            <input 
              name="title" 
              required 
              className="w-full bg-[#030304] border border-white/[0.1] rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all placeholder:text-white/20" 
              placeholder="e.g. Distributed Systems Engineer" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Job Description
            </label>
            <textarea 
              name="description" 
              required 
              rows={4} 
              className="w-full bg-[#030304] border border-white/[0.1] rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all placeholder:text-white/20 leading-relaxed custom-scrollbar" 
              placeholder="High-level mission and charter for this engineering role..." 
            />
          </div>
          
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Requirements / Skills (One per line)
            </label>
            <textarea 
              name="requirements" 
              required 
              rows={4} 
              className="w-full bg-[#030304] border border-white/[0.1] rounded-2xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all placeholder:text-white/20 leading-relaxed custom-scrollbar" 
              placeholder="- Distributed consensus (Raft, Paxos)&#10;- Rust / Go systems development&#10;- High-throughput streaming" 
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Interview Stages (Comma separated)
            </label>
            <input 
              name="stages" 
              defaultValue="Technical Deep Dive, HR & Team Fit" 
              className="w-full bg-[#030304] border border-white/[0.1] rounded-2xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all" 
            />
            <p className="text-[11px] font-mono text-white/40 mt-1.5">Stages determine the multi-round prompt orchestrator structure.</p>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center justify-between">
              <span>MCP Server URL</span>
              <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">Optional Phase 11</span>
            </label>
            <input 
              name="mcpServerUrl" 
              type="url" 
              className="w-full bg-[#030304] border border-purple-500/20 rounded-2xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/30 transition-all placeholder:text-white/20" 
              placeholder="https://company-mcp.nexora.internal/sse" 
            />
            <p className="text-[11px] font-mono text-white/40 mt-1.5">Model Context Protocol endpoint for real-time internal architecture and ATS lookups.</p>
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
                  <span>Creating Requisition...</span>
                </>
              ) : (
                <>
                  <span>Create Job Posting</span>
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

