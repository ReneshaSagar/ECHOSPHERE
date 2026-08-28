'use client';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import Badge from './ui/Badge';

export default function Navbar() {
  const pathname = usePathname();
  const isLiveRoom = pathname?.startsWith('/room/');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/20 dark:border-slate-800/20 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl leading-none">
          O
        </div>
        <span className="font-semibold text-lg text-slate-900 dark:text-white tracking-tight">OmniPanel AI</span>
      </div>
      
      <div className="flex items-center justify-center">
        {isLiveRoom && (
          <Badge variant="live">LIVE</Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </nav>
  );
}
