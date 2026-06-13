import type { Metadata } from 'next';
import './globals.css';
import { ChatProvider } from '@/components/agents/ChatProvider';

export const metadata: Metadata = {
  title: 'AI Agents Team',
  description: 'Development team dashboard — view agent roles, responsibilities, and task status.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-surface-page">
        <ChatProvider>{children}</ChatProvider>
      </body>
    </html>
  );
}
