"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getReport } from "@/lib/api";
import { Download, RotateCcw, AlertTriangle, Target, Briefcase, Zap, AlertOctagon, CheckCircle } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

export default function ReportPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await getReport(params.sessionId);
        setReport(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [params.sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-b-2 border-[#a855f7] rounded-full"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center text-white">
        <AlertOctagon size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Report Not Found</h2>
        <button onClick={() => router.push('/')} className="text-[#a855f7] hover:underline">Go Home</button>
      </div>
    );
  }

  const radarData = report.pillar_scores ? Object.keys(report.pillar_scores).map(key => ({
    subject: key.replace(/_/g, ' ').toUpperCase(),
    A: report.pillar_scores[key].score || 0,
    fullMark: 10
  })) : [];

  const recColor = report.overall_recommendation === 'STRONG HIRE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' :
                   report.overall_recommendation === 'LEAN HIRE' ? 'bg-amber-500/20 text-amber-400 border-amber-500' :
                   'bg-red-500/20 text-red-400 border-red-500';

  const atsScore = report.ats_score || 0;
  const interviewScore = 100 - (report.avg_vagueness_score || 0) * 10;
  const compositeScore = report.final_composite_score || 0;

  return (
    <div className="min-h-screen bg-[#080810] text-gray-100 font-outfit p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 md:p-8 rounded-2xl border border-gray-800 bg-gray-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7c3aed] blur-[120px] opacity-10 pointer-events-none" />
          
          <div className="z-10">
            <h1 className="text-sm font-medium text-gray-400 tracking-wider uppercase mb-1">Final Report</h1>
            <h2 className="text-3xl font-bold text-white mb-4">{report.job_title || 'Candidate Evaluation'}</h2>
            
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${recColor}`}>
              <CheckCircle size={16} /> {report.overall_recommendation || 'PENDING'}
            </div>
            
            <p className="mt-4 text-gray-300 text-sm max-w-2xl leading-relaxed">
              {report.recommendation_reasoning}
            </p>
          </div>

          <div className="flex flex-col gap-3 z-10 shrink-0">
            <button onClick={() => window.print()} className="btn-primary bg-gray-800 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 justify-center transition-colors">
              <Download size={16} /> Download PDF
            </button>
            <button onClick={() => router.push('/')} className="btn-primary bg-[#7c3aed] hover:bg-[#a855f7] text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 justify-center transition-colors">
              <RotateCcw size={16} /> New Interview
            </button>
          </div>
        </motion.div>

        {report.suspected_ai_answers && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400">
            <AlertTriangle className="animate-pulse" />
            <div>
              <h4 className="font-bold">SUSPECTED AI RESPONSES DETECTED</h4>
              <p className="text-xs opacity-80">High vagueness or latency patterns match AI assistant usage.</p>
            </div>
          </motion.div>
        )}

        {/* Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScoreCard title="ATS Resume Score" score={atsScore} sub="Parsed from CV" color={atsScore > 70 ? '#10b981' : atsScore > 40 ? '#f59e0b' : '#ef4444'} />
          <ScoreCard title="Interview Performance" score={interviewScore} sub="Behavioral & Tech" color="#a855f7" />
          <ScoreCard title="Composite Score" score={compositeScore} sub="Resume 30% + Interview 70%" color="#3b82f6" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Radar Chart */}
          <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-gray-800 bg-gray-900/50 flex flex-col items-center justify-center">
            <h3 className="w-full text-lg font-bold text-white mb-4">Competency Map</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Radar name="Candidate" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pillar Bars */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 bg-gray-900/50">
             <h3 className="text-lg font-bold text-white mb-6">Pillar Breakdown</h3>
             <div className="space-y-5">
               {report.pillar_scores && Object.entries(report.pillar_scores).map(([key, val]: any) => (
                 <div key={key}>
                   <div className="flex justify-between text-sm mb-1">
                     <span className="text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                     <span className="font-bold text-[#a855f7]">{val.score || 0}/10</span>
                   </div>
                   <div className="w-full bg-gray-800 rounded-full h-2">
                     <div className="bg-[#a855f7] h-2 rounded-full" style={{ width: `${((val.score || 0) / 10) * 100}%` }}></div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          
        </div>

        {/* Text Analyses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-gray-800 bg-gray-900/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Target size={18} className="text-green-400" /> Strengths</h3>
            <ul className="space-y-3">
              {report.strengths?.map((s: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />{s}</li>
              ))}
            </ul>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-gray-800 bg-gray-900/50">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Zap size={18} className="text-amber-400" /> Areas for Improvement</h3>
            <ul className="space-y-3">
              {report.improvement_areas?.map((s: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />{s}</li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

function ScoreCard({ title, score, sub, color }: { title: string, score: number, sub: string, color: string }) {
  return (
    <div className="glass-card p-5 rounded-xl border border-gray-800 bg-gray-900/50 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
      <span className="text-sm font-medium text-gray-400 mb-2">{title}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
        <span className="text-sm text-gray-500">/ 100</span>
      </div>
      <span className="text-xs text-gray-500 mt-1">{sub}</span>
    </div>
  );
}
