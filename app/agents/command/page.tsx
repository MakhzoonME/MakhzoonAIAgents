'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Bot, User, Loader2, MessageSquare, ListTodo, X } from 'lucide-react';
import { fetchData } from '@/lib/agents/data';
import { TaskBadge } from '@/components/agents/TaskBadge';
import type { Task, Agent } from '@/types/agents';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  task?: Task;
  agentName?: string;
}

export default function CommandPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      content: 'Hello! I\'m the **Product Manager**. Tell me what you need built or what task you want to assign, and I\'ll create it and delegate to the right agent.\n\nTry something like:\n- *"Build a login page with email validation"*\n- *"Create an API endpoint for user profiles"*\n- *"Add database indexes for performance"*',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData().then((data) => {
      setAgents(data.agents);
      setTasks(data.tasks);
    }).catch(() => {});
  }, []);

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
        // Refresh task list
        const fresh = await fetch('/api/agents/data').then((r) => r.json());
        if (fresh.ok) setTasks(fresh.data.tasks);
      } else {
        setMessages((prev) => [...prev, { role: 'agent', content: `❌ Error: ${json.error ?? 'Something went wrong'}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'agent', content: '❌ Failed to connect. Is the server running?' }]);
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

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/agents" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Command Center</h1>
              <p className="text-[11px] text-gray-500">Talk to the Product Manager — assign tasks to any agent</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              {showSidebar ? 'Hide tasks' : 'Show tasks'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'agent' && (
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  {msg.role === 'agent' ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 space-y-3">
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                      {msg.task && (
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-medium text-blue-600">{msg.task.id}</span>
                            <TaskBadge status={msg.task.status} />
                          </div>
                          <p className="text-sm text-gray-900 font-medium">{msg.task.title}</p>
                          <p className="text-xs text-gray-500 mt-1">Assigned to <strong>{msg.agentName}</strong></p>
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
                  <div className="h-8 w-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell the Product Manager what you need built..."
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="self-end px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar — pending/in-progress tasks (desktop) */}
        {showSidebar && (
          <aside className="w-72 border-l border-gray-200 bg-white overflow-y-auto hidden lg:block flex-shrink-0">
            <TasksList tasks={tasks} agents={agents} inProgressTasks={inProgressTasks} pendingTasks={pendingTasks} />
          </aside>
        )}

        {/* Sidebar — mobile slide-over */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                  <ListTodo className="h-3.5 w-3.5" />
                  Active Tasks
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <TasksList tasks={tasks} agents={agents} inProgressTasks={inProgressTasks} pendingTasks={pendingTasks} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TasksList({
  tasks, agents, inProgressTasks, pendingTasks,
}: {
  tasks: Task[]; agents: Agent[]; inProgressTasks: Task[]; pendingTasks: Task[];
}) {
  if (pendingTasks.length === 0 && inProgressTasks.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-8">No active tasks. Tell the PM what to build!</p>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-1.5 lg:sr-only">
        <ListTodo className="h-3.5 w-3.5" />
        Active Tasks
      </h2>
      {inProgressTasks.map((t) => {
        const agent = agents.find((a) => a.id === t.assignee);
        return (
          <div key={t.id} className="mb-2 p-3 rounded-lg border border-amber-200 bg-amber-50">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="font-mono text-[10px] font-medium text-amber-700">{t.id}</span>
            </div>
            <p className="text-xs text-gray-800 line-clamp-2">{t.title}</p>
            {agent && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className="h-3 w-3 rounded flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: agent.color }}>
                  {agent.name.charAt(0)}
                </span>
                <span className="text-[10px] text-gray-500">{agent.name}</span>
              </div>
            )}
          </div>
        );
      })}
      {pendingTasks.map((t) => {
        const agent = agents.find((a) => a.id === t.assignee);
        return (
          <div key={t.id} className="mb-2 p-3 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span className="font-mono text-[10px] font-medium text-gray-500">{t.id}</span>
            </div>
            <p className="text-xs text-gray-800 line-clamp-2">{t.title}</p>
            {agent && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className="h-3 w-3 rounded flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: agent.color }}>
                  {agent.name.charAt(0)}
                </span>
                <span className="text-[10px] text-gray-500">{agent.name}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
