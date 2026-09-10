import React from 'react';

interface LogEntry {
  time: string;
  comp: string;
  msg: string;
}

interface SystemTelemetryProps {
  logs: LogEntry[];
}

export default function SystemTelemetry({ logs }: SystemTelemetryProps) {
  return (
    <div className="w-full md:w-1/3 flex flex-col gap-6">
      <div className="bg-[#0a0a0d] rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-white/[0.08] flex-1 flex flex-col overflow-hidden max-h-[92vh]">
        <div className="p-3 bg-[#030304]/80 border-b border-white/[0.06]">
          <h3 className="font-bold text-white/60 text-[11px] font-mono uppercase tracking-wider">Turn Arbiter & System Telemetry</h3>
        </div>
        <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[10px] custom-scrollbar">
          {logs.map((log, i) => (
            <div key={i} className="text-white/70 border-b border-white/[0.04] pb-1">
              <span className="text-white/30 mr-2">[{log.time}]</span>
              <span className="text-cyan-400 font-bold mr-1.5">{log.comp}:</span>
              <span className="text-emerald-400/90">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
