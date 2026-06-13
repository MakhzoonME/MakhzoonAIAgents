'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Agent } from '@/types/agents';

interface AgentCardProps {
  agent: Agent;
  taskCount: { done: number; inProgress: number; total: number };
  index?: number;
}

export function AgentCard({ agent, taskCount, index = 0 }: AgentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
    >
      <Link href={`/agents/${agent.id}`} className="block h-full group">
        <div className="h-full rounded-xl border border-gray-200 bg-white shadow-xs hover:shadow-md transition-all duration-200 hover:border-gray-300 p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: agent.color }}
            >
              {agent.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                {agent.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{agent.role}</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-4 flex-1">
            {agent.description}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {taskCount.total > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {taskCount.done} done
                </span>
              )}
              {taskCount.inProgress > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {taskCount.inProgress} active
                </span>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                agent.canMakeChanges ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {agent.canMakeChanges ? 'Can edit' : 'Read-only'}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
