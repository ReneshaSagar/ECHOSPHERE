import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'OmniPanel AI — Autonomous Multi-Persona Voice Interview',
  description: 'Enterprise-grade AI interview panel with Alex, Maya, and David',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          {/* Fallback check in case Navbar is missing */}
          {Navbar ? <Navbar /> : null}
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
