"use client";
import React, { useState } from 'react';

export default function ScorecardViewer({ interviewId, initialScorecard }: { interviewId: string, initialScorecard?: any }) {
  const [scorecard, setScorecard] = useState<any>(initialScorecard);
  const [loading, setLoading] = useState(false);

  const generateScorecard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/evaluate-final`, { method: 'POST' });
      const data = await res.json();
      if (data.scorecard) {
        setScorecard(data.scorecard);
      } else {
        alert(data.error || 'Failed to generate scorecard');
      }
    } catch (e) {
      alert('Error generating scorecard');
    }
    setLoading(false);
  };

  if (!scorecard) {
    return (
      <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-8 text-center mt-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center mx-auto mb-4 text-xl">
            ⚖️
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Final Interview Scorecard</h3>
          <p className="text-xs text-white/50 mb-6 leading-relaxed">
            The interview has concluded. Generate the automated multi-agent synthesis and assessment of the entire transcript.
          </p>
          <button 
            onClick={generateScorecard}
            disabled={loading}
            className="bg-white text-black font-sans font-bold py-3 px-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-neutral-200 disabled:opacity-40 transition-all text-xs"
          >
            {loading ? 'Evaluating Transcript...' : 'Generate Comprehensive Scorecard →'}
          </button>
        </div>
      </div>
    );
  }

  const isNoHire = scorecard.overall_recommendation?.toLowerCase().includes('no hire');
  const isStrong = scorecard.overall_recommendation?.toLowerCase().includes('strong');

  return (
    <div className="bg-[#0a0a0d] border border-white/[0.08] rounded-3xl p-6 sm:p-8 mt-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500"></div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-white/[0.06] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] text-purple-300 bg-purple-500/10 px-3 py-0.5 rounded-full border border-purple-500/20 mb-2">
            <span>✦</span> AI EVALUATOR SYNTHESIS
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Final Candidate Scorecard</h3>
          <p className="text-white/40 text-xs">Multi-round automated behavioral and technical assessment</p>
        </div>
        <div className={`px-4 py-2 rounded-full font-mono font-bold text-xs tracking-wider border ${
          isNoHire ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' :
          isStrong ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
          'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
        }`}>
          {scorecard.overall_recommendation?.toUpperCase()}
        </div>
      </div>

      <div className="mb-8">
        <h4 className="font-mono text-xs font-bold text-white/50 mb-3 uppercase tracking-widest">Executive Summary</h4>
        <p className="text-white/80 text-xs leading-relaxed bg-[#030304] p-5 rounded-2xl border border-white/[0.08] font-sans">
          {scorecard.overall_summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Strengths */}
        <div className="p-5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
          <h4 className="font-mono text-xs font-bold text-emerald-300 mb-3 uppercase tracking-wider flex items-center gap-2">
            <span>✓</span> Key Strengths & Demonstrated Mastery
          </h4>
          <ul className="space-y-2">
            {scorecard.strengths?.map((s: string, i: number) => (
              <li key={i} className="flex gap-2.5 text-xs text-white/80 leading-relaxed">
                <span className="text-emerald-400 font-bold shrink-0">✦</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas of Concern */}
        <div className="p-5 bg-rose-950/20 border border-rose-500/20 rounded-2xl">
          <h4 className="font-mono text-xs font-bold text-rose-300 mb-3 uppercase tracking-wider flex items-center gap-2">
            <span>⚠️</span> Areas of Concern & Development Needs
          </h4>
          <ul className="space-y-2">
            {scorecard.weaknesses?.map((s: string, i: number) => (
              <li key={i} className="flex gap-2.5 text-xs text-white/80 leading-relaxed">
                <span className="text-rose-400 font-bold shrink-0">✦</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="font-mono text-xs font-bold text-white/50 mb-4 uppercase tracking-widest border-b border-white/[0.06] pb-2">
          Detailed Rubric Evaluation
        </h4>
        <div className="space-y-4">
          {scorecard.rubric_evaluations?.map((evalItem: any, i: number) => (
            <div key={i} className="bg-[#030304] rounded-2xl p-5 border border-white/[0.08]">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-white text-sm tracking-tight">{evalItem.pillar}</h5>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg 
                      key={star} 
                      className={`w-4 h-4 ${star <= evalItem.score ? 'text-amber-400' : 'text-white/10'}`} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/70 mb-3 leading-relaxed">{evalItem.feedback}</p>
              
              {evalItem.evidence && evalItem.evidence.length > 0 && (
                <div className="bg-white/[0.02] border-l-2 border-indigo-400 p-3 rounded-r-xl text-xs text-white/60 italic font-mono">
                  <strong className="text-indigo-300 not-italic">Transcript Evidence:</strong> "{evalItem.evidence[0]}"
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

