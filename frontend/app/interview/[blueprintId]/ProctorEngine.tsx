"use client";
import React, { useEffect, useState } from 'react';

export default function ProctorEngine({ interviewId, isRunning }: { interviewId: string, isRunning: boolean }) {
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    const logEvent = async (type: string, details: string) => {
      // Display warning to the candidate
      setWarning(`⚠️ Warning: ${details}`);
      setTimeout(() => setWarning(null), 5000);

      // Log silently to the backend
      try {
        await fetch(`/api/interviews/${interviewId}/proctor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, details })
        });
      } catch (e) {
        console.error("Failed to log proctor event", e);
      }
    };

    // 1. Tab Focus / Visibility Tracking
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('TAB_SWITCH', 'Candidate switched away from the interview tab.');
      }
    };

    // 2. Heavy Typing Detection (e.g. Chatting with an AI assistant)
    let keyPresses = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore normal control keys, count character presses
      if (e.key.length === 1) keyPresses++;
      
      if (keyPresses > 15) {
        logEvent('HEAVY_TYPING', 'Unusual typing activity detected during the oral interview.');
        keyPresses = 0;
      }
    };
    
    const typingInterval = setInterval(() => { keyPresses = 0; }, 5000); // Reset count every 5 seconds

    // 3. Copy/Paste Tracking
    const handlePaste = () => {
      logEvent('PASTE_DETECTED', 'Clipboard paste action detected.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
      clearInterval(typingInterval);
    };
  }, [interviewId, isRunning]);

  if (!warning) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce font-bold border border-red-400">
      {warning}
      <div className="text-xs font-normal mt-1 opacity-80">This event has been logged for evaluation.</div>
    </div>
  );
}
