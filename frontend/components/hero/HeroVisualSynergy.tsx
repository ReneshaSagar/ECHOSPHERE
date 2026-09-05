'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  Terminal, 
  ArrowRight, 
  MinusCircle, 
  CheckCircle2, 
  Sparkles,
  Zap,
  Activity,
  Layers,
  Cpu
} from 'lucide-react';

export default function HeroVisualSynergy() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full max-w-6xl mx-auto h-[440px] sm:h-[540px] flex items-center justify-center select-none overflow-hidden my-6"
    >
      {/* Ambient Volumetric Glow Behind Center */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full blur-[90px] opacity-40 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.7) 0%, rgba(236,72,153,0.4) 35%, rgba(59,130,246,0.3) 70%, transparent 100%)',
          transform: `translate(calc(-50% + ${mousePos.x * 30}px), calc(-50% + ${mousePos.y * 30}px))`
        }}
      />

      {/* Radiating Light Beams from Center */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] pointer-events-none opacity-30 animate-spin"
        style={{
          animationDuration: '40s',
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.15) 30deg, transparent 60deg, rgba(168,85,247,0.2) 120deg, transparent 150deg, rgba(236,72,153,0.18) 210deg, transparent 240deg, rgba(59,130,246,0.2) 300deg, transparent 330deg)'
        }}
      />

      {/* ── Left Graphic: Robotic / Algorithmic Matrix Hand (Dot Matrix Halftone) ── */}
      <div 
        className="absolute left-0 sm:left-4 lg:left-12 top-1/2 -translate-y-1/2 w-[260px] sm:w-[340px] lg:w-[400px] h-[280px] sm:h-[340px] pointer-events-none transition-transform duration-500 ease-out"
        style={{
          transform: `translateY(calc(-50% + ${mousePos.y * -15}px)) translateX(${mousePos.x * -15}px)`
        }}
      >
        <svg viewBox="0 0 400 320" className="w-full h-full opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <defs>
            <linearGradient id="robotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.4" />
            </linearGradient>
            <pattern id="dotPatternRobot" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="2.2" fill="#e2e8f0" opacity="0.85" />
            </pattern>
          </defs>

          {/* Stylized Robotic Hand & Fingers extending toward center */}
          <g transform="translate(-20, 30)">
            {/* Forearm & Wrist joints */}
            <path d="M 0 160 Q 60 150 110 145 L 120 185 Q 60 190 0 200 Z" fill="url(#robotGrad)" opacity="0.4" />
            <circle cx="115" cy="165" r="14" fill="#64748b" opacity="0.6" />
            <circle cx="115" cy="165" r="8" fill="#e2e8f0" opacity="0.9" />

            {/* Palm chassis */}
            <path d="M 125 140 Q 180 135 220 145 L 210 190 Q 160 195 125 185 Z" fill="url(#robotGrad)" opacity="0.65" />

            {/* Index Finger pointing forward (Halftone Matrix Segments) */}
            <g>
              {/* Joint 1 */}
              <circle cx="215" cy="148" r="7" fill="#cbd5e1" />
              <line x1="215" y1="148" x2="260" y2="138" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" />
              {/* Joint 2 */}
              <circle cx="260" cy="138" r="6" fill="#f1f5f9" />
              <line x1="260" y1="138" x2="305" y2="132" stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" />
              {/* Fingertip reaching center */}
              <circle cx="305" cy="132" r="5" fill="#ffffff" />
              <line x1="305" y1="132" x2="340" y2="130" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
              <circle cx="340" cy="130" r="4.5" fill="#38bdf8" />
            </g>

            {/* Thumb & Other Fingers curved in tension */}
            <g opacity="0.8">
              {/* Thumb */}
              <line x1="180" y1="185" x2="220" y2="215" stroke="#94a3b8" strokeWidth="11" strokeLinecap="round" />
              <circle cx="220" cy="215" r="6" fill="#cbd5e1" />
              <line x1="220" y1="215" x2="255" y2="220" stroke="#cbd5e1" strokeWidth="9" strokeLinecap="round" />
              <circle cx="255" cy="220" r="4" fill="#ffffff" />

              {/* Middle Finger */}
              <line x1="210" y1="165" x2="250" y2="162" stroke="#64748b" strokeWidth="10" strokeLinecap="round" />
              <circle cx="250" cy="162" r="5" fill="#94a3b8" />
              <line x1="250" y1="162" x2="285" y2="162" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />

              {/* Ring Finger */}
              <line x1="200" y1="180" x2="235" y2="182" stroke="#475569" strokeWidth="9" strokeLinecap="round" />
            </g>

            {/* Halftone Dot Grid Overlay across the robotic surface */}
            <g fill="#ffffff">
              {[
                [40, 160, 2.5], [55, 155, 2], [70, 162, 3], [85, 158, 2], [100, 164, 2.5],
                [135, 150, 3], [150, 145, 2.5], [165, 152, 3.5], [180, 148, 3], [195, 154, 2.5],
                [140, 168, 2], [155, 172, 3], [170, 166, 2.5], [185, 175, 3],
                [225, 142, 2.5], [240, 140, 3], [255, 137, 2.5], [270, 134, 3], [285, 133, 2.5],
                [300, 131, 3], [315, 130, 2], [330, 129, 2.5],
                [195, 195, 2.5], [210, 205, 3], [225, 212, 2.5], [240, 216, 2.5]
              ].map(([cx, cy, r], i) => (
                <circle key={i} cx={cx} cy={cy} r={r} opacity={0.6 + (i % 4) * 0.12} />
              ))}
            </g>
          </g>
        </svg>
      </div>

      {/* ── Centerpiece: Glowing 3D Isometric Holographic Asterisk / Crystal Prism ── */}
      <div 
        className="relative z-20 flex flex-col items-center justify-center transition-transform duration-300 ease-out animate-float-subtle"
        style={{
          transform: `perspective(1000px) rotateY(${mousePos.x * 24}deg) rotateX(${mousePos.y * -24}deg) scale(1.02)`
        }}
      >
        {/* Core Multi-Faceted Crystal Asterisk */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
          {/* Intense Lens Flare / Halo Behind Prism */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-300 blur-2xl opacity-70 animate-pulse" />
          
          <svg viewBox="0 0 160 160" className="w-full h-full prism-glow drop-shadow-[0_0_35px_rgba(217,70,239,0.7)]">
            <defs>
              <linearGradient id="prismGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#e879f9" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
              <linearGradient id="prismGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <linearGradient id="prismGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <linearGradient id="prismSpecular" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Isometric 3D Star / Asterisk Prismatic Facets */}
            <g transform="translate(80, 80)">
              {/* 6-Arm 3D Extruded Isometric Asterisk */}
              {[0, 60, 120, 180, 240, 300].map((angle, idx) => (
                <g key={angle} transform={`rotate(${angle})`}>
                  {/* Arm Base / Side shadow facet */}
                  <polygon 
                    points="0,-8 14,-32 0,-56 -14,-32" 
                    fill={idx % 2 === 0 ? "url(#prismGrad1)" : "url(#prismGrad2)"} 
                    opacity="0.9"
                  />
                  {/* Extruded Isometric Depth Bevel */}
                  <polygon 
                    points="0,-56 14,-32 10,-24 0,-44" 
                    fill="url(#prismGrad3)" 
                    opacity="0.85"
                  />
                  {/* Specular Highlight on Ridge */}
                  <line 
                    x1="0" y1="-8" x2="0" y2="-56" 
                    stroke="url(#prismSpecular)" 
                    strokeWidth="2" 
                  />
                  {/* Cross Notch */}
                  <polygon 
                    points="-8,-36 8,-36 6,-42 -6,-42" 
                    fill="#ffffff" 
                    opacity="0.75" 
                  />
                </g>
              ))}

              {/* Central Nucleus Core */}
              <circle cx="0" cy="0" r="14" fill="#ffffff" opacity="0.95" />
              <circle cx="0" cy="0" r="8" fill="url(#prismGrad1)" />
              <circle cx="0" cy="0" r="4" fill="#ffffff" />
            </g>
          </svg>
        </div>
      </div>

      {/* ── Right Graphic: Human Instinct Hand (Warm Halftone Dot Matrix) ── */}
      <div 
        className="absolute right-0 sm:right-4 lg:right-12 top-1/2 -translate-y-1/2 w-[260px] sm:w-[340px] lg:w-[400px] h-[280px] sm:h-[340px] pointer-events-none transition-transform duration-500 ease-out"
        style={{
          transform: `translateY(calc(-50% + ${mousePos.y * 15}px)) translateX(${mousePos.x * 15}px)`
        }}
      >
        <svg viewBox="0 0 400 320" className="w-full h-full opacity-90 drop-shadow-[0_0_20px_rgba(251,146,60,0.15)]">
          <defs>
            <linearGradient id="humanGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#fdba74" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Stylized Human Hand & Index Finger reaching toward center */}
          <g transform="translate(420, 30) scale(-1, 1)">
            {/* Forearm & Wrist */}
            <path d="M 0 160 Q 60 150 110 145 L 120 185 Q 60 190 0 200 Z" fill="url(#humanGrad)" opacity="0.35" />

            {/* Palm & Metacarpals */}
            <path d="M 125 140 Q 180 135 220 145 L 210 190 Q 160 195 125 185 Z" fill="url(#humanGrad)" opacity="0.55" />

            {/* Index Finger reaching gracefully toward the prism */}
            <g>
              <line x1="215" y1="148" x2="260" y2="138" stroke="#fdba74" strokeWidth="12" strokeLinecap="round" />
              <circle cx="260" cy="138" r="6" fill="#fed7aa" />
              <line x1="260" y1="138" x2="305" y2="132" stroke="#fed7aa" strokeWidth="10" strokeLinecap="round" />
              <circle cx="305" cy="132" r="5" fill="#ffedd5" />
              <line x1="305" y1="132" x2="340" y2="130" stroke="#fff7ed" strokeWidth="7" strokeLinecap="round" />
              <circle cx="340" cy="130" r="4.5" fill="#f43f5e" />
            </g>

            {/* Gentle curved human fingers */}
            <g opacity="0.75">
              <line x1="180" y1="185" x2="220" y2="215" stroke="#ea580c" strokeWidth="10" strokeLinecap="round" />
              <circle cx="220" cy="215" r="5" fill="#fdba74" />
              <line x1="220" y1="215" x2="255" y2="220" stroke="#fdba74" strokeWidth="8" strokeLinecap="round" />

              <line x1="210" y1="165" x2="250" y2="162" stroke="#c2410c" strokeWidth="9" strokeLinecap="round" />
              <circle cx="250" cy="162" r="4.5" fill="#ea580c" />
              <line x1="250" y1="162" x2="285" y2="162" stroke="#ea580c" strokeWidth="7" strokeLinecap="round" />
            </g>

            {/* Warm Halftone Pointillist Matrix Dots */}
            <g fill="#ffedd5">
              {[
                [40, 160, 2.5], [55, 155, 2], [70, 162, 3], [85, 158, 2], [100, 164, 2.5],
                [135, 150, 3], [150, 145, 2.5], [165, 152, 3.5], [180, 148, 3], [195, 154, 2.5],
                [140, 168, 2], [155, 172, 3], [170, 166, 2.5], [185, 175, 3],
                [225, 142, 2.5], [240, 140, 3], [255, 137, 2.5], [270, 134, 3], [285, 133, 2.5],
                [300, 131, 3], [315, 130, 2], [330, 129, 2.5],
                [195, 195, 2.5], [210, 205, 3], [225, 212, 2.5], [240, 216, 2.5]
              ].map(([cx, cy, r], i) => (
                <circle key={i} cx={cx} cy={cy} r={r} opacity={0.65 + (i % 4) * 0.1} />
              ))}
            </g>
          </g>
        </svg>
      </div>

      {/* ── Bottom Pixel Matrix Icon Ribbon ── */}
      <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 sm:gap-8 px-6 py-2 rounded-full border border-white/6 bg-[#09090d]/60 backdrop-blur-md shadow-lg text-zinc-500">
        <button className="hover:text-zinc-200 transition-colors cursor-pointer" title="Cloud Orchestration">
          <UploadCloud className="w-4 h-4" />
        </button>
        <button className="hover:text-zinc-200 transition-colors cursor-pointer" title="Real-Time Terminal">
          <Terminal className="w-4 h-4" />
        </button>
        <button className="hover:text-pink-400 transition-colors cursor-pointer" title="Inference Latency">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button className="hover:text-zinc-200 transition-colors cursor-pointer" title="Sub-50ms Turn Control">
          <MinusCircle className="w-4 h-4" />
        </button>
        <button className="hover:text-emerald-400 transition-colors cursor-pointer" title="Grounded Telemetry">
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
