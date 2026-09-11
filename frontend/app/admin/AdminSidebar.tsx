"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Briefcase, 
  Sparkles, 
  Radio, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Bot
} from 'lucide-react';

export default function AdminSidebar({ 
  applicantCount, 
  scheduledCount, 
  jobCount 
}: { 
  applicantCount: number; 
  scheduledCount: number; 
  jobCount: number; 
}) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: 'Applicants ATS',
      href: '/admin/applicants',
      icon: Users,
      badge: applicantCount,
      badgeColor: 'bg-white/[0.08] text-white/90 border border-white/[0.1]'
    },
    {
      name: 'Schedule & Rooms',
      href: '/admin/schedule',
      icon: Calendar,
      badge: scheduledCount,
      badgeColor: 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
    },
    {
      name: 'Job Requisitions',
      href: '/admin/jobs',
      icon: Briefcase,
      badge: jobCount,
      badgeColor: 'bg-white/[0.04] text-white/60 border border-white/[0.06]'
    }
  ];

  return (
    <aside className="w-64 bg-[#070709] border-r border-white/[0.07] flex flex-col shrink-0 text-white select-none relative z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#121118] border border-purple-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.15)] group-hover:border-purple-500/50 transition-all">
            <span className="text-sm font-black tracking-tight text-white">
              P<span className="text-purple-400">.</span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight">plantra</span>
              <span className="w-1 h-1 rounded-full bg-purple-500"></span>
              <span className="text-xs font-semibold text-purple-300">labs</span>
            </div>
            <p className="text-[10.5px] font-medium text-white/40 tracking-wider">
              Talent & ATS Operations
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3.5 space-y-6 overflow-y-auto">
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold text-white/35 uppercase tracking-wider font-mono">
            Recruiting Operations
          </div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-purple-500/10 text-white font-semibold border border-purple-500/25 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-purple-400' : 'text-white/40 group-hover:text-white/80'}`} />
                    <span>{item.name}</span>
                  </div>
                  
                  {item.badge !== undefined && (
                    <span className={`px-2 py-0.5 text-[10.5px] font-mono font-bold rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* System & Telemetry */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold text-white/35 uppercase tracking-wider font-mono">
            Engine & Status
          </div>
          <div className="p-3 bg-[#0d0d12] rounded-xl border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Agora Voice RTC</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span>Multi-Agent Panel</span>
              </div>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                3 ROUNDS
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Anti-Cheat Proctor</span>
              </div>
              <span className="text-[10px] font-mono text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer Profile & Quick Links */}
      <div className="p-3.5 border-t border-white/[0.06] bg-[#050507] space-y-2">
        <Link
          href="/jobs"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-white/60 hover:text-white transition"
        >
          <span className="font-medium text-[11.5px]">Public Careers Portal</span>
          <ExternalLink className="w-3.5 h-3.5 text-white/40" />
        </Link>

        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-500/30 flex items-center justify-center text-[11px] font-bold text-white">
            MG
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">Madhav Gairola</div>
            <div className="text-[10px] text-white/40 truncate">Lead Talent Ops · Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}


