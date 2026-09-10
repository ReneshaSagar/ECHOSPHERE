"use client";

import { useEffect, useRef, useState } from 'react';
import {
  WorkStateEvent,
  interpretCodeStateChange,
  interpretDiagramStateChange,
  checkStuckSignal,
  INACTIVITY_STUCK_THRESHOLD_SECONDS
} from '@/lib/interview/workStateInterpreter';

interface UseWorkStateInterpreterOptions {
  mode: 'coding' | 'excalidraw';
  onWorkStateEvent: (event: WorkStateEvent) => void;
  enabled?: boolean;
}

export function useWorkStateInterpreter({
  mode,
  onWorkStateEvent,
  enabled = true
}: UseWorkStateInterpreterOptions) {
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('typescript');
  const [diagramElements, setDiagramElements] = useState<any[]>([]);
  
  const lastCodeRef = useRef<string>('');
  const lastDiagramRef = useRef<any[]>([]);
  const lastMeaningfulProgressTimeRef = useRef<number>(Date.now());
  const stuckSignalEmittedRef = useRef<boolean>(false);

  // Debounced interpreter for Code Changes
  useEffect(() => {
    if (!enabled || mode !== 'coding') return;

    const timer = setTimeout(() => {
      if (code === lastCodeRef.current) return;

      const event = interpretCodeStateChange(lastCodeRef.current, code, language);
      if (event) {
        lastMeaningfulProgressTimeRef.current = Date.now();
        stuckSignalEmittedRef.current = false;
        onWorkStateEvent(event);
      }
      lastCodeRef.current = code;
    }, 1500); // 1.5s debounce: raw keystrokes are NOT continuously sent

    return () => clearTimeout(timer);
  }, [code, language, mode, enabled, onWorkStateEvent]);

  // Debounced interpreter for Diagram Changes
  useEffect(() => {
    if (!enabled || mode !== 'excalidraw') return;

    const timer = setTimeout(() => {
      const event = interpretDiagramStateChange(lastDiagramRef.current, diagramElements);
      if (event) {
        lastMeaningfulProgressTimeRef.current = Date.now();
        stuckSignalEmittedRef.current = false;
        onWorkStateEvent(event);
      }
      lastDiagramRef.current = diagramElements;
    }, 1500);

    return () => clearTimeout(timer);
  }, [diagramElements, mode, enabled, onWorkStateEvent]);

  // Stuck Detection Interval (35 seconds threshold)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const timeSinceProgressSec = (Date.now() - lastMeaningfulProgressTimeRef.current) / 1000;
      
      if (timeSinceProgressSec >= INACTIVITY_STUCK_THRESHOLD_SECONDS && !stuckSignalEmittedRef.current) {
        const stuckEvent = checkStuckSignal(
          timeSinceProgressSec,
          mode,
          mode === 'coding' ? 'algorithm_implementation' : 'architecture_design'
        );
        
        if (stuckEvent) {
          stuckSignalEmittedRef.current = true;
          onWorkStateEvent(stuckEvent);
        }
      }
    }, 2000); // Check stuck condition every 2 seconds

    return () => clearInterval(interval);
  }, [enabled, mode, onWorkStateEvent]);

  // Helper function to handle code execution output
  const handleCodeExecution = (success: boolean, output: string) => {
    const event = interpretCodeStateChange(lastCodeRef.current, code, language, { success, output });
    if (event) {
      lastMeaningfulProgressTimeRef.current = Date.now();
      stuckSignalEmittedRef.current = false;
      onWorkStateEvent(event);
    }
  };

  return {
    code,
    setCode,
    language,
    setLanguage,
    diagramElements,
    setDiagramElements,
    handleCodeExecution,
    resetProgressTimer: () => {
      lastMeaningfulProgressTimeRef.current = Date.now();
      stuckSignalEmittedRef.current = false;
    }
  };
}
