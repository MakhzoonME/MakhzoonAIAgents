export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  description: string;
  capabilities: string[];
  canMakeChanges: boolean;
  permissions: string[];
  entryPoints?: string[];
}

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'cancelled';
  priority: Priority;
  order: number;
  assignee: string;
  requestedBy: string;
  files: string[];
  branch: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TeamStats {
  totalTasks: number;
  done: number;
  inProgress: number;
  pending: number;
  totalAgents: number;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
