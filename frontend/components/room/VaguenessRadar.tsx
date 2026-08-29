'use client';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { CheckCircle2 } from 'lucide-react';

interface VaguenessRadarProps {
  vaguenessScore: number;
  difficultyLevel: number;
  coveredPillars: string[];
  buzzwordsDetected: string[];
}

const allPillars = [
  { id: 'architecture', label: 'Architecture' },
  { id: 'product_sense', label: 'Product Sense' },
  { id: 'scalability', label: 'Scalability' },
  { id: 'clarity', label: 'Clarity' },
  { id: 'ownership', label: 'Ownership' },
];

export default function VaguenessRadar({ vaguenessScore, difficultyLevel, coveredPillars, buzzwordsDetected }: VaguenessRadarProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (vaguenessScore / 100) * circumference;
  
  let scoreColor = '#10B981'; // green
  if (vaguenessScore >= 30) scoreColor = '#F59E0B'; // yellow
  if (vaguenessScore >= 70) scoreColor = '#EF4444'; // red

  return (
    <Card className="p-5 flex flex-col gap-6 w-full max-w-xs mx-auto">
      <div className="flex flex-col items-center">
        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Vagueness Score</h4>
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="transform -rotate-90 w-full h-full">
            <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200 dark:text-slate-700" />
            <motion.circle 
              cx="64" cy="64" r={radius} 
              stroke={scoreColor} strokeWidth="8" fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5 }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-3xl font-bold text-slate-900 dark:text-white">
            {Math.round(vaguenessScore)}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Difficulty</h4>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div 
              key={level} 
              className={`flex-1 h-2 rounded-sm transition-colors duration-300 ${level <= difficultyLevel ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Pillars Covered</h4>
        <ul className="space-y-2 text-sm">
          {allPillars.map(pillar => {
            const isCovered = coveredPillars.includes(pillar.id);
            return (
              <li key={pillar.id} className="flex items-center gap-2">
                <CheckCircle2 className={`w-5 h-5 transition-colors ${isCovered ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-700'}`} />
                <span className={isCovered ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>{pillar.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {buzzwordsDetected.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Buzzwords Detected</h4>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {buzzwordsDetected.map((word, i) => (
              <span key={i} className="text-[10px] px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800/30">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
