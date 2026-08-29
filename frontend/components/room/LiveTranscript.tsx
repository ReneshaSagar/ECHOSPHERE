'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TranscriptEntry } from '../../lib/types';
import Badge from '../ui/Badge';

interface LiveTranscriptProps {
  entries: TranscriptEntry[];
}

export default function LiveTranscript({ entries }: LiveTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 italic p-6">
        Interview will begin shortly...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
      <AnimatePresence initial={false}>
        {entries.map((entry, idx) => {
          const isLatest = idx === entries.length - 1;
          return (
            <motion.div 
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${entry.speaker === 'candidate' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {entry.speaker !== 'candidate' && (
                  <Badge variant={entry.speaker as any}>{entry.speaker.toUpperCase()}</Badge>
                )}
                <span className="text-xs text-slate-400 font-mono">{formatTime(entry.timestamp)}</span>
                {entry.speaker === 'candidate' && (
                  <Badge variant="candidate">YOU</Badge>
                )}
              </div>
              
              <div className={`max-w-[85%] p-3 rounded-2xl break-words whitespace-pre-wrap ${entry.speaker === 'candidate' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-900 rounded-tl-sm shadow-sm border border-slate-200'}`}>
                {isLatest && entry.speaker === 'candidate' ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {entry.text}
                  </motion.span>
                ) : (
                  <span>{entry.text}</span>
                )}
              </div>
              
              {entry.speaker === 'candidate' && entry.vaguenessScore !== undefined && (
                <div className="mt-1">
                  {entry.vaguenessScore > 70 && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">High Vagueness</span>
                  )}
                  {entry.vaguenessScore < 30 && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Specific</span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
