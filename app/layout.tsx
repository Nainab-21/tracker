import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StomaSense – Roadmap & Issues Tracker 2026',
  description: 'Live roadmap Gantt chart and issues dashboard for StomaSense 2026',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b1120] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
