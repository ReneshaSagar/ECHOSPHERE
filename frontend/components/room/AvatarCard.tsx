'use client';
import { motion } from 'framer-motion';
import { DynamicPersona } from '@/lib/types';
import ParticleTalkingOrb from './ParticleTalkingOrb';

interface AvatarCardProps {
  persona: DynamicPersona;
  isActive: boolean;
  isThinking: boolean;
  isMuted?: boolean;
}

export default function AvatarCard({ persona, isActive, isThinking, isMuted = false }: AvatarCardProps) {
  const color = persona.color || '#06B6D4';

  return (
    <div className="relative w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-black/60 dark:bg-[#05080f]/80 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden transition-all duration-500">
      
      {/* Name and Role at the top */}
      <div className="absolute top-6 flex flex-col items-center z-10">
        <h3 className="text-xl font-bold tracking-wide text-white mb-0.5">
          {persona.name || 'AI Assistant'}
        </h3>
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          {persona.role || 'Panelist'}
        </p>
      </div>

      {/* The 3D Stippled Particle Talking Orb */}
      <div className="relative flex items-center justify-center my-6">
        <ParticleTalkingOrb 
          isSpeaking={isActive}
          isThinking={isThinking}
          isListening={!isActive && !isThinking}
          size={180}
          accentColor={color}
        />
        
        {/* Muted Badge */}
        {isMuted && (
           <div className="absolute -bottom-2 right-2 bg-red-500/80 backdrop-blur rounded-full p-2 z-20 border border-red-400">
             <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
             </svg>
           </div>
        )}
      </div>
      
      {/* Status indicator at bottom */}
      <div className="absolute bottom-6 flex items-center justify-center z-10">
        {isActive ? (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
            <span className="flex items-center gap-1">
              <motion.span animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-1 bg-amber-400 rounded-full block" />
              <motion.span animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 bg-amber-400 rounded-full block" />
              <motion.span animate={{ height: [4, 8, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 bg-amber-400 rounded-full block" />
            </span>
            <span className="text-[10px] text-amber-300 font-mono tracking-widest uppercase ml-1">Speaking</span>
          </div>
        ) : isThinking ? (
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span className="text-[10px] text-purple-300 font-mono tracking-widest uppercase">Synthesizing</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]">Standby</span>
        )}
      </div>
    </div>
  );
}
