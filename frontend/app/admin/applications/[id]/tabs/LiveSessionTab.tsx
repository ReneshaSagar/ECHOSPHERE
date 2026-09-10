import { Shield, CheckCircle } from 'lucide-react';

interface SuspiciousEvent {
  timestamp: string;
  type: string;
  details: string;
  severity?: string;
  score_impact?: number;
}

function formatTimeIST(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST';
  } catch { return timestamp; }
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  HIGH: { color: 'text-rose-300', bg: 'bg-rose-950/40', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  MEDIUM: { color: 'text-amber-300', bg: 'bg-amber-950/30', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  LOW: { color: 'text-blue-300', bg: 'bg-blue-950/30', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  INFO: { color: 'text-white/40', bg: 'bg-white/[0.02]', border: 'border-white/[0.06]', dot: 'bg-white/20' },
};

interface LiveSessionTabProps {
  interview: any;
  suspiciousEvents: SuspiciousEvent[];
  dedupedEvents: { ev: SuspiciousEvent; count: number }[];
  highCount: number;
}

export default function LiveSessionTab({ interview, suspiciousEvents, dedupedEvents, highCount }: LiveSessionTabProps) {
  if (!interview) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Status', value: interview.status || 'SCHEDULED', color: 'text-white' },
          { label: 'High Violations', value: `${highCount}`, color: highCount > 0 ? 'text-rose-400' : 'text-emerald-400' },
          { label: 'Total Events', value: `${suspiciousEvents.length}`, color: 'text-amber-400' },
          { label: 'Integrity Score', value: `${Math.max(0, 100 - suspiciousEvents.reduce((s: number, e: SuspiciousEvent) => s + Math.abs(e.score_impact || 0), 0))}/100`, color: 'text-cyan-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0a0a0d] border border-white/[0.08] rounded-2xl p-4 text-center">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Dedup Event Log */}
      {dedupedEvents.length > 0 ? (
        <div className="bg-[#0a0a0d] rounded-3xl border border-rose-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-rose-400 mb-5 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Violation Timeline
          </h3>
          <div className="space-y-2.5">
            {dedupedEvents.map(({ ev, count }, i) => {
              const sc = SEVERITY_CONFIG[ev.severity || 'INFO'] || SEVERITY_CONFIG.INFO;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl border ${sc.bg} ${sc.border}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.border} ${sc.color}`}>{ev.severity || 'INFO'}</span>
                      <span className="text-xs font-bold text-white">{ev.type.replace(/_/g, ' ')}</span>
                      {count > 1 && (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-white/[0.06] border border-white/[0.1] text-white/60 rounded-full">×{count}</span>
                      )}
                      {ev.score_impact !== 0 && ev.score_impact !== undefined && (
                        <span className="text-[9px] font-mono text-rose-400 ml-auto">{ev.score_impact} pts</span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5">{ev.details}</p>
                    <p className="text-[10px] font-mono text-white/30 mt-0.5" suppressHydrationWarning>{formatTimeIST(ev.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#0a0a0d] rounded-3xl border border-emerald-500/20 p-10 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-bold">No violations detected</p>
          <p className="text-xs text-white/40 mt-1">Interview session completed with clean behavioral telemetry.</p>
        </div>
      )}
    </div>
  );
}
