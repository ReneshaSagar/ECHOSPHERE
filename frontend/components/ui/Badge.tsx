import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps {
  children: ReactNode;
  variant: 'alex' | 'maya' | 'david' | 'candidate' | 'live' | 'ended' | 'hire' | 'lean' | 'nohire';
  className?: string;
}

export default function Badge({ children, variant, className }: BadgeProps) {
  const variants = {
    alex: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50',
    maya: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50',
    david: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50',
    candidate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    live: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 animate-pulse',
    ended: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    hire: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    lean: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    nohire: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
