"use client";
import React, { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

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
      <div className="max-w-2xl mx-auto mt-10 p-8 sm:p-12 bg-[#0a0a0d] border border-emerald-500/30 rounded-3xl text-center shadow-[0_0_50px_rgba(16,185,129,0.15)] space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl font-bold shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-sans font-bold text-white">Application Submitted!</h2>
          <p className="text-white/60 text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-sans">
            Thank you for applying to <strong className="text-white">Nexora Labs</strong>. Our automated hiring engine is processing your credentials, and you will receive an email confirmation with your next steps shortly.
          </p>
        </div>
        <div className="pt-4">
          <Link 
            href="/jobs" 
            className="px-8 py-3.5 bg-white text-black font-sans font-bold rounded-full hover:bg-neutral-200 transition shadow-[0_0_20px_rgba(255,255,255,0.2)] inline-block"
          >
            return to open positions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link 
        href={`/jobs/${jobId}`} 
        className="inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white transition group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        <span>back to job details</span>
      </Link>
      
      <div className="bg-[#0a0a0d] p-8 sm:p-12 rounded-3xl border border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.6)] space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-3 py-1 rounded-full bg-white/[0.05] text-white/90 border border-white/[0.1]">
              nexora labs
            </span>
            <span className="text-xs font-mono text-white/40">powered by omnipanel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight">
            submit your application
          </h1>
          <p className="text-white/50 text-sm leading-relaxed font-sans">
            Please fill out the form below. Your resume, GitHub, and portfolio links will be automatically analyzed and enriched by OmniPanel for your AI voice interview.
          </p>
        </div>

        {alreadyApplied ? (
          <div className="p-5 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">📋</span>
              <div className="space-y-2">
                <h3 className="font-sans font-bold text-base text-amber-100">Application Already Received for This Role</h3>
                <p className="text-xs text-amber-200/80 leading-relaxed font-sans">
                  You have already submitted an application for <strong>{alreadyAppliedRole || "this position"}</strong>. Candidates can only apply once to each specific position, but we encourage you to apply to our other open roles!
                </p>
                <div className="pt-2">
                  <Link
                    href="/jobs"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-black text-xs font-bold rounded-full shadow-sm hover:bg-amber-300 transition"
                  >
                    browse other open roles →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-mono flex items-start gap-2.5">
            <span className="text-rose-400 font-bold">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono font-medium text-white/70">Full Name *</label>
              <input 
                name="name" 
                required 
                className="w-full p-3.5 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white text-sm focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none transition placeholder-white/20" 
                placeholder="Jane Doe" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-mono font-medium text-white/70">Email Address *</label>
              <input 
                name="email" 
                type="email" 
                required 
                className="w-full p-3.5 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white text-sm focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none transition placeholder-white/20" 
                placeholder="jane@example.com" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono font-medium text-white/70">LinkedIn Profile</label>
              <input 
                name="linkedinUrl" 
                type="url" 
                className="w-full p-3.5 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white text-sm focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none transition placeholder-white/20 font-mono text-xs" 
                placeholder="https://linkedin.com/in/..." 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-mono font-medium text-white/70">GitHub / Portfolio</label>
              <input 
                name="githubUrl" 
                type="url" 
                className="w-full p-3.5 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white text-sm focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none transition placeholder-white/20 font-mono text-xs" 
                placeholder="https://github.com/..." 
              />
            </div>
          </div>

          {/* Resume Upload Options */}
          <div className="space-y-3">
            <label className="block text-xs font-mono font-medium text-white/70">Resume / CV *</label>
            
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-white/[0.08] mb-4 gap-2">
              <button
                type="button"
                onClick={() => { setResumeMode('drive'); setErrorMsg(""); }}
                className={`py-2 px-4 font-mono text-xs border-b-2 transition flex items-center gap-1.5 ${
                  resumeMode === 'drive'
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                <span>🔗</span> Google Drive Link
              </button>
              <button
                type="button"
                onClick={() => { setResumeMode('pdf'); setErrorMsg(""); }}
                className={`py-2 px-4 font-mono text-xs border-b-2 transition flex items-center gap-1.5 ${
                  resumeMode === 'pdf'
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                <span>📄</span> Upload PDF
              </button>
              <button
                type="button"
                onClick={() => { setResumeMode('text'); setErrorMsg(""); }}
                className={`py-2 px-4 font-mono text-xs border-b-2 transition flex items-center gap-1.5 ${
                  resumeMode === 'text'
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-white/40 hover:text-white/70'
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
                  className="w-full p-3.5 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white text-xs font-mono focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none transition placeholder-white/20"
                />
                <p className="text-xs text-white/50 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06] flex items-start gap-2">
                  <span className="text-amber-400 font-bold">💡</span>
                  <span>
                    Make sure link sharing in Google Drive is set to <strong>"Anyone with the link can view"</strong> so our hiring engine can retrieve your resume.
                  </span>
                </p>
              </div>
            )}

            {/* PDF File Upload Input */}
            {resumeMode === 'pdf' && (
              <div className="space-y-2">
                <div className="border border-dashed border-white/[0.15] rounded-2xl p-8 text-center hover:border-white/40 transition cursor-pointer relative bg-white/[0.02]">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <span className="text-3xl">📄</span>
                    <div className="text-sm font-semibold text-white">
                      {pdfFile ? pdfFile.name : 'Click to select or drag and drop your PDF resume'}
                    </div>
                    <p className="text-xs text-white/40 font-mono">Supports searchable text PDF files</p>
                  </div>
                </div>
                {pdfFile && (
                  <p className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
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
                  className="w-full p-3.5 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white text-xs font-mono leading-relaxed focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none transition placeholder-white/20"
                  placeholder="Paste your plain resume text here..."
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-white/70">Anything else you'd like to share with us? (Optional)</label>
            <p className="text-xs text-white/40">Tell us about a side project you're proud of, a tough engineering challenge you solved, or anything special you want the hiring team to know.</p>
            <textarea 
              name="relevantExperience" 
              rows={3} 
              className="w-full p-3.5 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white text-sm focus:border-white/40 focus:ring-1 focus:ring-white/20 outline-none transition placeholder-white/20" 
              placeholder="e.g. In my spare time, I built an open-source real-time tool, won a hackathon, or led a performance revamp..." 
            />
          </div>

          <div className="pt-6 border-t border-white/[0.08]">
            <button 
              type="submit" 
              disabled={loading || !jobId} 
              className="w-full md:w-auto px-10 py-4 bg-white text-black hover:bg-neutral-200 font-sans font-bold rounded-full text-base shadow-[0_0_30px_rgba(255,255,255,0.2)] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  <span>submitting application...</span>
                </>
              ) : (
                <>
                  <span>submit application</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

