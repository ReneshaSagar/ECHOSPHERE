import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export default function Card({ children, className, glowColor }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white dark:bg-slate-900/90 dark:backdrop-blur border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all duration-300',
        className
      )}
      style={glowColor ? { boxShadow: `0 0 20px -5px ${glowColor}4d` } : {}}
    >
      {children}
    </div>
  );
}
