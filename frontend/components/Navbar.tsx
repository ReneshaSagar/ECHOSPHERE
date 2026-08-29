'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Badge from './ui/Badge';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const isLiveRoom = pathname?.startsWith('/room/');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-[#00AEEF]/25 bg-white/85 dark:bg-[#0B121F]/85 px-6 backdrop-blur-md transition-colors">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="grid h-8 w-8 place-items-center bg-[#00AEEF] text-lg font-bold leading-none text-white">
          +
        </div>
        <span className="text-lg font-semibold tracking-[-0.04em] text-[#102a3a] dark:text-slate-100">OmniPanel AI</span>
      </Link>
      
      <div className="flex items-center justify-center">
        {isLiveRoom && (
          <Badge variant="live">LIVE</Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#007eb6] hidden sm:inline">Agora voice intelligence</span>
        <ThemeToggle />
      </div>
    </nav>
  );
}
