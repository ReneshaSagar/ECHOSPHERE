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
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Position Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">The role you are looking for may have been filled or updated.</p>
        <Link href="/jobs" className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition">
          ← Return to All Open Positions
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Open Roles</span>
        </Link>
      </div>
      
      {/* Main Job Card */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xs border border-gray-200 space-y-8">
        {/* Header Title & Badges */}
        <div className="border-b border-gray-100 pb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Nexora Labs
            </span>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gray-500" />
              {locationLabel}
            </span>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Full-time
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
            {job.title}
          </h1>

          <p className="text-xs text-gray-500">
            Series B • Real-Time AI & Developer Infrastructure Platform
          </p>
        </div>

        {/* Job Content Sections */}
        <div className="space-y-8 text-gray-700">
          {/* About the Role */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>About the Role</span>
            </h2>
            <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-gray-600">
              {job.description}
            </div>
          </section>
          
          {/* Requirements */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Qualifications & Technical Background</span>
            </h2>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-gray-700">
              {job.requirements}
            </div>
          </section>

          {/* Interview Stages Process */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Interview Process (Powered by OmniPanel)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stages.map((stage: string, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 text-xs">
                  <div className="font-bold text-purple-800 mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-800 text-[10px] flex items-center justify-center font-black">
                      {idx + 1}
                    </span>
                    <span>Stage {idx + 1}</span>
                  </div>
                  <div className="font-semibold text-gray-900">{stage}</div>
                </div>
              ))}
            </div>
          </section>

          {/* About Nexora Labs Box */}
          <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-2 text-xs text-blue-900">
            <h3 className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>About Nexora Labs</span>
            </h3>
            <p className="leading-relaxed">
              {NEXORA_LABS.description} We value deep ownership, clear architectural thinking, and high-craft code. Our evaluation process uses OmniPanel's autonomous voice intelligence to provide an objective, interactive technical conversation.
            </p>
          </section>
        </div>
        
        {/* Bottom CTA Button */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500">
            Ready to build high-scale infrastructure with us?
          </div>

          <Link 
            href={`/jobs/${job.id}/apply`} 
            className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Apply for this Position</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
