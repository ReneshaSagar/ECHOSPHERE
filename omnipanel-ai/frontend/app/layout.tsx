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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {/* Fallback check in case Navbar is missing */}
          {Navbar ? <Navbar /> : null}
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
