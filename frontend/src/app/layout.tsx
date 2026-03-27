import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Notion Clone',
  description: 'Real-time collaborative workspace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen w-full bg-white text-black font-sans antialiased overflow-x-hidden">
        <div id="loading-bar" className="fixed top-0 left-0 h-1 bg-blue-600 z-[9999] transition-all duration-300 w-0"></div>
        {children}
      </body>
    </html>
  );
}
