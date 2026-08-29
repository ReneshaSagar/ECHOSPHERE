'use client';
import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  activeSpeaker: string | null;
  audioLevels: Record<string, number>;
}

const colors: Record<string, string> = {
  alex: '#06B6D4',
  maya: '#F59E0B',
  david: '#10B981',
  candidate: '#94A3B8',
};

export default function AudioVisualizer({ activeSpeaker, audioLevels }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const numBars = 64;
    const bars = new Array(numBars).fill(0);
    
    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = (width / numBars) - 2;
      const speakerColor = activeSpeaker ? (colors[activeSpeaker] || '#00AEEF') : '#475569';
      
      const rawLevel = Object.values(audioLevels).reduce((a, b) => Math.max(a, b), 0);
      const isSpeaking = activeSpeaker !== null && rawLevel > 5;
      
      for (let i = 0; i < numBars; i++) {
        let targetHeight = 2; // min height
        if (isSpeaking) {
          // Fake waveform based on raw audio level and time
          const t = Date.now() / 100;
          const noise = Math.sin(t + i) * Math.cos(t * 0.5 - i) * 0.5 + 0.5;
          targetHeight = Math.max(2, (rawLevel / 100) * height * noise);
        }
        
        // Lerp
        bars[i] += (targetHeight - bars[i]) * 0.2;
        
        const x = i * (barWidth + 2);
        const y = height / 2 - bars[i] / 2;
        
        ctx.fillStyle = speakerColor;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, bars[i], barWidth / 2);
        ctx.fill();
      }
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeSpeaker, audioLevels]);

  return (
    <canvas 
      ref={canvasRef} 
      width={1024} 
      height={80} 
      className="w-full h-[80px] bg-slate-50 dark:bg-slate-900/50 rounded-xl"
    />
  );
}
