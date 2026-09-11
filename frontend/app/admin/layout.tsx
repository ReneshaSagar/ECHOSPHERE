import React from 'react';
import { getDb } from '@/lib/db';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = getDb();
  const applicantCount = db.applications.length;
  const scheduledCount = db.interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'COMPLETED').length;
  const jobCount = db.jobs.length;

  return (
    <div className="flex h-screen bg-[#030304] text-[#f5f5f7] font-sans overflow-hidden selection:bg-purple-500/30 selection:text-white relative">
      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-64 right-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(124,58,237,0.12),rgba(255,255,255,0))] pointer-events-none z-0" />
      
      <AdminSidebar 
        applicantCount={applicantCount} 
        scheduledCount={scheduledCount} 
        jobCount={jobCount} 
      />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 custom-scrollbar">
        {children}
      </main>
    </div>
  );
}

