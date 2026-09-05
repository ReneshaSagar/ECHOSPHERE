"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Briefcase, ChevronRight } from 'lucide-react';

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
      badgeColor: 'bg-blue-100 text-blue-700'
    },
    {
      name: 'Schedule & Calendar',
      href: '/admin/schedule',
      icon: Calendar,
      badge: scheduledCount,
      badgeColor: 'bg-purple-100 text-purple-700'
    },
    {
      name: 'Job Postings',
      href: '/admin/jobs',
      icon: Briefcase,
      badge: jobCount,
      badgeColor: 'bg-gray-100 text-gray-700'
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
            M
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">mr.technologies ATS</h1>
            <p className="text-[11px] text-gray-400 font-medium">Enterprise Recruiting AI</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Management
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
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </div>
              
              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50/60">
        <div className="p-3 bg-white rounded-lg border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Agora Voice AI Active
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Multi-stage autonomous interview agent enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
