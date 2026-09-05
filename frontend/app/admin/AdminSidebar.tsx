"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Briefcase, ChevronRight, Sparkles } from 'lucide-react';

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
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: 'Applicants',
      href: '/admin/applicants',
      icon: Users,
      badge: applicantCount,
      badgeColor: 'bg-white/[0.08] text-white/90 border border-white/[0.1]'
    },
    {
      name: 'Schedule & Calendar',
      href: '/admin/schedule',
      icon: Calendar,
      badge: scheduledCount,
      badgeColor: 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
    },
    {
      name: 'Job Postings',
      href: '/admin/jobs',
      icon: Briefcase,
      badge: jobCount,
      badgeColor: 'bg-white/[0.04] text-white/60 border border-white/[0.06]'
    }
  ];

  return (
    <div className="w-64 bg-[#0a0a0d] border-r border-white/[0.08] flex flex-col shrink-0 text-white select-none">
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            N
          </div>
          <div>
            <h1 className="text-sm font-sans font-bold text-white leading-tight">nexora labs ats</h1>
            <p className="text-[10px] font-mono text-white/40 tracking-wider">powered by omnipanel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-mono font-bold text-white/30 uppercase tracking-wider">
          hiring operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                isActive
                  ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.1] shadow-xs'
                  : 'text-white/60 hover:bg-white/[0.04] hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40'}`} />
                <span>{item.name}</span>
              </div>
              
              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white mb-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>OmniPanel Active</span>
          </div>
          <p className="text-[10px] font-mono text-white/40 leading-relaxed">
            Multi-persona autonomous voice evaluation enabled.
          </p>
        </div>
      </div>
    </div>
  );
}

