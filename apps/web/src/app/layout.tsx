import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EphemeralChat — Private, disposable 1-to-1 chat',
  description: 'No accounts. No storage. No traces. Peer-to-peer chat that disappears.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
