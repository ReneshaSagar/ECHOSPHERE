import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'mr.technologies — Autonomous Multi-Agent AI Interview Panel',
  description: 'Enterprise-grade AI interview panel by mr.technologies powered by Agora Voice Intelligence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          {/* Fallback check in case Navbar is missing */}
          {Navbar ? <Navbar /> : null}
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
