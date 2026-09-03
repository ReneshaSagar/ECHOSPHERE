"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      requirements: formData.get('requirements'),
      stages: formData.get('stages')?.toString().split(',').map(s => s.trim()) || ['Technical', 'HR'],
      mcpServerUrl: formData.get('mcpServerUrl')
    };

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push('/admin/jobs');
      } else {
        alert("Failed to create job");
      }
    } catch (err) {
      alert("Error: " + err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/jobs" className="text-gray-500 hover:text-gray-800">← Back</Link>
        <h1 className="text-3xl font-bold">Create Job Posting</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input name="title" required className="w-full p-2 border rounded" placeholder="e.g. Senior Frontend Engineer" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea name="description" required rows={3} className="w-full p-2 border rounded" placeholder="Brief overview of the role..." />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements / Skills</label>
            <textarea name="requirements" required rows={4} className="w-full p-2 border rounded" placeholder="- React&#10;- TypeScript&#10;- System Design" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interview Stages (comma separated)</label>
            <input name="stages" defaultValue="Technical, HR" className="w-full p-2 border rounded" />
            <p className="text-xs text-gray-500 mt-1">These stages will be used to generate the multi-agent blueprint.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              MCP Server URL <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Phase 11</span>
            </label>
            <input name="mcpServerUrl" type="url" className="w-full p-2 border rounded border-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500" placeholder="https://my-company-mcp.com/sse (Optional)" />
            <p className="text-xs text-gray-500 mt-1">Provide a Model Context Protocol endpoint for the AI to query company docs, ATS data, or execute code.</p>
          </div>

          <div className="pt-4 border-t">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
