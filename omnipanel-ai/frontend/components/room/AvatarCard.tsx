'use client';
import { motion } from 'framer-motion';
import { DynamicPersona } from '@/lib/types';

interface AvatarCardProps {
  persona: DynamicPersona;
  isActive: boolean;
  isThinking: boolean;
  isMuted?: boolean;
}

export default function AvatarCard({ persona, isActive, isThinking, isMuted = false }: AvatarCardProps) {
  const color = persona.color || '#06B6D4';

  return (
    <div className="relative w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all duration-500">
      
      {/* Name and Role at the top */}
      <div className="absolute top-6 flex flex-col items-center">
        <h3 className="text-xl font-semibold tracking-wide text-slate-900 mb-1">
          {persona.name || 'AI Assistant'}
        </h3>
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          {persona.role || 'Panelist'}
        </p>
      </div>

      {/* The Conversational Orb */}
      <div className="relative flex items-center justify-center mt-8 mb-4">
        
        {/* Core Orb */}
        <motion.div
          animate={isActive ? {
            scale: [1, 1.2, 1],
            rotate: [0, 90, 180, 270, 360],
            borderRadius: ["50%", "40%", "45%", "50%"],
          } : isThinking ? {
            scale: [1, 1.05, 1],
            opacity: [0.6, 1, 0.6],
          } : {
            scale: 1,
            rotate: 0,
            borderRadius: "50%"
          }}
          transition={isActive ? {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          } : isThinking ? {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          } : {
            duration: 0.5
          }}
          className="relative z-10 w-28 h-28 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${color}, transparent)`,
            boxShadow: isActive ? `0 0 40px 10px ${color}66, inset 0 0 20px ${color}` : `0 0 20px 2px ${color}33`,
            filter: 'blur(2px)'
          }}
        />

        {/* Outer Aura (Only when active) */}
        {isActive && (
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 z-0 rounded-full"
            style={{
              backgroundColor: color,
              filter: 'blur(30px)'
            }}
          />
        )}
        
        {/* Muted Badge */}
        {isMuted && (
           <div className="absolute -bottom-4 right-0 bg-red-500/80 backdrop-blur rounded-full p-2 z-20 border border-red-400">
             <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
             </svg>
           </div>
        )}
      </div>
      
      {/* Status indicator at bottom */}
      <div className="absolute bottom-6 flex items-center justify-center">
        {isActive ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <motion.span animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-1 bg-white rounded-full block" />
              <motion.span animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 bg-white rounded-full block" />
              <motion.span animate={{ height: [4, 8, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 bg-white rounded-full block" />
            </span>
            <span className="text-[10px] text-slate-300 font-mono tracking-widest uppercase ml-1">Listening</span>
          </div>
        ) : isThinking ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] text-amber-400/80 font-mono tracking-widest uppercase">Synthesizing</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">Standby</span>
        )}
      </div>
    </div>
  );
}
