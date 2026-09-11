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
          candidate={candidate}
          job={job}
          suspiciousEvents={suspiciousEvents}
          dedupedEvents={dedupedEvents}
          highCount={highCount}
        />
      )}
    </div>
  );
}
