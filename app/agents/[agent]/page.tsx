'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, ListTodo, Shield, Wrench, FolderOpen } from 'lucide-react';
import { fetchData, getTasksByAgent } from '@/lib/agents/data';
import { TaskBadge } from '@/components/agents/TaskBadge';
import type { Agent, Task } from '@/types/agents';

const PERMISSION_LABELS: Record<string, string> = {
  read: 'Read files', glob: 'Search files', grep: 'Search content',
  edit: 'Edit files', bash: 'Run commands', webfetch: 'Fetch URLs',
};

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agent as string;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData()
      .then((data) => {
        setAgents(data.agents);
        setTasks(data.tasks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agent = useMemo(() => agents.find((a) => a.id === agentId), [agents, agentId]);
  const agentTasks = useMemo(() => getTasksByAgent(tasks, agentId), [tasks, agentId]);

  const stats = {
    done: agentTasks.filter((t) => t.status === 'done').length,
    inProgress: agentTasks.filter((t) => t.status === 'in-progress').length,
    pending: agentTasks.filter((t) => t.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">Agent Not Found</p>
          <Link href="/agents" className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/agents" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{agent.name}</h1>
            <p className="text-xs text-gray-500">{agent.role}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Profile card */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white shadow-xs p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-3"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name.charAt(0)}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{agent.name}</h2>
                <p className="text-sm text-gray-500">{agent.role}</p>
                <span
                  className={`mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    agent.canMakeChanges ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {agent.canMakeChanges ? 'Can make changes' : 'Read-only'}
                </span>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-5">{agent.description}</p>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Permissions
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {agent.permissions.map((perm) => (
                    <span key={perm} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                      {PERMISSION_LABELS[perm] ?? perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Capabilities and stats */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {[
                { label: 'Completed', value: stats.done, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-amber-600 bg-amber-50' },
                { label: 'Pending', value: stats.pending, icon: ListTodo, color: 'text-gray-600 bg-gray-50' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className={`h-4 w-4 ${s.color.split(' ')[0]}`} />
                    <span className="text-xs text-gray-500">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
              <div className="p-5 pb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-gray-500" />
                  Capabilities
                </h3>
              </div>
              <div className="px-5 pb-5">
                <ul className="space-y-2">
                  {agent.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: agent.color }} />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {agent.entryPoints && agent.entryPoints.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
                <div className="p-5 pb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    Entry Points
                  </h3>
                </div>
                <div className="px-5 pb-5 flex flex-wrap gap-2">
                  {agent.entryPoints.map((ep) => (
                    <code key={ep} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">{ep}</code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Tasks ({agentTasks.length})</h2>
          <p className="text-sm text-gray-500">All tasks assigned to {agent.name}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {['ID', 'Title', 'Status', 'Requested By', 'Files'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                      No tasks assigned to this agent yet.
                    </td>
                  </tr>
                ) : (
                  agentTasks.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-blue-600">{t.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{t.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TaskBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs capitalize text-gray-500">{t.requestedBy}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">{t.files.length} file{t.files.length !== 1 ? 's' : ''}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
