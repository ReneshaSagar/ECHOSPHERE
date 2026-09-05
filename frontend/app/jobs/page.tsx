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
    <div className="space-y-12">
      {/* Hero Header */}
      <div className="text-center py-12 px-6 bg-gradient-to-b from-blue-50/80 via-white to-white rounded-3xl border border-blue-100 shadow-xs relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Series B • We're Hiring</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight mb-4">
          Careers at Nexora Labs
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {NEXORA_LABS.tagline} Join our team building distributed real-time platforms, developer primitives, and AI inference systems.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>7 Active Engineering & Product Roles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Bengaluru (HQ) • Singapore • London</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Autonomous AI Voice Interview by OmniPanel</span>
          </div>
        </div>
      </div>

      {/* Why Nexora Labs Culture Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <span>Why Build at Nexora Labs</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs mb-3">
              01
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Work on Hard Problems</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Design distributed consensus, low-latency streaming audio, and high-concurrency event loops handling millions of daily interactions.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs mb-3">
              02
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">AI-Native Systems</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pioneer real-time multimodal agents, grounded evaluation rubrics, and automated profile synthesis on cutting-edge models.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-3">
              03
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Global by Default</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Collaborate across 3 international hubs in Bengaluru, Singapore, and London with team members spanning 20+ nationalities.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs mb-3">
              04
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Deep Ownership</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Engineers own their systems end-to-end—from initial design RFCs to production metrics, observability, and customer impact.
            </p>
          </div>
        </div>
      </div>

      {/* Open Positions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span>Open Positions ({jobs.length})</span>
          </h2>
          <span className="text-xs text-gray-500 font-medium">Click any position to review details & apply</span>
        </div>

        <div className="grid gap-4">
          {jobs.map(job => {
            const loc = getLocationBadge(job.title);
            const exp = getExperienceBadge(job.title);
            const dept = getDepartment(job.title);

            return (
              <div 
                key={job.id} 
                className="bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-5 group"
              >
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {dept}
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-500" />
                      {loc.city} ({loc.type})
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {exp}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                    {job.title}
                  </h3>

                  <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <Link 
                  href={`/jobs/${job.id}`} 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs hover:shadow-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition transform group-hover:translate-x-0.5 w-full md:w-auto justify-center"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}

          {jobs.length === 0 && (
            <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-gray-200">
              No open positions found.
            </div>
          )}
        </div>
      </div>

      {/* Hiring Process Transparency Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Our Evaluation Process Powered by OmniPanel</span>
        </h3>
        <p className="text-xs text-gray-300 max-w-3xl leading-relaxed mb-6">
          At Nexora Labs, we value your time and codecraft. After you submit your resume and GitHub/LinkedIn links, our automated platform enriches your projects and invites qualified candidates to an interactive, multi-agent AI voice interview with our technical leads.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <div className="font-bold text-blue-400 mb-1">1. Application & Enrichment</div>
            <div className="text-gray-400">Automated project extraction from your resume and GitHub profile.</div>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <div className="font-bold text-purple-400 mb-1">2. Multi-Agent Voice Panel</div>
            <div className="text-gray-400">Live technical and behavioral discussion with our AI interviewer panel.</div>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <div className="font-bold text-emerald-400 mb-1">3. Hiring Committee Review</div>
            <div className="text-gray-400">Objective scorecards and transcripts reviewed by Nexora engineering leads.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
