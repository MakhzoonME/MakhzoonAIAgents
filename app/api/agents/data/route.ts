import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Priority } from '@/types/agents';

const TASKS_PATH = path.join(process.cwd(), '.opencode', 'tasks.json');

const AGENT_META: Record<string, {
  name: string; role: string; color: string; description: string;
  capabilities: string[]; canMakeChanges: boolean; permissions: string[]; entryPoints?: string[];
}> = {
  'product-manager': {
    name: 'Product Manager', role: 'Orchestrator', color: '#1565C0',
    description: 'Orchestrates the entire dev team — plans features, assigns tasks, tracks progress, reports results. Single point of contact for all feature requests.',
    capabilities: ['Task planning and delegation', 'Cross-agent orchestration', 'Conflict detection (shared file tracking)', 'Progress reporting'],
    canMakeChanges: false,
    permissions: ['read', 'glob', 'grep', 'webfetch', 'bash'],
    entryPoints: ['Start here for any feature request or bug report'],
  },
  architect: {
    name: 'Architect', role: 'System Architect', color: '#0F3F5C',
    description: 'System architect for architecture design, code review, and implementation planning. Ensures consistency across frontend, backend, and database layers.',
    capabilities: ['Architecture design and planning', 'Code review and pattern compliance', 'Feature breakdown into implementation tasks', 'System impact analysis'],
    canMakeChanges: false,
    permissions: ['read', 'glob', 'grep', 'webfetch', 'bash'],
  },
  frontend: {
    name: 'Frontend', role: 'Frontend Developer', color: '#1A7A9A',
    description: 'Frontend developer for UI components, pages, responsive layouts, animations, and styling. Builds all user-facing features.',
    capabilities: ['React / Next.js App Router pages', 'Responsive mobile-first layouts', 'Framer Motion animations', 'RTL support for Arabic localization', 'Module identity system (colors)'],
    canMakeChanges: true,
    permissions: ['read', 'glob', 'grep', 'edit', 'bash'],
    entryPoints: ['app/[locale]/*', 'components/*', 'hooks/*', 'store/*'],
  },
  backend: {
    name: 'Backend', role: 'Backend Developer', color: '#00695C',
    description: 'Backend developer for API routes, services, authentication, business logic, and permissions. Handles all server-side logic.',
    capabilities: ['API routes under app/api/*', 'Service layer implementation', 'Session management and RBAC', 'Audit logging for all mutations', 'Firebase Admin SDK integration'],
    canMakeChanges: true,
    permissions: ['read', 'glob', 'grep', 'edit', 'bash'],
    entryPoints: ['app/api/*', 'lib/services/*'],
  },
  database: {
    name: 'Database', role: 'Database Specialist', color: '#E65100',
    description: 'Database specialist for data modeling, queries, indexes, and multi-tenant isolation. Ensures data integrity and performance.',
    capabilities: ['Firestore collection design', 'Query optimization and indexing', 'Multi-tenant isolation (organizationId filter)', 'Data migrations and seeding'],
    canMakeChanges: true,
    permissions: ['read', 'glob', 'grep', 'edit', 'bash'],
    entryPoints: ['lib/db/*', 'scripts/*'],
  },
  qa: {
    name: 'QA', role: 'QA Engineer', color: '#6A1B9A',
    description: 'QA engineer for testing, code review, linting, type checking, and security audits. Ensures code quality and reliability.',
    capabilities: ['Code review and pattern compliance', 'Test execution (Vitest)', 'Linting and TypeScript verification', 'Security audit (input validation, auth gaps)', 'Multi-tenant isolation checks'],
    canMakeChanges: false,
    permissions: ['read', 'glob', 'grep', 'bash'],
  },
  devops: {
    name: 'DevOps', role: 'DevOps Engineer', color: '#1B5E20',
    description: 'DevOps engineer for deployment configuration, CI/CD pipelines, environment variables, and infrastructure management.',
    capabilities: ['Deployment config (Cloudflare, Railway, Vercel)', 'CI/CD pipeline management (GitHub Actions)', 'Environment variable configuration', 'Build and deployment troubleshooting'],
    canMakeChanges: true,
    permissions: ['read', 'glob', 'grep', 'edit', 'bash', 'webfetch'],
    entryPoints: ['next.config.mjs', '.github/workflows/*', '.env.*.example', 'wrangler.toml'],
  },
};

function normalizeTasks(tasks: any[]) {
  return tasks.map((t: any, i: number) => ({
    ...t,
    priority: t.priority ?? 'medium',
    order: t.order ?? i,
  }));
}

export async function GET() {
  try {
    const agents = Object.entries(AGENT_META).map(([id, meta]) => ({
      id,
      ...meta,
    }));

    let tasks: unknown[] = [];
    if (fs.existsSync(TASKS_PATH)) {
      const raw = fs.readFileSync(TASKS_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      tasks = normalizeTasks(parsed.tasks ?? []);
    }

    return NextResponse.json({ ok: true, data: { agents, tasks, stats: computeStats(agents, tasks) } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { taskId, updates } = body;

    if (!taskId || !updates) {
      return NextResponse.json({ ok: false, error: 'taskId and updates are required' }, { status: 400 });
    }

    const raw = fs.readFileSync(TASKS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const tasks = data.tasks ?? [];

    const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ ok: false, error: `Task ${taskId} not found` }, { status: 404 });
    }

    const allowedFields = ['status', 'priority', 'order', 'title', 'description', 'assignee'];
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        tasks[taskIndex][key] = updates[key];
      }
    }

    if (updates.priority || updates.order) {
      tasks.sort((a: any, b: any) => a.order - b.order);
      tasks.forEach((t: any, i: number) => { t.order = i; });
    }

    data.tasks = tasks;
    fs.writeFileSync(TASKS_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, data: { task: tasks[taskIndex] } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

function computeStats(agents: unknown[], tasks: unknown[]) {
  const taskList = tasks as Array<{ status?: string }>;
  return {
    totalTasks: taskList.length,
    done: taskList.filter((t) => t.status === 'done').length,
    inProgress: taskList.filter((t) => t.status === 'in-progress').length,
    pending: taskList.filter((t) => t.status === 'pending').length,
    totalAgents: agents.length,
  };
}
