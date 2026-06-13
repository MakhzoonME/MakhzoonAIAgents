'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, ListTodo, GripVertical, ArrowUp, ArrowDown, Play } from 'lucide-react';
import { fetchData, getAgentById } from '@/lib/agents/data';
import { TaskBadge } from '@/components/agents/TaskBadge';
import { PriorityBadge } from '@/components/agents/PriorityBadge';
import type { Task, Agent, Priority } from '@/types/agents';

type SortField = 'order' | 'priority' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  async function loadData() {
    try {
      const data = await fetchData({ force: true });
      setTasks(data.tasks);
      setAgents(data.agents);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function updateTask(taskId: string, updates: Partial<Task>) {
    try {
      await fetch('/api/agents/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, updates }),
      });
      await loadData();
    } catch {}
  }

  async function dispatchTask(taskId: string) {
    setLoading(true);
    try {
      await fetch('/api/agents/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      await loadData();
    } catch {}
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let result = tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (agentFilter !== 'all' && t.assignee !== agentFilter) return false;
      return true;
    });

    const priorityWeight: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    const statusWeight: Record<string, number> = { pending: 0, 'in-progress': 1, done: 2, cancelled: 3 };

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'priority') cmp = priorityWeight[a.priority] - priorityWeight[b.priority];
      else if (sortField === 'order') cmp = a.order - b.order;
      else if (sortField === 'status') cmp = statusWeight[a.status] - statusWeight[b.status];
      else if (sortField === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [tasks, statusFilter, agentFilter, sortField, sortDir]);

  const byStatus = useMemo(() => {
    const groups: Record<string, Task[]> = { done: [], 'in-progress': [], pending: [] };
    tasks.forEach((t) => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [tasks]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
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
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Task Board</h1>
            <p className="text-xs text-gray-500">Track and prioritize tasks — click status to change it</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Status summary cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-6">
          {(['done', 'in-progress', 'pending'] as const).map((status) => {
            const items = byStatus[status];
            const Icon = status === 'done' ? CheckCircle2 : status === 'in-progress' ? Clock : ListTodo;
            const colors = status === 'done'
              ? 'border-green-200 bg-green-50'
              : status === 'in-progress'
              ? 'border-amber-200 bg-amber-50'
              : 'border-gray-200 bg-gray-50';
            const textColor = status === 'done'
              ? 'text-green-700'
              : status === 'in-progress'
              ? 'text-amber-700'
              : 'text-gray-600';
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg border p-4 text-left transition-all duration-150 ${colors} ${
                  statusFilter === status ? 'ring-2 ring-offset-1 ring-blue-400' : 'hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${textColor}`} />
                    <span className={`text-sm font-semibold capitalize ${textColor}`}>
                      {status === 'in-progress' ? 'In Progress' : status}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${textColor}`}>{items.length}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700"
          >
            <option value="all">All statuses</option>
            <option value="done">Done</option>
            <option value="in-progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700"
          >
            <option value="all">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <button
              onClick={() => toggleSort('priority')}
              className={`px-2 py-1 rounded ${sortField === 'priority' ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
            >
              Priority {sortField === 'priority' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('order')}
              className={`px-2 py-1 rounded ${sortField === 'order' ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
            >
              Order {sortField === 'order' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('createdAt')}
              className={`px-2 py-1 rounded ${sortField === 'createdAt' ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
            >
              Date {sortField === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} of {tasks.length} tasks
          </span>
        </div>

        {/* Task table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {['', 'ID', 'Title', 'Priority', 'Status', 'Agent', 'Requested By', 'Files', ''].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                      No tasks match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => {
                    const agent = getAgentById(agents, t.assignee);
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => {
                                const idx = filtered.indexOf(t);
                                if (idx > 0) updateTask(t.id, { order: filtered[idx - 1].order });
                              }}
                              className="text-gray-300 hover:text-gray-500 transition-colors p-0.5"
                              title="Move up"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                const idx = filtered.indexOf(t);
                                if (idx < filtered.length - 1) updateTask(t.id, { order: filtered[idx + 1].order });
                              }}
                              className="text-gray-300 hover:text-gray-500 transition-colors p-0.5"
                              title="Move down"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs font-medium text-blue-600 whitespace-nowrap">{t.id}</span>
                        </td>
                        <td className="px-3 py-3 min-w-[200px]">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{t.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={t.priority}
                            onChange={(e) => updateTask(t.id, { priority: e.target.value as Priority })}
                            className={`text-[10px] font-medium rounded-full border px-2 py-0.5 ${
                              t.priority === 'high' ? 'border-red-200 bg-red-50 text-red-700' :
                              t.priority === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                              'border-gray-200 bg-gray-50 text-gray-500'
                            }`}
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={t.status}
                            onChange={(e) => updateTask(t.id, { status: e.target.value as Task['status'] })}
                            className="text-[10px] font-medium rounded-full border px-2 py-0.5"
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-5 w-5 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: agent?.color ?? '#6B7280' }}
                            >
                              {agent?.name.charAt(0) ?? '?'}
                            </span>
                            <span className="text-sm text-gray-700 whitespace-nowrap">{agent?.name ?? t.assignee}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs capitalize text-gray-500 whitespace-nowrap">{t.requestedBy}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{t.files.length} file{t.files.length !== 1 ? 's' : ''}</span>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); dispatchTask(t.id); }}
                            title="Run in CI"
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          <p>💡 Click the status or priority dropdowns to change them inline. Use ↑↓ arrows to reorder.</p>
          <p>💬 In the chat, try: <em>&quot;prioritize MZ-021 over MZ-022&quot;</em> or <em>&quot;make MZ-021 high priority&quot;</em></p>
        </div>
      </main>
    </div>
  );
}
