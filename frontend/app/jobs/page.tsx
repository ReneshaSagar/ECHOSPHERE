import React from 'react';
import { getDb } from '@/lib/db';
import Link from 'next/link';
import { NEXORA_LABS } from '@/lib/company';
import { 
  Sparkles, 
  MapPin, 
  Briefcase, 
  Clock, 
  ArrowRight, 
  Cpu, 
  Server, 
  Globe2, 
  ShieldCheck, 
  Zap, 
  Layers 
} from 'lucide-react';

export default async function JobBoardPage() {
  const db = getDb();
  const jobs = db.jobs;

  const getLocationBadge = (title: string) => {
    if (title.toLowerCase().includes('platform engineer') || title.toLowerCase().includes('singapore')) {
      return { city: 'Singapore', type: 'On-site / Hybrid' };
    }
    if (title.toLowerCase().includes('staff backend')) {
      return { city: 'Bengaluru / Remote (India)', type: 'Flexible' };
    }
    return { city: 'Bengaluru (HQ)', type: 'Hybrid' };
  };

  const getExperienceBadge = (title: string) => {
    if (title.toLowerCase().includes('staff')) return '7+ years';
    if (title.toLowerCase().includes('platform')) return '4–7 years';
    if (title.toLowerCase().includes('product manager')) return '4+ years';
    if (title.toLowerCase().includes('machine learning') || title.toLowerCase().includes('ai')) return '2–5 years';
    return '3–6 years';
  };

  const getDepartment = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('backend')) return 'Core Infrastructure';
    if (t.includes('full stack')) return 'Product Engineering';
    if (t.includes('machine learning') || t.includes('ai')) return 'AI Platform';
    if (t.includes('platform') || t.includes('devops')) return 'Cloud Platform & SRE';
    if (t.includes('product manager')) return 'Product Management';
    if (t.includes('designer')) return 'Product Design';
    return 'Engineering';
  };

  return (
    <div className="space-y-16">
      {/* Hero Header */}
      <div className="relative py-16 px-6 sm:px-10 rounded-3xl bg-[#0a0a0d] border border-white/[0.08] text-center overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Subtle radial ambient glows */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>series b · we're expanding</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-bold text-white tracking-tight">
            careers at <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">nexora labs</span>
          </h1>

          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            {NEXORA_LABS.tagline} We are building low-latency distributed platforms, developer primitives, and multimodal agent infrastructure.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-white/50">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{jobs.length} open roles</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <MapPin className="w-3.5 h-3.5 text-white/70" />
              <span>bengaluru (hq) · singapore · london</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>autonomous voice panel by omnipanel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Why Nexora Labs Culture Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-sans font-bold text-white flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-white/70" />
            <span>why build at nexora labs</span>
          </h2>
          <span className="text-xs font-mono text-white/40">culture & principles</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0a0a0d] p-6 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white font-mono font-bold text-xs flex items-center justify-center mb-4 group-hover:scale-110 transition">
              01
            </div>
            <h3 className="font-sans font-bold text-white text-base mb-1.5">hard engineering problems</h3>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Distributed consensus, low-latency streaming voice audio, and high-concurrency event loops processing millions of interactions.
            </p>
          </div>

          <div className="bg-[#0a0a0d] p-6 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white font-mono font-bold text-xs flex items-center justify-center mb-4 group-hover:scale-110 transition">
              02
            </div>
            <h3 className="font-sans font-bold text-white text-base mb-1.5">ai-native systems</h3>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Real-time multi-agent orchestration, grounded rubric evaluators, and automated profile synthesis on leading foundation models.
            </p>
          </div>

          <div className="bg-[#0a0a0d] p-6 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white font-mono font-bold text-xs flex items-center justify-center mb-4 group-hover:scale-110 transition">
              03
            </div>
            <h3 className="font-sans font-bold text-white text-base mb-1.5">global by default</h3>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Collaborate across 3 international hubs in Bengaluru, Singapore, and London with talent from across the globe.
            </p>
          </div>

          <div className="bg-[#0a0a0d] p-6 rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group">
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white font-mono font-bold text-xs flex items-center justify-center mb-4 group-hover:scale-110 transition">
              04
            </div>
            <h3 className="font-sans font-bold text-white text-base mb-1.5">deep ownership</h3>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Engineers own systems end-to-end—from initial design RFCs to production telemetry, observability, and customer outcomes.
            </p>
          </div>
        </div>
      </div>

      {/* Open Positions List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-sans font-bold text-white flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-white/70" />
            <span>open positions ({jobs.length})</span>
          </h2>
          <span className="text-xs font-mono text-white/40">select a role to review qualifications & apply</span>
        </div>

        <div className="grid gap-4">
          {jobs.map(job => {
            const loc = getLocationBadge(job.title);
            const exp = getExperienceBadge(job.title);
            const dept = getDepartment(job.title);

            return (
              <div 
                key={job.id} 
                className="bg-[#0a0a0d] p-6 sm:p-7 rounded-2xl border border-white/[0.08] hover:border-white/25 hover:shadow-[0_0_30px_rgba(255,255,255,0.04)] transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group"
              >
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-white/[0.05] text-white/80 border border-white/[0.08]">
                      {dept}
                    </span>
                    <span className="text-[11px] font-mono text-white/60 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-white/40" />
                      {loc.city} ({loc.type})
                    </span>
                    <span className="text-[11px] font-mono text-white/60 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-white/40" />
                      {exp}
                    </span>
                  </div>

                  <h3 className="text-xl font-sans font-bold text-white group-hover:text-white transition">
                    {job.title}
                  </h3>

                  <p className="text-white/50 text-sm line-clamp-2 leading-relaxed font-sans">
                    {job.description}
                  </p>
                </div>

                <Link 
                  href={`/jobs/${job.id}`} 
                  className="px-6 py-3 bg-white text-black hover:bg-neutral-200 font-sans font-semibold text-sm rounded-full shadow-[0_0_20px_rgba(255,255,255,0.15)] whitespace-nowrap shrink-0 flex items-center gap-2 transition transform group-hover:scale-102 w-full md:w-auto justify-center"
                >
                  <span>view details</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}

          {jobs.length === 0 && (
            <div className="text-center py-16 text-white/40 bg-[#0a0a0d] rounded-2xl border border-white/[0.08] font-mono text-sm">
              no open positions found.
            </div>
          )}
        </div>
      </div>

      {/* Hiring Process Transparency Banner */}
      <div className="bg-[#0a0a0d] rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.6)] space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-purple-400">
            <Sparkles className="w-4 h-4" />
            <span>evaluation process powered by omnipanel</span>
          </div>
          <h3 className="text-xl font-sans font-bold text-white">
            how our autonomous voice interview works
          </h3>
          <p className="text-xs sm:text-sm text-white/50 max-w-3xl leading-relaxed">
            At Nexora Labs, we value your time and technical depth. After you submit your resume and GitHub/LinkedIn links, our automated platform enriches your project background and invites qualified candidates to an interactive, multi-agent AI voice interview.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
          <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06] space-y-1.5">
            <div className="font-mono font-bold text-white text-sm flex items-center gap-2">
              <span className="text-white/40">01</span>
              <span>application & enrichment</span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              Automated project extraction from your resume and GitHub profile repository commits.
            </p>
          </div>

          <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06] space-y-1.5">
            <div className="font-mono font-bold text-white text-sm flex items-center gap-2">
              <span className="text-white/40">02</span>
              <span>multi-agent voice panel</span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              Live technical architecture and behavioral discussion with our AI interviewer panel.
            </p>
          </div>

          <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06] space-y-1.5">
            <div className="font-mono font-bold text-white text-sm flex items-center gap-2">
              <span className="text-white/40">03</span>
              <span>hiring committee review</span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              Objective scorecards and transcripts reviewed by Nexora engineering leads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

