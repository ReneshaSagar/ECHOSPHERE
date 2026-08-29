'use client';

import { motion } from 'framer-motion';
import Card from '../ui/Card';
import { Brain, Users, Shield } from 'lucide-react';

interface AvatarCardProps {
  persona: 'alex' | 'maya' | 'david';
  isActive: boolean;
  isThinking: boolean;
  isMuted?: boolean;
  displayName?: string;
  displayRole?: string;
  displayColor?: string;
}

const personaConfig = {
  alex: { name: 'Alex', role: 'Staff Systems Architect', color: '#06B6D4', initials: 'AL', icon: Brain },
  maya: { name: 'Maya', role: 'VP of Product', color: '#F59E0B', initials: 'MY', icon: Users },
  david: { name: 'David', role: 'Engineering Director', color: '#10B981', initials: 'DV', icon: Shield },
};

export default function AvatarCard({ 
  persona, 
  isActive, 
  isThinking, 
  isMuted = false,
  displayName,
  displayRole,
  displayColor
}: AvatarCardProps) {
  const defaultConfig = personaConfig[persona];
  
  const name = displayName || defaultConfig.name;
  const role = displayRole || defaultConfig.role;
  const color = displayColor || defaultConfig.color;
  const initials = name.substring(0, 2).toUpperCase();
  const Icon = defaultConfig.icon;

  return (
    <Card 
      className={`relative overflow-hidden p-6 flex flex-col items-center justify-center min-h-[240px] transition-all duration-300 ${isActive ? 'scale-[1.02]' : 'scale-100'}`}
      glowColor={isActive ? color : undefined}
    >
      <div className="relative mb-4">
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: color, filter: 'blur(20px)', zIndex: 0 }}
          />
        )}
        <div 
          className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center border-2 border-solid shadow-lg bg-slate-950"
          style={{ borderColor: color, backgroundColor: `${color}15` }}
        >
          <span className="text-2xl font-bold" style={{ color: color }}>{initials}</span>
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
        <h3 className="text-base font-bold text-white mb-1 flex items-center justify-center gap-1.5">
          {name}
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </h3>
        <p className="text-xs text-slate-400">{role}</p>
        
        {isThinking && (
          <div className="mt-3 flex justify-center gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </Card>
  );
}
