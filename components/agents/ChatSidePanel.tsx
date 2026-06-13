'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Loader2, MessageSquare } from 'lucide-react';
import { fetchData } from '@/lib/agents/data';
import { TaskBadge } from './TaskBadge';
import type { Task, Agent } from '@/types/agents';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  task?: Task;
  agentName?: string;
}

interface ChatSidePanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatSidePanel({ open, onClose }: ChatSidePanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      content: 'Hello! I\'m the **Product Manager**. Tell me what you need built and I\'ll create a task for it.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchData().then((data) => {
        setAgents(data.agents);
        setTasks(data.tasks);
      }).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/agents/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const json = await res.json();

      if (json.ok) {
        const agentMsg: ChatMessage = {
          role: 'agent',
          content: json.data.response,
          task: json.data.task,
          agentName: json.data.agentName,
        };
        setMessages((prev) => [...prev, agentMsg]);
        const fresh = await fetch('/api/agents/data').then((r) => r.json());
        if (fresh.ok) setTasks(fresh.data.tasks);
      } else {
        setMessages((prev) => [...prev, { role: 'agent', content: json.error ?? 'Something went wrong' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'agent', content: 'Failed to connect. Is the server running?' }]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">Chat with PM</p>
                  <p className="text-[10px] text-gray-400">Assign tasks to any agent</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'agent' && (
                    <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}

                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    {msg.role === 'agent' ? (
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2">
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{
                          __html: msg.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>')
                        }} />
                        {msg.task && (
                          <div className="bg-white rounded-lg border border-gray-200 p-2.5 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-[10px] font-medium text-blue-600">{msg.task.id}</span>
                              <TaskBadge status={msg.task.status} />
                            </div>
                            <p className="text-xs text-gray-900 font-medium">{msg.task.title}</p>
                            {msg.agentName && (
                              <p className="text-[10px] text-gray-500 mt-1">Assigned to <strong>{msg.agentName}</strong></p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-blue-600 text-white rounded-xl p-3 text-sm">
                        {msg.content}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="h-7 w-7 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3 flex-shrink-0">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell the PM what to build..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="self-end px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
