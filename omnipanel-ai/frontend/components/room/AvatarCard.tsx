'use client';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { Brain, Users, Shield, User, Zap, Briefcase } from 'lucide-react';
import { DynamicPersona } from '@/lib/types';

interface AvatarCardProps {
  persona: DynamicPersona;
  isActive: boolean;
  isThinking: boolean;
  isMuted?: boolean;
}

const ICONS = [Brain, Users, Shield, User, Zap, Briefcase];

export default function AvatarCard({ persona, isActive, isThinking, isMuted = false }: AvatarCardProps) {
  // Select a random icon based on the agent's uid to keep it consistent
  const Icon = ICONS[persona.agent_uid % ICONS.length];
  // Generate initials
  const initials = persona.name ? persona.name.substring(0, 2).toUpperCase() : 'AI';

  return (
    <Card 
      className={`relative overflow-hidden p-6 flex flex-col items-center justify-center min-h-[240px] transition-all duration-300 ${isActive ? 'scale-[1.02]' : 'scale-100'}`}
      glowColor={isActive ? persona.color : undefined}
    >
      <div className="relative mb-4">
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: persona.color, filter: 'blur(20px)', zIndex: 0 }}
          />
        )}
        <div 
          className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center border-2 border-solid shadow-lg bg-slate-900"
          style={{ borderColor: persona.color, backgroundColor: `${persona.color}20` }}
        >
          <span className="text-2xl font-bold" style={{ color: persona.color }}>{initials}</span>
        </div>
        
        {isMuted && (
           <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 z-20">
             <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
             </svg>
           </div>
        )}
      </div>

      <div className="text-center z-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center justify-center gap-2">
          {persona.name}
          <Icon className="w-4 h-4 text-slate-500" />
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{persona.role}</p>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-end h-6 gap-1 px-4">
        {isThinking ? (
          <div className="flex gap-1 items-center h-full">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: persona.color }}
                animate={{ y: ['0%', '-50%', '0%'] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
              />
            ))}
          </div>
        ) : (
          [...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-full"
              style={{ backgroundColor: persona.color }}
              animate={isActive ? { height: ['20%', '80%', '20%'] } : { height: '10%' }}
              transition={isActive ? { repeat: Infinity, duration: 0.5 + Math.random() * 0.5, delay: i * 0.1 } : {}}
            />
          ))
        )}
      </div>
    </Card>
  );
}
