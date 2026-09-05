'use client';

import React, { useEffect, useRef, useState } from 'react';

// Character sets for the matrix floral sculpture (dense digits, letters, and delicate symbols)
const GLYPHS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'N', 'E', 'X', 'O', 'R', 'A', '8', '9', 'C', 'X', 'P', 'H', '·', '%', '0', '1'];

interface MatrixPoint {
  // Base parametric coordinates in 3D flower space
  bx: number;
  by: number;
  bz: number;
  char: string;
  layer: number;          // 0: inner core, 1: mid petal folds, 2: outer ruffled petals, 3: stem
  normalizedRadius: number; // 0 (center) to 1 (outer rim)
  angle: number;
  petalId: number;        // which of the petal lobes
  intensity: number;      // 0 to 1 lighting intensity
  isStem: boolean;
  gridU: number;
  gridV: number;
}

export default function PixelMatrixFlower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, active: false });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // ── Build High-Density Topographic Matrix Floral Mesh ──
    const points: MatrixPoint[] = [];

    // Helper: Petal boundary radius function for lush ruffled peony/poppy shape
    const getPetalBoundary = (theta: number, layer: number): number => {
      // 5-6 major petal lobes with secondary wave undulations and scalloped edges
      const lobe1 = Math.sin(theta * 5.0 + 0.3) * 0.24;
      const lobe2 = Math.cos(theta * 3.0 - 0.5) * 0.15;
      const ruffle = Math.sin(theta * 11.0) * 0.07;
      const microRuffle = Math.cos(theta * 21.0 + layer) * 0.04;
      const organicAsymmetry = Math.sin(theta - 0.7) * 0.12;

      const layerScale = layer === 0 ? 0.36 : layer === 1 ? 0.70 : 1.0;
      return (1.0 + lobe1 + lobe2 + ruffle + microRuffle + organicAsymmetry) * layerScale;
    };

    // 1. Generate Multi-Layered Topographic Blossom (Curvilinear Wave Mesh)
    // We use dense curvilinear concentric contours + wavy topographic grid lines
    const numLayers = 3; // Inner core, Mid folds, Outer ruffled petals
    const contourRingsPerLayer = 28; // 28 rings per tier = 84 rings total
    const pointsPerRing = 120;

    for (let layer = 0; layer < numLayers; layer++) {
      for (let r = 0; r < contourRingsPerLayer; r++) {
        const ringT = (r + 1) / contourRingsPerLayer; // 0.04 to 1.0 within layer
        
        let globalRadiusRatio = 0;
        if (layer === 0) {
          globalRadiusRatio = 0.05 + ringT * 0.30; // Inner core (0.05 - 0.35)
        } else if (layer === 1) {
          globalRadiusRatio = 0.24 + ringT * 0.44; // Mid folds (0.24 - 0.68)
        } else {
          globalRadiusRatio = 0.50 + ringT * 0.50; // Outer billowing petals (0.50 - 1.0)
        }

        const baseMaxRadius = 245;

        for (let p = 0; p < pointsPerRing; p++) {
          const theta = (p / pointsPerRing) * Math.PI * 2;
          const petalBound = getPetalBoundary(theta, layer);
          const currentRadius = globalRadiusRatio * baseMaxRadius * petalBound;

          // Compute planar flower coordinate
          let x = Math.cos(theta) * currentRadius;
          let y = Math.sin(theta) * currentRadius * 0.82; // Perspective oval

          // 3D Topographic Elevation Model:
          // Deep central cup + wavy undulating petal ripples + ruffled lip curls
          const cupDepth = -Math.pow(1.0 - Math.min(1.0, globalRadiusRatio), 1.6) * 128;
          
          // Wave undulation across grid surface (creates the signature cloth-like wavy flow)
          const waveFreqX = 0.026;
          const waveFreqY = 0.022;
          const surfaceWave = Math.sin(x * waveFreqX + y * waveFreqY + layer * 1.5) * 18 * globalRadiusRatio;
          const petalLobeFold = Math.cos(theta * 5.0 + globalRadiusRatio * 3.2) * 24 * globalRadiusRatio;
          const outerLipCurl = Math.pow(globalRadiusRatio, 3.2) * 40;

          const z = cupDepth + surfaceWave + petalLobeFold + outerLipCurl;

          // Surface lighting calculation based on curvature, height, and petal crests
          const heightNorm = (z + 130) / 225;
          const rippleHighlight = Math.pow(Math.max(0, Math.sin(theta * 5.0 + globalRadiusRatio * 4.0)), 2) * 0.45;
          const baseIntensity = Math.min(1.0, Math.max(0.18, heightNorm * 0.65 + rippleHighlight + (1.0 - globalRadiusRatio * 0.4) * 0.35));

          const charIdx = (layer * 97 + r * 13 + p * 7) % GLYPHS.length;
          const char = GLYPHS[charIdx];

          points.push({
            bx: x,
            by: y - 28, // Slight upward center balance
            bz: z,
            char,
            layer,
            normalizedRadius: globalRadiusRatio,
            angle: theta,
            petalId: Math.floor(((theta + Math.PI) / (Math.PI * 2)) * 5) % 5,
            intensity: baseIntensity,
            isStem: false,
            gridU: p / pointsPerRing,
            gridV: globalRadiusRatio,
          });
        }
      }
    }

    // 2. Generate Dense Structured Matrix Stem
    const stemRings = 36;
    const stemPointsPerRing = 18;
    for (let sr = 0; sr < stemRings; sr++) {
      const stemRatio = sr / (stemRings - 1);
      const stemY = 145 + stemRatio * 235;
      // Graceful organic S-curve
      const stemCurveX = Math.sin(stemRatio * Math.PI * 0.85) * 30 - stemRatio * 18 - 8;
      const stemWidth = 13.0 - stemRatio * 3.5;

      for (let sp = 0; sp < stemPointsPerRing; sp++) {
        const theta = (sp / stemPointsPerRing) * Math.PI * 2;
        const sx = stemCurveX + Math.cos(theta) * stemWidth;
        const sz = Math.sin(theta) * stemWidth - 25;

        const charIdx = (sr * 7 + sp * 3) % GLYPHS.length;
        const char = GLYPHS[charIdx];

        points.push({
          bx: sx,
          by: stemY,
          bz: sz,
          char,
          layer: 3,
          normalizedRadius: 1.0,
          angle: theta,
          petalId: -1,
          intensity: 0.3 + (1.0 - stemRatio) * 0.35,
          isStem: true,
          gridU: sp / stemPointsPerRing,
          gridV: stemRatio,
        });
      }
    }

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      setIsLoaded(true);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Mouse & Touch Tracking with Smooth Spring
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0.5;
      mouseRef.current.targetY = 0.5;
      mouseRef.current.active = false;
    };

    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.addEventListener('mousemove', handleMouseMove);
      containerEl.addEventListener('mouseleave', handleMouseLeave);
    }

    // ── Animation & Render Loop ──
    let time = 0;
    let smoothRotX = 0;
    let smoothRotY = 0;

    const render = () => {
      time += 0.014;

      // Smooth mouse spring interpolation
      const targetRotY = (mouseRef.current.targetX - 0.5) * 0.42;
      const targetRotX = (mouseRef.current.targetY - 0.5) * -0.32;
      smoothRotY += (targetRotY - smoothRotY) * 0.06;
      smoothRotX += (targetRotX - smoothRotX) * 0.06;

      // Clear with pitch OLED black
      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.51;
      const centerY = height * 0.46;
      const scale = Math.min(width, height) / 540;

      // Subtle organic breathing pulsation
      const breathScale = 1.0 + Math.sin(time * 1.2) * 0.02;

      // Base 3D rotation angles
      const rotX = smoothRotX + Math.sin(time * 0.45) * 0.035;
      const rotY = smoothRotY + Math.cos(time * 0.38) * 0.045;
      const rotZ = Math.sin(time * 0.28) * 0.018;

      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

      // Multi-Layer Radial Warm Glow underlay (Amber/Copper Core Aura)
      const coreGlow = ctx.createRadialGradient(
        centerX, centerY - 25 * scale, 8 * scale,
        centerX, centerY - 25 * scale, 210 * scale
      );
      coreGlow.addColorStop(0, 'rgba(245, 158, 11, 0.32)');
      coreGlow.addColorStop(0.25, 'rgba(217, 119, 6, 0.18)');
      coreGlow.addColorStop(0.5, 'rgba(180, 83, 9, 0.06)');
      coreGlow.addColorStop(0.8, 'rgba(120, 53, 15, 0.02)');
      coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, 0, width, height);

      // Setup typography
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(7, Math.round(8.2 * scale));
      ctx.font = `600 ${fontSize}px 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`;

      // Project & Transform 3D Points
      const projected = points.map((pt) => {
        // Dynamic undulating wave displacement
        let wave = 0;
        if (pt.isStem) {
          wave = Math.sin(time * 1.6 + pt.by * 0.03) * 2.5;
        } else {
          // Curvilinear ripple wave traversing the petals
          wave = Math.sin(time * 1.8 + pt.normalizedRadius * 4.2 + pt.angle * 3.0) * 8.5 * pt.normalizedRadius;
        }

        const x0 = pt.bx * breathScale;
        const y0 = pt.by * breathScale;
        const z0 = pt.bz + wave;

        // 3D Euler Rotation
        // Y-axis
        const x1 = x0 * cosY + z0 * sinY;
        const y1 = y0;
        const z1 = -x0 * sinY + z0 * cosY;

        // X-axis
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Z-axis
        const x3 = x2 * cosZ - y2 * sinZ;
        const y3 = x2 * sinZ + y2 * cosZ;
        const z3 = z2;

        // Perspective camera projection
        const fov = 680;
        const pScale = fov / (fov + z3);
        const projX = centerX + x3 * scale * pScale;
        const projY = centerY + y3 * scale * pScale;

        return {
          pt,
          projX,
          projY,
          z: z3,
          pScale,
        };
      });

      // Painter's algorithm: sort back-to-front by depth Z
      projected.sort((a, b) => a.z - b.z);

      // Render Glyphs with Dynamic Chiaroscuro & Golden Core Palette
      const len = projected.length;
      for (let i = 0; i < len; i++) {
        const { pt, projX, projY, z } = projected[i];

        if (projX < -30 || projX > width + 30 || projY < -30 || projY > height + 30) continue;

        const normR = pt.normalizedRadius;
        let rVal = 255;
        let gVal = 255;
        let bVal = 255;
        let alpha = pt.intensity * 0.92;

        if (pt.isStem) {
          // Warm bronze stem with gentle luminance
          rVal = 175;
          gVal = 125;
          bVal = 85;
          alpha = Math.min(0.75, pt.intensity * 0.82);
        } else if (normR < 0.28) {
          // Deep Golden Amber Core (Layer 0)
          const coreT = normR / 0.28;
          rVal = Math.round(255 - coreT * 15);
          gVal = Math.round(180 - coreT * 45);
          bVal = Math.round(45 + coreT * 50);
          alpha = Math.min(1.0, pt.intensity * 1.4);
        } else if (normR < 0.62) {
          // Mid Petal Folds: Transition from fiery bronze/amber to warm champagne
          const midT = (normR - 0.28) / 0.34;
          rVal = Math.round(240 + midT * 12);
          gVal = Math.round(145 + midT * 75);
          bVal = Math.round(80 + midT * 135);
          alpha = Math.min(0.96, pt.intensity * 1.15);
        } else {
          // Outer Billowing Petals: Gleaming Platinum / Silvery-White with delicate rim shimmer
          const rimT = Math.min(1.0, (normR - 0.62) / 0.38);
          rVal = Math.round(245 + rimT * 10);
          gVal = Math.round(242 + rimT * 13);
          bVal = Math.round(248 + rimT * 7);
          alpha = Math.min(0.92, pt.intensity * 0.95);
        }

        // Depth fogging & shadow crevice attenuation
        const depthFade = Math.max(0.22, Math.min(1.0, (z + 190) / 380));
        alpha *= depthFade;

        // Mouse proximity interaction highlight
        if (mouseRef.current.active) {
          const dx = projX - mouseRef.current.targetX * width;
          const dy = projY - mouseRef.current.targetY * height;
          const mouseDist = Math.sqrt(dx * dx + dy * dy);
          if (mouseDist < 130) {
            const boost = (1.0 - mouseDist / 130) * 0.4;
            alpha = Math.min(1.0, alpha + boost);
            rVal = Math.min(255, rVal + 20);
            gVal = Math.min(255, gVal + 20);
          }
        }

        ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha.toFixed(3)})`;
        ctx.fillText(pt.char, projX, projY);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerEl) {
        containerEl.removeEventListener('mousemove', handleMouseMove);
        containerEl.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[480px] sm:h-[580px] lg:h-[640px] flex items-center justify-center cursor-crosshair overflow-hidden select-none"
    >
      <canvas 
        ref={canvasRef} 
        className={`w-full h-full block transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
      />

      {/* Floating subtle metadata pill */}
      <div className="absolute bottom-4 right-4 pointer-events-none font-mono text-[10px] text-white/40 tracking-wider flex items-center gap-2 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.06] backdrop-blur-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        <span>TOPOGRAPHIC MATRIX FLOWER // v3.0</span>
      </div>
    </div>
  );
}
