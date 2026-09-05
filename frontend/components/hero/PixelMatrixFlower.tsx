'use client';

import React, { useEffect, useRef, useState } from 'react';

// Character sets for the matrix floral sculpture
const MATRIX_CHARS = '0123456789NEXORA890147';
const GLYPHS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'N', 'E', 'X', 'O', 'R', 'A', '8', '9'];

interface ContourPoint {
  // Base coordinates in normalized 3D space
  bx: number;
  by: number;
  bz: number;
  char: string;
  layer: number;      // 0: core, 1-3: inner petals, 4-6: outer petals, 7: stem
  intensity: number;  // 0 to 1 base lighting
  isCore: boolean;
  isStem: boolean;
  angle: number;
  ringIndex: number;
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

    // ── Generate Procedural Matrix Floral Mesh ──
    const points: ContourPoint[] = [];

    // 1. Generate Organic Petal Contour Rings
    const totalRings = 52;
    const pointsPerRing = 130;

    for (let r = 0; r < totalRings; r++) {
      const ringRatio = r / (totalRings - 1); // 0 (center) to 1 (outer petal edge)
      
      // Petal radius with harmonic perturbations (poppy/rose 5-lobe petal structure)
      const baseRadius = 25 + Math.pow(ringRatio, 0.85) * 230;

      for (let p = 0; p < pointsPerRing; p++) {
        const theta = (p / pointsPerRing) * Math.PI * 2;

        // 5-fold petal lobes with secondary and tertiary harmonic ripples
        const petalLobe1 = Math.sin(theta * 5) * 0.18;
        const petalLobe2 = Math.cos(theta * 3 + ringRatio * 2.0) * 0.12;
        const petalFold = Math.sin(theta * 10 + ringRatio * 4.0) * 0.05 * ringRatio;
        const asymmetry = Math.sin(theta - 0.4) * 0.15; // Natural organic tilt

        const radiusVariation = 1.0 + petalLobe1 + petalLobe2 + petalFold + asymmetry;
        const currentRadius = baseRadius * radiusVariation;

        // X and Y in planar flower coordinate system
        const x = Math.cos(theta) * currentRadius;
        const y = Math.sin(theta) * currentRadius * 0.78; // Slight perspective squish

        // 3D Depth / Height (Cup / Bowl shape with wavy petal rims)
        const bowlDepth = -Math.pow(1.0 - ringRatio, 1.8) * 110;
        const petalRimWave = Math.sin(theta * 5 + ringRatio * 3.0) * 35 * ringRatio;
        const petalCurl = Math.pow(ringRatio, 2.5) * 45;
        const z = bowlDepth + petalRimWave - petalCurl;

        // Core / Petal categorization
        const isCore = ringRatio < 0.28;
        const layer = Math.floor(ringRatio * 6);

        // Lighting intensity based on curvature and height
        const heightNorm = (z + 120) / 200;
        const rimHighlight = Math.pow(Math.max(0, Math.sin(theta * 5 + ringRatio * 3)), 3) * ringRatio;
        const intensity = Math.min(1.0, Math.max(0.15, heightNorm * 0.7 + rimHighlight * 0.4 + (1.0 - ringRatio) * 0.3));

        // Glyph selection: Dense numbers and matrix chars
        const charIdx = (r * 13 + p * 7) % GLYPHS.length;
        const char = GLYPHS[charIdx];

        points.push({
          bx: x,
          by: y - 25, // Slight upward center offset
          bz: z,
          char,
          layer,
          intensity,
          isCore,
          isStem: false,
          angle: theta,
          ringIndex: r,
        });
      }
    }

