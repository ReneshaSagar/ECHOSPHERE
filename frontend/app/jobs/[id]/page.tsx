import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import { NEXORA_LABS } from '@/lib/company';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';

export default async function PublicJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const db = getDb();
  const job = db.jobs.find(j => j.id === resolvedParams.id);
  
  if (!job) {
    return (
      <div className="text-center py-20 bg-[#0a0a0d] rounded-2xl border border-white/[0.08] font-sans">
        <h2 className="text-2xl font-bold text-white mb-2">Position Not Found</h2>
        <p className="text-white/50 text-sm mb-6">The role you are looking for may have been filled or updated.</p>
        <Link 
          href="/jobs" 
          className="px-6 py-3 bg-white text-black font-semibold text-sm rounded-full hover:bg-neutral-200 transition"
        >
          ← return to all open positions
        </Link>
      </div>
    );
  }

  const isSingapore = job.title.toLowerCase().includes('singapore') || job.title.toLowerCase().includes('platform engineer');
  const isRemote = job.title.toLowerCase().includes('staff backend');
  const locationLabel = isSingapore ? 'Singapore (APAC Hub)' : isRemote ? 'Bengaluru (HQ) / Remote (India)' : 'Bengaluru (HQ, India)';

  let stages: string[] = [];
  try {
    stages = JSON.parse(job.stagesJson);
  } catch (e) {
    stages = ['Technical Architecture', 'System Scale', 'Engineering Culture'];
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <div>
        <Link 
          href="/jobs" 
          className="inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white transition group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>all open positions</span>
        </Link>
      </div>
      
      {/* Main Job Card */}
      <div className="bg-[#0a0a0d] p-8 sm:p-12 rounded-3xl border border-white/[0.08] space-y-10 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        {/* Header Title & Badges */}
        <div className="border-b border-white/[0.08] pb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-3 py-1 rounded-full bg-white/[0.05] text-white/90 border border-white/[0.1]">
              nexora labs
            </span>
            <span className="text-[11px] font-mono text-white/70 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-white/40" />
              {locationLabel}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              full-time
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight leading-tight">
            {job.title}
          </h1>

          <p className="text-xs font-mono text-white/40">
            series b · real-time ai & developer infrastructure platform
          </p>
        </div>

        {/* Job Content Sections */}
        <div className="space-y-10 text-white/70">
          {/* About the Role */}
          <section className="space-y-3">
            <h2 className="text-lg font-sans font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-white/70" />
              <span>about the role</span>
            </h2>
            <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-white/60 font-sans">
              {job.description}
            </div>
          </section>
          
          {/* Requirements */}
          <section className="space-y-3">
            <h2 className="text-lg font-sans font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>qualifications & technical background</span>
            </h2>
            <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/[0.06] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-white/70">
              {job.requirements}
            </div>
          </section>

          {/* Interview Stages Process */}
          <section className="space-y-3">
            <h2 className="text-lg font-sans font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>interview process (powered by omnipanel)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stages.map((stage: string, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs">
                  <div className="font-mono font-bold text-purple-300 mb-1.5 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] flex items-center justify-center font-mono border border-purple-500/30">
                      {idx + 1}
                    </span>
                    <span>stage {idx + 1}</span>
                  </div>
                  <div className="font-sans font-semibold text-white">{stage}</div>
                </div>
              ))}
            </div>
          </section>

          {/* About Nexora Labs Box */}
          <section className="bg-white/[0.02] p-6 rounded-2xl border border-white/[0.06] space-y-2 text-xs text-white/60">
            <h3 className="font-sans font-bold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-white/80" />
              <span>about nexora labs</span>
            </h3>
            <p className="leading-relaxed font-sans">
              {NEXORA_LABS.description} We value deep ownership, clear architectural thinking, and high-craft code. Our evaluation process uses OmniPanel's autonomous voice intelligence to provide an objective, interactive technical conversation.
            </p>
          </section>
        </div>
        
        {/* Bottom CTA Button */}
        <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-xs font-mono text-white/40">
            ready to build high-scale systems with us?
          </div>

          <Link 
            href={`/jobs/${job.id}/apply`} 
            className="w-full sm:w-auto px-10 py-4 bg-white text-black hover:bg-neutral-200 font-sans font-bold rounded-full text-base shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2 group"
          >
            <span>apply for this position</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

