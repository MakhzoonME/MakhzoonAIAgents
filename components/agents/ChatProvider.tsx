'use client';
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatSidePanel } from './ChatSidePanel';

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {children}

      {/* Floating chat button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-5 z-30 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        aria-label="Open chat"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <ChatSidePanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