    // 2. Generate Stem Contour Lines
    const stemRings = 28;
    const stemPointsPerRing = 24;
    for (let sr = 0; sr < stemRings; sr++) {
      const stemRatio = sr / (stemRings - 1);
      const stemY = 150 + stemRatio * 220;
      const stemCurve = Math.sin(stemRatio * Math.PI * 0.8) * 35 - stemRatio * 20;
      const stemWidth = 14 - stemRatio * 4;

      for (let sp = 0; sp < stemPointsPerRing; sp++) {
        const theta = (sp / stemPointsPerRing) * Math.PI * 2;
        const sx = stemCurve + Math.cos(theta) * stemWidth;
        const sz = Math.sin(theta) * stemWidth - 20;

        const charIdx = (sr * 5 + sp * 3) % GLYPHS.length;
        const char = GLYPHS[charIdx];

        points.push({
          bx: sx - 15,
          by: stemY,
          bz: sz,
          char,
          layer: 7,
          intensity: 0.35 + (1.0 - stemRatio) * 0.35,
          isCore: false,
          isStem: true,
          angle: theta,
          ringIndex: sr + totalRings,
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

    // ── Mouse & Touch Tracking ──
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

    // ── Animation Loop ──
    let time = 0;
    let smoothRotX = 0;
    let smoothRotY = 0;

    const render = () => {
      time += 0.015;

      // Smooth mouse spring interpolation
      const targetRotY = (mouseRef.current.targetX - 0.5) * 0.45;
      const targetRotX = (mouseRef.current.targetY - 0.5) * -0.35;
      smoothRotY += (targetRotY - smoothRotY) * 0.06;
      smoothRotX += (targetRotX - smoothRotX) * 0.06;

      // Clear with pitch OLED black
      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.52;
      const centerY = height * 0.46;
      const scale = Math.min(width, height) / 540;

      // Base 3D rotation angles
      const rotX = smoothRotX + Math.sin(time * 0.5) * 0.04;
      const rotY = smoothRotY + Math.cos(time * 0.4) * 0.05;
      const rotZ = Math.sin(time * 0.3) * 0.02;

      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

      // Radial Core Glow underlay
      const glowGrad = ctx.createRadialGradient(
        centerX, centerY - 20 * scale, 10 * scale,
        centerX, centerY - 20 * scale, 180 * scale
      );
      glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
      glowGrad.addColorStop(0.3, 'rgba(217, 119, 6, 0.15)');
      glowGrad.addColorStop(0.6, 'rgba(180, 83, 9, 0.05)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Project & Render Matrix Glyphs
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.max(7, Math.round(8.5 * scale))}px 'JetBrains Mono', monospace`;

      // Sort points by depth (Z-buffer painter's algorithm)
      const projectedPoints = points.map((pt) => {
        // Organic undulating wave
        const wave = pt.isStem
          ? Math.sin(time * 1.5 + pt.by * 0.03) * 3
          : Math.sin(time * 1.8 + pt.ringIndex * 0.35 + pt.angle * 4) * 7.5;

        const x0 = pt.bx;
        const y0 = pt.by;
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

        // Perspective projection
        const fov = 650;
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

      // Sort back-to-front
      projectedPoints.sort((a, b) => a.z - b.z);

      // Draw each glyph with dynamic palette mapping
      const len = projectedPoints.length;
      for (let i = 0; i < len; i++) {
        const { pt, projX, projY, z, pScale } = projectedPoints[i];

        if (projX < -20 || projX > width + 20 || projY < -20 || projY > height + 20) continue;

        // Calculate dynamic luminance & color
        const distFromCenter = Math.sqrt(pt.bx * pt.bx + pt.by * pt.by) / 250;
        
        let rVal = 255;
        let gVal = 255;
        let bVal = 255;
        let alpha = pt.intensity * 0.9;

        if (pt.isStem) {
          // Warm bronze/charcoal stem
          rVal = 180;
          gVal = 130;
          bVal = 90;
          alpha = Math.min(0.75, pt.intensity * 0.85);
        } else if (distFromCenter < 0.32) {
          // Core: Radiant warm amber/gold
          const coreT = distFromCenter / 0.32;
          rVal = Math.round(255 - coreT * 20);
          gVal = Math.round(185 - coreT * 50);
          bVal = Math.round(50 + coreT * 60);
          alpha = Math.min(1.0, pt.intensity * 1.35);
        } else if (distFromCenter < 0.65) {
          // Mid petals: Warm amber transitioning to bronze and platinum
          const midT = (distFromCenter - 0.32) / 0.33;
          rVal = Math.round(235 + midT * 20);
          gVal = Math.round(155 + midT * 70);
          bVal = Math.round(90 + midT * 140);
          alpha = Math.min(0.95, pt.intensity * 1.05);
        } else {
          // Outer Petals: Iridescent silver-white with soft gold rim
          const rimT = Math.min(1.0, (distFromCenter - 0.65) / 0.35);
          rVal = Math.round(240 + rimT * 15);
          gVal = Math.round(240 + rimT * 15);
          bVal = Math.round(245 + rimT * 10);
          alpha = Math.min(0.88, pt.intensity * 0.9);
        }

        // Distance shadow factor
        const depthFade = Math.max(0.2, Math.min(1.0, (z + 180) / 360));
        alpha *= depthFade;

        // Mouse proximity highlight glow
        if (mouseRef.current.active) {
          const dx = projX - mouseRef.current.targetX * width;
          const dy = projY - mouseRef.current.targetY * height;
          const mouseDist = Math.sqrt(dx * dx + dy * dy);
          if (mouseDist < 120) {
            const boost = (1.0 - mouseDist / 120) * 0.45;
            alpha = Math.min(1.0, alpha + boost);
            rVal = Math.min(255, rVal + 25);
            gVal = Math.min(255, gVal + 25);
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
      <div className="absolute bottom-4 right-4 pointer-events-none font-mono text-[10px] text-white/40 tracking-wider flex items-center gap-2 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.06]">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        <span>TOPOGRAPHIC MATRIX FLOWER // v2.4</span>
      </div>
    </div>
  );
}
