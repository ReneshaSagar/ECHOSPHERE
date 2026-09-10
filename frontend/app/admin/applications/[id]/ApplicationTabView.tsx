'use client';

import { useState } from 'react';
import { User, Brain, Shield } from 'lucide-react';
import ProfileTab from './tabs/ProfileTab';
import IntelligenceTab from './tabs/IntelligenceTab';
import LiveSessionTab from './tabs/LiveSessionTab';

interface SuspiciousEvent {
  timestamp: string;
  type: string;
  details: string;
  severity?: string;
  score_impact?: number;
}

interface ApplicationTabViewProps {
  application: any;
  candidate: any;
  candidateContext: any;
  job: any;
  interview: any;
  blueprint: any;
  parsedBlueprint: any;
  hasSuspiciousEvents: boolean;
}

function deduplicateEvents(events: SuspiciousEvent[]) {
  const groups: { ev: SuspiciousEvent; count: number }[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.ev.type === ev.type && last.ev.severity === ev.severity) {
      last.count++;
    } else {
      groups.push({ ev, count: 1 });
    }
  }
  return groups;
}

export default function ApplicationTabView({
  application, candidate, candidateContext, job, interview, blueprint, parsedBlueprint, hasSuspiciousEvents
}: ApplicationTabViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'intelligence' | 'session'>('profile');

  const suspiciousEvents: SuspiciousEvent[] = interview?.suspiciousEvents || [];
  const dedupedEvents = deduplicateEvents(suspiciousEvents);
  const highCount = suspiciousEvents.filter((e: SuspiciousEvent) => e.severity === 'HIGH').length;

  const tabs = [
    { id: 'profile', label: 'Candidate Profile', icon: User, color: 'cyan' },
    { id: 'intelligence', label: 'Interview Intelligence', icon: Brain, color: 'purple' },
    ...(interview ? [{ id: 'session', label: 'Live Session', icon: Shield, color: 'rose' }] : []),
  ] as const;

  return (
    <div className="space-y-6">
      {/* Proctoring Banner */}
      {hasSuspiciousEvents && (
        <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 text-rose-300 font-bold text-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            ⚠️ Proctoring Violations Detected During Interview
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full font-mono text-[10px] font-bold">{highCount} HIGH SEVERITY</span>
            <span className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] text-white/50 rounded-full font-mono text-[10px]">{suspiciousEvents.length} total</span>
            <button onClick={() => setActiveTab('session')} className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 rounded-full font-mono text-[10px] font-bold transition-colors">
              View Logs →
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-4 flex-wrap">
        {tabs.map(({ id, label, icon: Icon, color }) => {
          const isActive = activeTab === id;
          const activeClasses = {
            cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          }[color];
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-5 py-2.5 text-xs font-bold font-mono tracking-widest uppercase rounded-full transition-all flex items-center gap-2 border ${
                isActive ? activeClasses : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'session' && hasSuspiciousEvents && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'profile' && (
        <ProfileTab
          application={application}
          candidate={candidate}
          candidateContext={candidateContext}
          job={job}
        />
      )}

      {activeTab === 'intelligence' && (
        <IntelligenceTab
          candidateContext={candidateContext}
          interview={interview}
          blueprint={blueprint}
          parsedBlueprint={parsedBlueprint}
          candidateName={candidate?.name || 'Candidate'}
        />
      )}

      {activeTab === 'session' && (
        <LiveSessionTab
          interview={interview}
          suspiciousEvents={suspiciousEvents}
          dedupedEvents={dedupedEvents}
          highCount={highCount}
        />
      )}
    </div>
  );
}
