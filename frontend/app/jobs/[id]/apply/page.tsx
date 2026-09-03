"use client";
import React, { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Unwrap params (Next.js 15+)
  useEffect(() => {
    params.then(p => setJobId(p.id));
  }, [params]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!jobId) return;
    
    setLoading(true);
    setErrorMsg("");
    
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
      } else {
        setErrorMsg(data.error || "Failed to submit application.");
      }
    } catch (err: any) {
      setErrorMsg("Network error: " + err.message);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-green-50 border border-green-200 rounded-xl text-center shadow-sm">
        <h2 className="text-3xl font-bold text-green-800 mb-4">Application Submitted!</h2>
        <p className="text-green-700 mb-8 text-lg">Thank you for applying. We will review your application shortly.</p>
        <Link href="/jobs" className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition">
          Return to Job Board
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/jobs/${jobId}`} className="text-blue-600 hover:underline mb-6 inline-block font-medium">← Back to Job Details</Link>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Submit Your Application</h1>
        <p className="text-gray-500 mb-8">Please fill out the form below. The information provided will be used as the context for your interview.</p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Full Name *</label>
              <input name="name" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email Address *</label>
              <input name="email" type="email" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="jane@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">LinkedIn Profile</label>
              <input name="linkedinUrl" type="url" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">GitHub / Portfolio</label>
              <input name="githubUrl" type="url" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://github.com/..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Resume / Work History *</label>
            <p className="text-xs text-gray-500 mb-2">Paste the plain text of your resume here. This is crucial for the AI interviewer to personalize your interview.</p>
            <textarea name="resumeText" required rows={8} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-sans text-sm leading-relaxed" placeholder="Experience&#10;Software Engineer at Acme Corp (2020-Present)..."></textarea>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Relevant Experience Highlight (Optional)</label>
            <p className="text-xs text-gray-500 mb-2">Briefly describe the most relevant project or experience you have for this specific role.</p>
            <textarea name="relevantExperience" rows={3} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
          </div>

          <div className="pt-6 border-t mt-8">
            <button type="submit" disabled={loading || !jobId} className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-lg shadow-md transition disabled:opacity-50">
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
