'use client';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ListTodo, Brain } from 'lucide-react';
import type { Agent, Task } from '@/types/agents';

interface TeamStatsProps {
  agents: Agent[];
  tasks: Task[];
}

const TONES: Record<string, string> = {
  purple: 'bg-purple-50 text-purple-700',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700',
};

export function TeamStats({ agents, tasks }: TeamStatsProps) {
  const completed = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;

  const stats = [
    { label: 'AI Agents', value: agents.length, icon: Brain, tone: 'purple', subtitle: 'Specialized roles' },
    { label: 'Completed', value: completed, icon: CheckCircle2, tone: 'green', subtitle: `${tasks.length} total tasks` },
    { label: 'In Progress', value: inProgress, icon: Clock, tone: 'amber', subtitle: 'Actively being worked' },
    { label: 'Pending', value: pending, icon: ListTodo, tone: 'blue', subtitle: 'Awaiting assignment' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="rounded-xl border border-gray-200 bg-white shadow-xs p-5"
          >
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${TONES[stat.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900 leading-tight">{stat.value}</p>
                {stat.subtitle && <p className="text-[11px] text-gray-400">{stat.subtitle}</p>}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
