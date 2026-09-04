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

  // Resume submission mode: 'drive' | 'pdf' | 'text'
  const [resumeMode, setResumeMode] = useState<'drive' | 'pdf' | 'text'>('drive');
  const [driveUrl, setDriveUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState("");
  const [resumeText, setResumeText] = useState("");

  // Unwrap params (Next.js 15+)
  useEffect(() => {
    params.then(p => setJobId(p.id));
  }, [params]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setErrorMsg("Please upload a PDF document (.pdf).");
        return;
      }
      setErrorMsg("");
      setPdfFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPdfBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!jobId) return;

    setErrorMsg("");

    // Validate resume input
    if (resumeMode === 'drive' && !driveUrl.trim()) {
      setErrorMsg("Please enter your Google Drive resume link.");
      return;
    }
    if (resumeMode === 'pdf' && (!pdfBase64 || !pdfFile)) {
      setErrorMsg("Please select a PDF file to upload.");
      return;
    }
    if (resumeMode === 'text' && !resumeText.trim()) {
      setErrorMsg("Please paste your resume text.");
      return;
    }
    
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const payload: any = {
      ...Object.fromEntries(formData.entries()),
      resumeDriveUrl: resumeMode === 'drive' ? driveUrl.trim() : undefined,
      resumePdfBase64: resumeMode === 'pdf' ? pdfBase64 : undefined,
      resumeFileName: resumeMode === 'pdf' ? pdfFile?.name : undefined,
      resumeText: resumeMode === 'text' ? resumeText.trim() : undefined,
    };

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
        <p className="text-gray-500 mb-8">Please fill out the form below. Your resume and links will be automatically enriched for your AI interview.</p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium flex items-start gap-2">
            <span className="text-red-500 font-bold">⚠️</span>
            <span>{errorMsg}</span>
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

          {/* Resume Upload Options */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Resume / CV *</label>
            
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                type="button"
                onClick={() => { setResumeMode('drive'); setErrorMsg(""); }}
                className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-1.5 ${
                  resumeMode === 'drive'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>🔗</span> Google Drive Link
              </button>
              <button
                type="button"
                onClick={() => { setResumeMode('pdf'); setErrorMsg(""); }}
                className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-1.5 ${
                  resumeMode === 'pdf'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>📄</span> Upload PDF
              </button>
              <button
                type="button"
                onClick={() => { setResumeMode('text'); setErrorMsg(""); }}
                className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-1.5 ${
                  resumeMode === 'text'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>📝</span> Paste Text
              </button>
            </div>

            {/* Google Drive Link Input */}
            {resumeMode === 'drive' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1BxiMVs.../view?usp=sharing"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <p className="text-xs text-gray-500 bg-blue-50 p-2.5 rounded border border-blue-100 flex items-start gap-1.5">
                  <span className="text-blue-500 font-bold">💡</span>
                  <span>
                    Make sure link sharing in Google Drive is set to <strong>"Anyone with the link can view"</strong> so our hiring engine can retrieve your resume.
                  </span>
                </p>
              </div>
            )}

            {/* PDF File Upload Input */}
            {resumeMode === 'pdf' && (
              <div className="space-y-2">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer relative bg-gray-50">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <span className="text-3xl">📄</span>
                    <div className="text-sm font-semibold text-gray-700">
                      {pdfFile ? pdfFile.name : 'Click to select or drag and drop your PDF resume'}
                    </div>
                    <p className="text-xs text-gray-500">Supports searchable text PDF files</p>
                  </div>
                </div>
                {pdfFile && (
                  <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                    <span>✓</span> Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            )}

            {/* Plain Textarea Input */}
            {resumeMode === 'text' && (
              <div className="space-y-1">
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-sans text-sm leading-relaxed"
                  placeholder="Paste your plain resume text here..."
                />
              </div>
            )}
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
