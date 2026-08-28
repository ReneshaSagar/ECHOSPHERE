import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OmniPanel AI — Autonomous Interview Platform',
  description: 'Dynamic AI interview panels powered by Agora SD-RTN™. Dynamic personas, real-time proctoring, and bias-free scoring.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className={outfit.className}>
        {/* Minimal navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,8,16,0.8)', backdropFilter: 'blur(16px)' }}>
          <a href="/" className="flex items-center gap-2 no-underline">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>O</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f0f0ff', letterSpacing: '-0.01em' }}>OmniPanel</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(240,240,255,0.3)', marginLeft: '2px' }}>AI</span>
          </a>
          <a href="/setup">
            <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
              Start Interview
            </button>
          </a>
        </nav>
        <div style={{ paddingTop: '56px', minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
