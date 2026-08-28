'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '@/lib/types';

interface Props {
  entries: TranscriptEntry[];
}

/** Hash a string to a consistent hex color */
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const colors = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#84cc16'];
  return colors[Math.abs(hash) % colors.length];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function LiveTranscript({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {entries.length === 0 && (
        <div style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>
          Transcript will appear here...
        </div>
      )}
      {entries.map((entry) => {
        const isCandidate = entry.speaker === 'candidate';
        const color = isCandidate ? '#94a3b8' : hashColor(entry.speaker);
        return (
          <div key={entry.id} className={`flex gap-2 ${isCandidate ? 'flex-row-reverse' : 'flex-row'}`}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${color}22`,
                border: `1.5px solid ${color}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6rem',
                fontWeight: 700,
                color,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {entry.speaker.slice(0, 2).toUpperCase()}
            </div>
            <div className={`flex flex-col gap-0.5 max-w-[85%] ${isCandidate ? 'items-end' : 'items-start'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color }}>{entry.speaker}</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-subtle)' }}>{formatTime(entry.timestamp)}</span>
                {entry.vaguenessScore !== undefined && entry.vaguenessScore > 60 && (
                  <span className="pill pill-amber" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>vague</span>
                )}
              </div>
              <div
                style={{
                  background: isCandidate ? 'rgba(255,255,255,0.05)' : `${color}12`,
                  border: `1px solid ${color}22`,
                  borderRadius: isCandidate ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  color: 'var(--text)',
                  lineHeight: 1.5,
                }}
              >
                {entry.text}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
