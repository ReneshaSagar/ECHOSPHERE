import React from 'react';
import { getDb } from '@/lib/db';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = getDb();
  const applicantCount = db.applications.length;
  const scheduledCount = db.interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'COMPLETED').length;
  const jobCount = db.jobs.length;

  return (
    <div className="flex h-screen pt-16 bg-gray-100 text-gray-900 overflow-hidden">
      <AdminSidebar 
        applicantCount={applicantCount} 
        scheduledCount={scheduledCount} 
        jobCount={jobCount} 
      />
      <div className="flex-1 overflow-auto p-8">
        {children}
      </div>
    </div>
  );
}
