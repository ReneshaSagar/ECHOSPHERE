'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle, Video, Mic, ArrowRight, Play, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { createSession } from '@/lib/api';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [jobTitle, setJobTitle] = useState('');
  const [jdText, setJdText] = useState('');
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsFeedback, setAtsFeedback] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rubric, setRubric] = useState<any>(null);
  const [dynamicPersonas, setDynamicPersonas] = useState<any>(null);

  const [videoActive, setVideoActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, []);

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0];
    } else if (e.target.files) {
      file = e.target.files[0];
    }

    if (!file || file.type !== 'application/pdf') return;
    setResumeFile(file);
  };

  const handleGenerateSession = async () => {
    if (!jobTitle || !jdText || !resumeFile) return;
    setIsCreatingSession(true);
    try {
      const res = await createSession({
        job_title: jobTitle,
        jd_text: jdText,
        resume_file: resumeFile
      });
      setSessionId(res.session_id);
      setRubric(res.rubric);
      setAtsScore(res.ats_score);
      setAtsFeedback(res.ats_feedback);
      setDynamicPersonas(res.dynamic_personas);
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const initAVTest = async () => {
    setDeviceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoActive(true);
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / bufferLength;
        if (avg > 5) setAudioActive(true);
        
        ctx.fillStyle = '#040508';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const barWidth = (canvasRef.current.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvasRef.current.height;
          ctx.fillStyle = '#6366F1';
          ctx.fillRect(x, canvasRef.current.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
        
        animationRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (err) {
      console.error(err);
      setDeviceError('Could not access microphone or camera. Please verify system permissions.');
    }
  };

  const handleLaunch = () => {
    if (!sessionId) return;
    // Persist configuration in sessionStorage for the room page
    sessionStorage.setItem(`omnipanel_rubric_${sessionId}`, JSON.stringify(rubric));
    sessionStorage.setItem(`omnipanel_personas_${sessionId}`, JSON.stringify(dynamicPersonas));
    sessionStorage.setItem(`omnipanel_ats_${sessionId}`, JSON.stringify({ score: atsScore, feedback: atsFeedback }));
    
    stopMedia();
    router.push(`/room/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-[#040508] text-slate-100 flex flex-col items-center justify-center p-6 md:p-12 font-sans selection:bg-indigo-500/30">
      
      {/* ── Wizard Progress Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-10 text-xs font-mono font-bold tracking-widest text-slate-500">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded border transition-colors ${
              step === s 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/40' 
                : step > s 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-slate-950 border-slate-900'
            }`}>
              {step > s ? '✓' : `0${s}`}
            </span>
            {s < 4 && <ChevronRight size={14} className="text-slate-800" />}
          </div>
        ))}
      </div>

      {/* ── Setup Content Panels ────────────────────────────────────────── */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          
          {/* Step 1: Job Description */}
          {step === 1 && (
            <motion.div 
              key="step1" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }} 
              className="glass-panel p-8"
            >
              <div className="mb-6">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Step 01 / Job Specifications</span>
                <h2 className="text-2xl font-bold mt-1 text-white tracking-tight">Enter Role Details</h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Job Title</label>
                  <input 
                    type="text" 
                    value={jobTitle} 
                    onChange={e => setJobTitle(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500/40 rounded-xl p-3 text-sm text-slate-100 outline-none transition-colors" 
                    placeholder="e.g. Lead Machine Learning Engineer" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Job Description</label>
                  <textarea 
                    value={jdText} 
                    onChange={e => setJdText(e.target.value)} 
                    rows={5} 
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500/40 rounded-xl p-3 text-sm text-slate-100 outline-none transition-colors resize-none" 
                    placeholder="Paste the core requirements and goals of this position here..." 
                  />
                </div>
                <button 
                  onClick={() => setStep(2)} 
                  disabled={!jobTitle || !jdText} 
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg"
                >
                  Configure Resume <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: PDF Resume OCR */}
          {step === 2 && (
            <motion.div 
              key="step2" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }} 
              className="glass-panel p-8"
            >
              <div className="mb-6">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Step 02 / OCR Profile Parser</span>
                <h2 className="text-2xl font-bold mt-1 text-white tracking-tight">Upload PDF Resume</h2>
              </div>
              
              {!resumeFile ? (
                <div className="space-y-4">
                  <div 
                    className="border border-dashed border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center text-slate-450 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all cursor-pointer"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleFileUpload}
                    onClick={() => document.getElementById('resume-pdf-upload')?.click()}
                  >
                    <input id="resume-pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                    <UploadCloud size={40} className="mb-3 text-slate-500" />
                    <p className="font-semibold text-sm text-slate-350">Drag & Drop PDF Profile</p>
                    <p className="text-xs text-slate-500 mt-1">Accepts native resume documents</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-350 hover:underline block text-center w-full">
                    Go Back to Specifications
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-900">
                    <FileText className="text-indigo-400 flex-shrink-0" size={28} />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-semibold text-sm truncate text-slate-200">{resumeFile.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(resumeFile.size / 1024).toFixed(1)} KB • Ready for matching</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setResumeFile(null)} 
                      className="flex-1 py-3 border border-slate-900 hover:bg-slate-950 font-semibold rounded-xl text-xs transition-colors"
                    >
                      Clear File
                    </button>
                    <button 
                      onClick={handleGenerateSession} 
                      disabled={isCreatingSession} 
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isCreatingSession ? 'Extracting Profiles...' : 'Analyze Rubrics'} <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: ATS Score + Rubrics Summary */}
          {step === 3 && (
            <motion.div 
              key="step3" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }} 
              className="glass-panel p-8"
            >
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Step 03 / Rubric Blueprint</span>
                  <h2 className="text-2xl font-bold mt-1 text-white tracking-tight">Rubrics & ATS</h2>
                </div>
                {atsScore !== null && (
                  <div className="text-right flex flex-col items-end">
                    <span className="text-3xl font-extrabold text-emerald-400 font-mono leading-none">{atsScore}%</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-1">ATS Score</span>
                  </div>
                )}
              </div>

              {atsFeedback && (
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs text-indigo-300 leading-relaxed mb-5 italic">
                  "{atsFeedback}"
                </div>
              )}

              <div className="space-y-4 mb-6">
                <h4 className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-2">DYNAMIC ASSESSOR PANEL</h4>
                
                {dynamicPersonas && dynamicPersonas.technical && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 font-mono">Round 2: Technical Interview (3 Panelists)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {dynamicPersonas.technical.map((p: any, idx: number) => (
                        <div key={idx} className="bg-slate-950/60 border border-slate-900 rounded-xl p-2.5 text-center flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full border border-indigo-500/20 flex items-center justify-center font-bold text-xs mb-1" style={{ backgroundColor: `${p.color}15`, color: p.color }}>
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-350 block truncate w-full">{p.name}</span>
                          <span className="text-[9px] text-slate-500 block truncate w-full mt-0.5">{p.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dynamicPersonas && dynamicPersonas.hr && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[10px] text-slate-500 font-mono">Round 3: Behavioral / HR Interview (1 Panelist)</p>
                    <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400" style={{ backgroundColor: '#10B98115' }}>
                        {dynamicPersonas.hr[0]?.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-350 block">{dynamicPersonas.hr[0]?.name}</span>
                        <span className="text-[9px] text-slate-500 block">{dynamicPersonas.hr[0]?.role}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => { setStep(4); initAVTest(); }} 
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg"
              >
                Proceed to Hardware Check <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* Step 4: Hardware Check */}
          {step === 4 && (
            <motion.div 
              key="step4" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }} 
              className="glass-panel p-8"
            >
              <div className="mb-6">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Step 04 / Media Diagnostics</span>
                <h2 className="text-2xl font-bold mt-1 text-white tracking-tight">Audio & Gaze Setup</h2>
              </div>
              
              <div className="flex flex-col gap-5 items-center">
                <div className="relative w-full h-44 bg-slate-950 rounded-2xl overflow-hidden border border-slate-900">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1] rounded-2xl" />
                  {!videoActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                      <Video size={30} className="mb-2" />
                      <p className="text-xs">Checking camera feed...</p>
                    </div>
                  )}
                </div>
                
                <div className="w-full h-12 bg-slate-950 rounded-xl border border-slate-900 overflow-hidden relative p-1.5 flex items-center">
                  {!audioActive && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-[11px] font-mono">
                      <Mic size={14} className="mr-1.5"/> Make sound to calibrate mic
                    </div>
                  )}
                  <canvas ref={canvasRef} className="w-full h-full" width={256} height={40} />
                </div>

                {deviceError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{deviceError}</p>
                  </div>
                )}
                
                <div className="flex gap-3 w-full text-[11px] font-semibold">
                  <div className="flex-1 bg-slate-950 p-3.5 rounded-xl flex items-center gap-2 border border-slate-900">
                    <div className={`w-2.5 h-2.5 rounded-full ${videoActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-slate-350">Camera Ready</span>
                  </div>
                  <div className="flex-1 bg-slate-950 p-3.5 rounded-xl flex items-center gap-2 border border-slate-900">
                    <div className={`w-2.5 h-2.5 rounded-full ${audioActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-slate-350">Microphone Ready</span>
                  </div>
                </div>

                <button 
                  onClick={handleLaunch} 
                  disabled={!videoActive || !audioActive} 
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-2 transition-all text-sm"
                >
                  <Play size={16} fill="currentColor" /> Enter Secured Interview
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
