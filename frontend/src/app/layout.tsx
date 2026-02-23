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
      <body className="h-screen w-screen overflow-hidden bg-white text-black font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
