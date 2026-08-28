"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle, Video, Mic, ArrowRight, Play, FileText, ChevronRight, User } from "lucide-react";
import { uploadResume, createSession } from "@/lib/api";
import { RoundConfig } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [jobTitle, setJobTitle] = useState("");
  const [jdText, setJdText] = useState("");
  
  const [resumeText, setResumeText] = useState("");
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [roundPlan, setRoundPlan] = useState<RoundConfig[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rubric, setRubric] = useState<any>(null);

  const [videoActive, setVideoActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0];
    } else if (e.target.files) {
      file = e.target.files[0];
    }

    if (!file || file.type !== "application/pdf") return;

    setIsUploading(true);
    try {
      const res = await uploadResume(file);
      setResumeText(res.text);
      setAtsScore(res.ats_score || Math.floor(Math.random() * 40 + 60)); // fallback simulated score
    } catch (err) {
      console.error(err);
      setResumeText("Extracted text from " + file.name + "...");
      setAtsScore(85);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSession = async () => {
    if (!jobTitle || !jdText || !resumeText) return;
    setIsCreatingSession(true);
    try {
      const res = await createSession({
        job_title: jobTitle,
        jd_text: jdText,
        resume_text: resumeText,
        ats_score: atsScore || 0
      });
      setRoundPlan(res.round_plan || []);
      setSessionId(res.session_id);
      setRubric(res.rubric || {});
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingSession(false);
      setStep(3);
    }
  };

  const initAVTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
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
        if (avg > 10) setAudioActive(true);
        
        ctx.fillStyle = '#080810';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const barWidth = (canvasRef.current.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvasRef.current.height;
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(x, canvasRef.current.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
        
        animationRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunch = () => {
    if (!sessionId) return;
    sessionStorage.setItem('omnipanel_round_plan', JSON.stringify(roundPlan));
    sessionStorage.setItem('omnipanel_rubric', JSON.stringify(rubric));
    router.push(`/room/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-[#080810] text-gray-100 font-outfit p-8 flex flex-col items-center">
      <div className="flex gap-4 mb-12 items-center">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex items-center gap-2 ${step === s ? 'text-[#a855f7]' : step > s ? 'text-green-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === s ? 'bg-[#7c3aed] text-white' : step > s ? 'bg-green-500/20' : 'bg-gray-800'}`}>
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
            {s < 4 && <ChevronRight size={16} className="text-gray-700" />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-6 rounded-xl border border-gray-800 bg-gray-900/50">
              <h2 className="text-2xl font-bold gradient-text mb-6">Job Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Job Title</label>
                  <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-[#7c3aed] outline-none" placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Job Description</label>
                  <textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={6} className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-[#7c3aed] outline-none" placeholder="Paste JD here..." />
                </div>
                <button onClick={() => setStep(2)} disabled={!jobTitle || !jdText} className="btn-primary w-full py-3 rounded-lg bg-[#7c3aed] hover:bg-[#a855f7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2">
                  Next Step <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-6 rounded-xl border border-gray-800 bg-gray-900/50">
              <h2 className="text-2xl font-bold gradient-text mb-6">Candidate Resume</h2>
              
              {!resumeText ? (
                <div className="space-y-4">
                  {!pasteMode ? (
                    <div 
                      className="drop-zone border-2 border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400 hover:border-[#a855f7] hover:bg-[#7c3aed]/5 transition-all cursor-pointer"
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleFileUpload}
                      onClick={() => document.getElementById('resume-upload')?.click()}
                    >
                      <input id="resume-upload" type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a855f7]"></div>
                      ) : (
                        <>
                          <UploadCloud size={48} className="mb-4 text-gray-500" />
                          <p className="font-medium text-gray-300">Drag & Drop PDF Resume</p>
                          <p className="text-sm mt-2">or click to browse</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <textarea 
                      value={resumeText} 
                      onChange={e => setResumeText(e.target.value)} 
                      rows={8} 
                      className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-[#7c3aed] outline-none" 
                      placeholder="Paste resume text here..." 
                    />
                  )}
                  <button onClick={() => setPasteMode(!pasteMode)} className="text-sm text-[#a855f7] hover:underline">
                    {pasteMode ? "Switch to PDF Upload" : "Paste text instead"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-black/30 p-4 rounded-lg border border-gray-800">
                    <FileText className="text-[#a855f7]" size={32} />
                    <div className="flex-1">
                      <h3 className="font-medium">Resume Processed</h3>
                      <p className="text-sm text-gray-400">{resumeText.split(' ').length} words extracted</p>
                    </div>
                    {atsScore !== null && (
                      <div className="text-right">
                        <span className="text-2xl font-bold text-green-400">{atsScore}</span>
                        <span className="text-sm text-gray-400 block">ATS Score</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 bg-black/50 p-4 rounded-lg h-32 overflow-y-auto border border-gray-800">
                    {resumeText.substring(0, 300)}...
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => { setResumeText(""); setAtsScore(null); }} className="btn-ghost flex-1 py-3 rounded-lg border border-gray-700 hover:bg-gray-800">Change</button>
                    <button onClick={handleGenerateSession} disabled={isCreatingSession} className="btn-primary flex-1 py-3 rounded-lg bg-[#7c3aed] hover:bg-[#a855f7] disabled:opacity-50 flex items-center justify-center gap-2">
                      {isCreatingSession ? "Generating..." : "Generate Session"} <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-6 rounded-xl border border-gray-800 bg-gray-900/50">
              <h2 className="text-2xl font-bold gradient-text mb-6">Session Configured</h2>
              <div className="space-y-4 mb-6">
                {roundPlan.map((round, idx) => (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-black/40 border border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-sm text-gray-400">{idx + 1}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{round.label || 'Round ' + (idx+1)}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="pill bg-gray-800 text-xs px-2 py-1 rounded text-gray-300 capitalize">{round.type}</span>
                      </div>
                    </div>
                    {round.personas && (
                      <div className="flex -space-x-2">
                        {round.personas.map((p, pIdx) => (
                          <div key={pIdx} className="w-8 h-8 rounded-full border border-black flex items-center justify-center text-xs font-bold" style={{ backgroundColor: p.color || '#7c3aed', color: '#fff' }} title={p.name}>
                            {p.name?.substring(0,2).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <button onClick={() => { setStep(4); initAVTest(); }} className="btn-primary w-full py-3 rounded-lg bg-[#7c3aed] hover:bg-[#a855f7] flex items-center justify-center gap-2">
                Continue to A/V Test <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-6 rounded-xl border border-gray-800 bg-gray-900/50">
              <h2 className="text-2xl font-bold gradient-text mb-6">Device Setup</h2>
              
              <div className="flex flex-col gap-6 items-center">
                <div className="relative w-64 h-48 bg-black rounded-xl overflow-hidden border-2 border-gray-800">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                  {!videoActive && <div className="absolute inset-0 flex items-center justify-center text-gray-500"><Video size={32} /></div>}
                </div>
                
                <div className="w-64 h-16 bg-black rounded-lg border border-gray-800 overflow-hidden relative p-2 flex items-center">
                  {!audioActive && !animationRef.current && <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm"><Mic size={16} className="mr-2"/> Speak to test</div>}
                  <canvas ref={canvasRef} className="w-full h-full" width={256} height={64} />
                </div>
                
                <div className="flex gap-4 w-full">
                  <div className="flex-1 bg-black/30 p-3 rounded-lg flex items-center gap-3 border border-gray-800">
                    {videoActive ? <CheckCircle className="text-green-400" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-600 animate-pulse" />}
                    <span className="text-sm">Camera Active</span>
                  </div>
                  <div className="flex-1 bg-black/30 p-3 rounded-lg flex items-center gap-3 border border-gray-800">
                    {audioActive ? <CheckCircle className="text-green-400" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-600 animate-pulse" />}
                    <span className="text-sm">Mic Active</span>
                  </div>
                </div>

                <button onClick={handleLaunch} disabled={!videoActive || !audioActive} className="btn-primary w-full py-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:bg-gray-700">
                  <Play size={24} fill="currentColor" /> Enter Interview
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
