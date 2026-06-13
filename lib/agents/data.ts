import type { Agent, Task, ApiResponse } from '@/types/agents';

interface DataPayload {
  agents: Agent[];
  tasks: Task[];
  stats: {
    totalTasks: number;
    done: number;
    inProgress: number;
    pending: number;
    totalAgents: number;
  };
}

let cached: DataPayload | null = null;

export async function fetchData({ force }: { force?: boolean } = {}): Promise<DataPayload> {
  if (cached && !force) return cached;

  const res = await fetch('/api/agents/data');
  const json: ApiResponse<DataPayload> = await res.json();

  if (!json.ok || !json.data) {
    throw new Error(json.error ?? 'Failed to fetch agent data');
  }

  cached = json.data;
  return json.data;
}

export function getAgentById(agents: Agent[], id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

export function getTasksByAgent(tasks: Task[], agentId: string): Task[] {
  return tasks.filter((t) => t.assignee === agentId);
}

export function invalidateCache() {
  cached = null;
}
