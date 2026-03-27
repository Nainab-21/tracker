import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StomaSense – Roadmap & Product Improvement Log Tracker',
  description: 'Live roadmap Gantt chart and product improvement log for StomaSense 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#F0F4F8', color: '#1a1a2e', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
