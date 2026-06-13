'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, ListTodo, MessageSquare, Settings } from 'lucide-react';
import { TeamStats } from '@/components/agents/TeamStats';
import { AgentCard } from '@/components/agents/AgentCard';
import { fetchData, getTasksByAgent } from '@/lib/agents/data';
import type { Agent, Task } from '@/types/agents';

export default function AgentsDashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData()
      .then((data) => {
        setAgents(data.agents);
        setTasks(data.tasks);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Failed to load agent data</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">AI Agents Team</h1>
              <p className="text-xs text-gray-500">Development Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/agents/settings"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <Link
              href="/agents/command"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Command Center</span>
            </Link>
            <Link
              href="/agents/tasks"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Task Board</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Team Overview</h2>
          <p className="text-sm text-gray-500">
            {agents.length} specialized agents — {done} tasks completed, {inProgress} in progress
          </p>
        </div>

        <TeamStats agents={agents} tasks={tasks} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent, i) => {
            const agentTasks = getTasksByAgent(tasks, agent.id);
            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                index={i}
                taskCount={{
                  done: agentTasks.filter((t) => t.status === 'done').length,
                  inProgress: agentTasks.filter((t) => t.status === 'in-progress').length,
                  total: agentTasks.length,
                }}
              />
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-gray-200 bg-white shadow-xs p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bot className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">How It Works</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 text-sm text-gray-600">
            <div className="space-y-1">
              <p className="font-medium text-gray-900">1. Request</p>
              <p>Tell the Product Manager what you need. It clarifies requirements and checks for existing work.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-900">2. Plan &amp; Assign</p>
              <p>The PM calls the Architect for complex features, then distributes tasks to Frontend, Backend, Database, or DevOps.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-900">3. Review &amp; Deliver</p>
              <p>QA reviews all changes. The PM reports back with task ID, status, and any outstanding items.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-gray-400">
          AI Agents Team Dashboard &mdash; Reads from <code className="text-gray-600">.opencode/</code> in the repo root
        </div>
      </footer>
    </div>
  );
}
