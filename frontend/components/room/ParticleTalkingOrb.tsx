'use client';

import React, { useEffect, useRef } from 'react';

interface ParticleTalkingOrbProps {
  /** Whether the agent is currently speaking (triggers voice vibration & wave expansion) */
  isSpeaking?: boolean;
  /** Whether the agent is actively listening to the user */
  isListening?: boolean;
  /** Whether the agent is synthesizing / thinking */
  isThinking?: boolean;
  /** Dimension in px (width & height), defaults to 160 */
  size?: number;
  /** Optional custom agent accent color tint */
  accentColor?: string;
  /** Audio volume level (0 to 1) for live amplitude binding */
  audioLevel?: number;
  /** Optional custom className */
  className?: string;
}

interface OrbParticle {
  // Base spherical coordinates (normalized radius = 1)
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  lat: number;        // -PI/2 to PI/2 (Y axis latitude)
  lon: number;        // 0 to 2*PI (longitude)
  hemisphere: 'top' | 'bottom' | 'equator';
  colorType: number;  // 0: amber/gold, 1: silver/white, 2: warm champagne/accent
  size: number;
  twinkleSpeed: number;
  twinklePhase: number;
  jitterSeed: number;
}

export default function ParticleTalkingOrb({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  size = 180,
  accentColor,
  audioLevel = 0,
  className = '',
}: ParticleTalkingOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    isSpeaking,
    isListening,
    isThinking,
    audioLevel,
    vibrationStrength: 0,
    targetVibration: 0,
  });

  // Keep stateRef synced with latest props without re-initializing canvas loop
  useEffect(() => {
    stateRef.current.isSpeaking = isSpeaking;
    stateRef.current.isListening = isListening;
    stateRef.current.isThinking = isThinking;
    stateRef.current.audioLevel = audioLevel;
    stateRef.current.targetVibration = isSpeaking ? 1.0 : isListening ? 0.35 : isThinking ? 0.6 : 0.1;
  }, [isSpeaking, isListening, isThinking, audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    // ── Generate Uniform Fibonacci Sphere Point-Cloud ──
    // 2,200 particles for dense, stippled point-cloud globe
    const numParticles = 2200;
    const particles: OrbParticle[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle (~2.39996)

    for (let i = 0; i < numParticles; i++) {
      // Y goes from +1 (top pole) to -1 (bottom pole)
      const y = 1 - (i / (numParticles - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const lat = Math.asin(y);
      const lon = theta % (Math.PI * 2);

      // Determine hemisphere:
      // Top hemisphere: y > 0.05 (Amber / Gold / Copper)
      // Bottom hemisphere: y < -0.05 (Silvery-White / Platinum)
      // Equator transition: -0.05 <= y <= 0.05
      let hemisphere: 'top' | 'bottom' | 'equator' = 'equator';
      let colorType = 0;

      if (y > 0.06) {
        hemisphere = 'top';
        colorType = 0; // Amber / Gold
      } else if (y < -0.06) {
        hemisphere = 'bottom';
        colorType = 1; // Platinum / Silver
      } else {
        hemisphere = 'equator';
        colorType = 2; // Mid champagne / dark transition
      }

      // Random micro stipple particle size
      const pSize = 0.75 + Math.random() * 0.95;

      particles.push({
        x,
        y,
        z,
        baseRadius: 1.0,
        lat,
        lon,
        hemisphere,
        colorType,
        size: pSize,
        twinkleSpeed: 1.5 + Math.random() * 3.0,
        twinklePhase: Math.random() * Math.PI * 2,
        jitterSeed: Math.random() * 100,
      });
    }

    // ── Additional Voice Sparks / Ambient Corona Particles ──
    const numCorona = 180;
    const coronaParticles: OrbParticle[] = [];
    for (let i = 0; i < numCorona; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phiAngle = Math.acos(2.0 * v - 1.0);
      const r = 1.04 + Math.random() * 0.22; // Just outside sphere surface

      const sinPhi = Math.sin(phiAngle);
      const x = r * sinPhi * Math.cos(theta);
      const y = r * Math.cos(phiAngle);
      const z = r * sinPhi * Math.sin(theta);

      coronaParticles.push({
        x,
        y,
        z,
        baseRadius: r,
        lat: phiAngle - Math.PI / 2,
        lon: theta,
        hemisphere: y > 0 ? 'top' : 'bottom',
        colorType: y > 0 ? 0 : 1,
        size: 0.5 + Math.random() * 0.7,
        twinkleSpeed: 3.0 + Math.random() * 4.0,
        twinklePhase: Math.random() * Math.PI * 2,
        jitterSeed: Math.random() * 200,
      });
    }

    let time = 0;
    let currentVibe = 0;
    let rotationAngleY = 0;
    let rotationAngleX = 0.15; // Gentle downward perspective tilt showing both hemispheres

    // ── Render Loop ──
    const render = () => {
      const { isSpeaking: speaking, isListening: listening, isThinking: thinking, targetVibration, audioLevel: vol } = stateRef.current;
      
      time += 0.018;

      // Smooth vibration inertia (spring smoothing)
      currentVibe += (targetVibration - currentVibe) * 0.1;

      // Rotation speed accelerates slightly when thinking or speaking
      const rotSpeedY = speaking ? 0.016 : thinking ? 0.024 : 0.007;
      rotationAngleY += rotSpeedY;

      // Subtle wobble tilt
      const rotX = rotationAngleX + Math.sin(time * 0.7) * (speaking ? 0.06 : 0.02);
      const rotY = rotationAngleY;
      const rotZ = Math.cos(time * 0.5) * 0.02;

      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const cx = size * 0.5;
      const cy = size * 0.5;
      const baseOrbRadius = size * 0.36;

      // Breathing scale + Speech waveform expansion pulse
      const speechPulse = speaking 
        ? Math.sin(time * 14.0) * 0.04 + Math.sin(time * 22.0) * 0.025 + (vol * 0.08)
        : listening 
          ? Math.sin(time * 2.5) * 0.015 
          : Math.sin(time * 1.2) * 0.012;

      const currentOrbRadius = baseOrbRadius * (1.0 + speechPulse);

      // ── Radial Aura / Glow Underlay (Dual Amber + Platinum Core) ──
      const topGlowIntensity = speaking ? 0.35 : thinking ? 0.28 : listening ? 0.20 : 0.14;
      const topGlow = ctx.createRadialGradient(
        cx, cy - baseOrbRadius * 0.28, 4,
        cx, cy - baseOrbRadius * 0.28, baseOrbRadius * 1.25
      );
      topGlow.addColorStop(0, `rgba(245, 158, 11, ${topGlowIntensity.toFixed(2)})`);
      topGlow.addColorStop(0.35, `rgba(217, 119, 6, ${(topGlowIntensity * 0.55).toFixed(2)})`);
      topGlow.addColorStop(0.7, `rgba(180, 83, 9, ${(topGlowIntensity * 0.18).toFixed(2)})`);
      topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, size, size);

      // Bottom Silver Halo Underlay
      const bottomGlowIntensity = speaking ? 0.25 : 0.10;
      const bottomGlow = ctx.createRadialGradient(
        cx, cy + baseOrbRadius * 0.28, 4,
        cx, cy + baseOrbRadius * 0.28, baseOrbRadius * 1.2
      );
      bottomGlow.addColorStop(0, `rgba(226, 232, 240, ${bottomGlowIntensity.toFixed(2)})`);
      bottomGlow.addColorStop(0.5, `rgba(148, 163, 184, ${(bottomGlowIntensity * 0.3).toFixed(2)})`);
      bottomGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = bottomGlow;
      ctx.fillRect(0, 0, size, size);

      // ── Project Sphere Particles ──
      const allPoints = [...particles, ...(speaking || thinking ? coronaParticles : [])];
      const projected = [];

      for (let i = 0; i < allPoints.length; i++) {
        const p = allPoints[i];

        // Harmonic Surface Wave & Speech Vibration Displacement
        let waveDisplacement = 0;
        let jitterX = 0;
        let jitterY = 0;
        let jitterZ = 0;

        if (speaking) {
          // High-frequency speech vibration ripples across spherical latitude
          const speechWave1 = Math.sin(p.lon * 6.0 + time * 16.0) * Math.cos(p.lat * 5.0 - time * 12.0);
          const speechWave2 = Math.sin(p.lat * 11.0 + time * 24.0) * 0.5;
          waveDisplacement = (speechWave1 + speechWave2) * 0.055 * (0.6 + vol * 0.8);

          // Voice micro-jitter
          const jitterAmount = 0.022 * currentVibe;
          jitterX = (Math.sin(time * 30.0 + p.jitterSeed) * jitterAmount);
          jitterY = (Math.cos(time * 35.0 + p.jitterSeed * 1.3) * jitterAmount);
          jitterZ = (Math.sin(time * 28.0 + p.jitterSeed * 1.7) * jitterAmount);
        } else if (listening) {
          // Gentle acoustic ripples
          waveDisplacement = Math.sin(p.lon * 3.0 + time * 4.0) * Math.cos(p.lat * 3.0) * 0.018;
        } else if (thinking) {
          // Energetic orbital swirl
          waveDisplacement = Math.sin(p.lon * 8.0 + time * 10.0) * 0.028;
        }

        const effectiveRadius = (p.baseRadius + waveDisplacement);

        const x0 = (p.x * effectiveRadius + jitterX) * currentOrbRadius;
        const y0 = (p.y * effectiveRadius + jitterY) * currentOrbRadius;
        const z0 = (p.z * effectiveRadius + jitterZ) * currentOrbRadius;

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

        // Perspective Camera Projection
        const fov = 420;
        const pScale = fov / (fov + z3);
        const projX = cx + x3 * pScale;
        const projY = cy + y3 * pScale;

        projected.push({
          p,
          projX,
          projY,
          z: z3,
          pScale,
          effectiveY: p.y,
        });
      }

      // Painter's algorithm: sort back to front by depth Z
      projected.sort((a, b) => a.z - b.z);

      // ── Draw Stippled Particles ──
      const len = projected.length;
      for (let i = 0; i < len; i++) {
        const { p, projX, projY, z, pScale, effectiveY } = projected[i];

        // Depth fogging & front-facing luminance enhancement
        const depthRatio = (z + currentOrbRadius) / (2 * currentOrbRadius); // 0 (back) to 1 (front)
        const frontLuminance = Math.max(0.18, Math.min(1.0, depthRatio * 0.85 + 0.25));

        // Twinkle factor
        const twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.18 + 0.82;

        let rVal = 255;
        let gVal = 255;
        let bVal = 255;
        let alpha = frontLuminance * twinkle;

        // Color Mapping matching exact Image Aesthetic:
        // Top Hemisphere (y > 0): Glowing Amber, Copper, Bright Gold
        // Bottom Hemisphere (y < 0): Diamond White, Platinum, Silvery Crystal
        if (effectiveY > 0.05) {
          // Top Hemisphere: Amber / Gold gradient
          const topT = Math.min(1.0, effectiveY / 0.95);
          // Core crest (high Y) is fiery bright gold, transitioning to rich amber near equator
          rVal = Math.round(255 - (1.0 - topT) * 15);
          gVal = Math.round(210 * topT + 120 * (1.0 - topT));
          bVal = Math.round(140 * topT + 25 * (1.0 - topT));
          alpha *= (speaking ? 1.05 : 0.92);
        } else if (effectiveY < -0.05) {
          // Bottom Hemisphere: Pure Silver / Platinum / Crystal White
          const botT = Math.min(1.0, Math.abs(effectiveY) / 0.95);
          // Bottom pole is brilliant crystal white, transitioning to cool platinum silver
          rVal = Math.round(255 - (1.0 - botT) * 20);
          gVal = Math.round(255 - (1.0 - botT) * 18);
          bVal = Math.round(255 - (1.0 - botT) * 10);
          alpha *= (speaking ? 0.98 : 0.88);
        } else {
          // Equatorial Crevice / Transition
          const eqT = (effectiveY + 0.05) / 0.10;
          rVal = Math.round(200 + eqT * 40);
          gVal = Math.round(170 + eqT * 20);
          bVal = Math.round(180 - eqT * 80);
          alpha *= 0.72; // Naturally darker equator band
        }

        // Boost alpha when speaking
        if (speaking) {
          alpha = Math.min(1.0, alpha * 1.25 + 0.05);
        }

        const renderRadius = Math.max(0.5, p.size * pScale * (speaking ? 1.15 : 1.0));

        ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${Math.min(1.0, alpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(projX, projY, renderRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size]);

  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block pointer-events-none"
      />
      
      {/* Speech ripple ring when active */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping pointer-events-none" />
      )}
    </div>
  );
}
