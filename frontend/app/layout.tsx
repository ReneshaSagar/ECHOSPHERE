import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Newsreader } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import Navbar from '@/components/Navbar';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'nexora — Nature doesn’t guess. Neither should AI.',
  description: 'Nexora Labs builds the infrastructure behind modern intelligent software. Real-time conversational AI screening and deep technical evaluation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${jetbrainsMono.variable} ${newsreader.variable} font-sans bg-[#030304] text-[#f4f4f5] antialiased selection:bg-purple-500/30 selection:text-white`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          {Navbar ? <Navbar /> : null}
          <main className="min-h-screen">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
