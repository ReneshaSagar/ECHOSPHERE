import './globals.css';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
  title: 'OmniPanel | AI Interview Platform',
  description: 'Autonomous AI Interview Panel',
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased min-h-screen flex flex-col">
        <nav className="w-full flex items-center justify-between px-8 py-6 z-10">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-purple-400">
              OmniPanel
            </div>
            <div className="text-xs tracking-wider text-white/40 uppercase">
              AI Interview Platform
            </div>
          </div>
        </nav>
        <main className="flex-1 flex flex-col relative z-0">
          {children}
        </main>
      </body>
    </html>
  );
}
