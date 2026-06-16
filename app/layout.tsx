import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import { Providers } from '../components/Providers';
import { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['400','500','700'], variable: '--font-display' });
const bodyFont = Inter({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','700'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Molfi.fun — Multi-Model AI Chat',
  description: 'Pay AI with human attention or agent stablecoins on Avalanche Fuji.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${bodyFont.variable} ${mono.variable}`}>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

