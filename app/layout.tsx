import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import { Providers } from '../components/Providers';
import { Metadata } from 'next';

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
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
