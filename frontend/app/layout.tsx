import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Nexora Labs — Infrastructure for Intelligent Software | Powered by OmniPanel',
  description: 'Nexora Labs builds the infrastructure behind modern intelligent products. Explore careers and experience our autonomous multi-agent evaluation platform powered by OmniPanel.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          {Navbar ? <Navbar /> : null}
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
