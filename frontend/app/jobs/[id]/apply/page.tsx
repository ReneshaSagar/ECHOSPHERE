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
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [alreadyAppliedRole, setAlreadyAppliedRole] = useState("");

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
        if (data.alreadyApplied) {
          setAlreadyApplied(true);
          setAlreadyAppliedRole(data.jobTitle || "");
        }
        setErrorMsg(data.error || "Failed to submit application.");
      }
    } catch (err: any) {
      setErrorMsg("Network error: " + err.message);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 sm:p-10 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-center shadow-sm space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
          ✓
        </div>
        <h2 className="text-3xl font-black text-emerald-900">Application Submitted!</h2>
        <p className="text-emerald-800 text-base max-w-lg mx-auto leading-relaxed">
          Thank you for applying to <strong>Nexora Labs</strong>. Our automated hiring engine is processing your credentials, and you will receive an email confirmation with your next steps shortly.
        </p>
        <div className="pt-4">
          <Link href="/jobs" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm inline-block">
            Return to Open Positions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/jobs/${jobId}`} className="text-blue-600 hover:underline mb-6 inline-block font-medium">← Back to Job Details</Link>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Nexora Labs
          </span>
          <span className="text-xs text-gray-400">Powered by OmniPanel</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Submit Your Application</h1>
        <p className="text-gray-500 mb-8">Please fill out the form below. Your resume, GitHub, and portfolio links will be automatically analyzed and enriched by OmniPanel for your AI voice interview.</p>

        {alreadyApplied ? (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">📋</span>
              <div>
                <h3 className="font-bold text-base text-amber-900">Application Already Received for This Role</h3>
                <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                  You have already submitted an application for <strong>{alreadyAppliedRole || "this position"}</strong>. Candidates can only apply once to each specific position, but we encourage you to apply to our other open roles!
                </p>
                <div className="mt-4">
                  <Link
                    href="/jobs"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                  >
                    Browse Other Open Roles →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium flex items-start gap-2">
            <span className="text-red-500 font-bold">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        ) : null}

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
            <label className="block text-sm font-bold text-gray-700 mb-1">Anything else you'd like to share with us? (Optional)</label>
            <p className="text-xs text-gray-500 mb-2">Tell us about a side project you're proud of, a tough engineering challenge you solved, or anything special you want the hiring team to know.</p>
            <textarea name="relevantExperience" rows={3} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder-gray-400" placeholder="e.g. In my spare time, I built an open-source real-time tool, won a hackathon, or led a performance revamp..."></textarea>
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
