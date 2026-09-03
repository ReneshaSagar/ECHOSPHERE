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
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center mt-8 shadow-sm">
        <h3 className="text-xl font-bold mb-2">Final Interview Scorecard</h3>
        <p className="text-gray-600 mb-6">The interview has concluded. Generate the AI assessment of the full multi-round transcript.</p>
        <button 
          onClick={generateScorecard}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow disabled:opacity-50 transition"
        >
          {loading ? 'Evaluating Transcript...' : 'Generate Comprehensive Scorecard'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 mt-8 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Final Scorecard</h3>
          <p className="text-gray-500 text-sm">AI-Generated Assessment</p>
        </div>
        <div className={`px-4 py-2 rounded-full font-bold text-sm tracking-wide ${
          scorecard.overall_recommendation.includes('No Hire') ? 'bg-red-100 text-red-800' :
          scorecard.overall_recommendation.includes('Strong') ? 'bg-green-100 text-green-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {scorecard.overall_recommendation.toUpperCase()}
        </div>
      </div>

      <div className="mb-8">
        <h4 className="font-bold text-gray-700 mb-2 uppercase text-sm tracking-widest">Executive Summary</h4>
        <p className="text-gray-800 leading-relaxed bg-gray-50 p-4 rounded border border-gray-100">{scorecard.overall_summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Key Strengths
          </h4>
          <ul className="space-y-2">
            {scorecard.strengths.map((s: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-green-500">✦</span> {s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Areas of Concern
          </h4>
          <ul className="space-y-2">
            {scorecard.weaknesses.map((s: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="text-red-500">✦</span> {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-gray-700 mb-4 uppercase text-sm tracking-widest border-b pb-2">Detailed Rubric Evaluation</h4>
        <div className="space-y-6">
          {scorecard.rubric_evaluations.map((evalItem: any, i: number) => (
            <div key={i} className="bg-gray-50 rounded-lg p-5 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-gray-900">{evalItem.pillar}</h5>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <svg key={star} className={`w-5 h-5 ${star <= evalItem.score ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-3">{evalItem.feedback}</p>
              
              <div className="bg-white border-l-2 border-indigo-400 p-3 text-sm text-gray-600 italic">
                <strong>Evidence:</strong> "{evalItem.evidence[0]}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
