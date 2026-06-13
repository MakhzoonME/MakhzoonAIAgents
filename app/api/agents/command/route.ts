import { NextResponse } from 'next/server';
import { universalReadTasks, universalWriteTasks, universalReadConfig } from '@/lib/github/storage';
import type { Priority } from '@/types/agents';

const AGENT_KEYWORDS: Record<string, string[]> = {
  frontend: ['ui', 'frontend', 'page', 'component', 'style', 'css', 'layout', 'responsive', 'animation', 'mobile', 'design', 'icon'],
  backend: ['api', 'backend', 'endpoint', 'service', 'auth', 'login', 'session', 'middleware', 'route handler'],
  database: ['database', 'db', 'schema', 'index', 'query', 'migration', 'collection', 'table', 'firestore'],
  devops: ['deploy', 'devops', 'ci/cd', 'pipeline', 'env', 'environment', 'config', 'workflow', 'hosting', 'domain'],
  'product-manager': ['feature', 'plan', 'roadmap', 'requirement', 'spec', 'story'],
  qa: ['test', 'qa', 'lint', 'audit', 'bug', 'review', 'coverage'],
  architect: ['architecture', 'design', 'system', 'refactor', 'pattern', 'tech stack', 'scalability'],
};

const AGENT_NAMES: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
  devops: 'DevOps',
  'product-manager': 'Product Manager',
  qa: 'QA',
  architect: 'Architect',
};

const PRIORITY_KEYWORDS: Record<string, string[]> = {
  high: ['high priority', 'urgent', 'critical', 'important', 'asap', 'blocker', 'top priority', 'prioritize'],
  low: ['low priority', 'minor', 'nice to have', 'backlog', 'someday', 'whenever'],
};

function detectPriority(message: string): Priority {
  const lower = message.toLowerCase();
  if (PRIORITY_KEYWORDS.high.some((kw) => lower.includes(kw))) return 'high';
  if (PRIORITY_KEYWORDS.low.some((kw) => lower.includes(kw))) return 'low';
  return 'medium';
}

function detectAgent(message: string): string {
  const lower = message.toLowerCase();
  let bestAgent = 'frontend';
  let bestScore = 0;

  for (const [agent, keywords] of Object.entries(AGENT_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  return bestAgent;
}

function generateId(existingIds: string[]): string {
  const nums = existingIds
    .filter((id) => id.startsWith('MZ-'))
    .map((id) => parseInt(id.replace('MZ-', ''), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 22;
  return `MZ-${String(next).padStart(3, '0')}`;
}

function parsePrioritizeCommand(message: string, tasks: any[]) {
  const lower = message.toLowerCase();

  const prioritizeOver = lower.match(/prioritize\s+(?:task\s+)?([a-z0-9-]+)\s+over\s+(?:task\s+)?([a-z0-9-]+)/i);
  if (prioritizeOver) {
    const [, higherId, lowerId] = prioritizeOver;
    const higher = tasks.find((t: any) => t.id.toUpperCase() === higherId.toUpperCase());
    const lower = tasks.find((t: any) => t.id.toUpperCase() === lowerId.toUpperCase());
    if (higher && lower) {
      return { action: 'reorder', higherId: higher.id, lowerId: lower.id };
    }
    return { action: 'error', message: `Could not find one or both tasks: ${higherId}, ${lowerId}` };
  }

  const setPriority = lower.match(/(?:make|set|change)\s+(?:task\s+)?([a-z0-9-]+)\s+(high|medium|low)\s+priority/i);
  if (setPriority) {
    const [, taskId, priority] = setPriority;
    const task = tasks.find((t: any) => t.id.toUpperCase() === taskId.toUpperCase());
    if (task) {
      return { action: 'setPriority', taskId: task.id, priority: priority as Priority };
    }
    return { action: 'error', message: `Task ${taskId} not found` };
  }

  return null;
}

async function dispatchToGitHub(task: any): Promise<string | null> {
  const config = await universalReadConfig();
  const pat = config.githubPat || process.env.GITHUB_PAT;
  const owner = config.githubRepoOwner || process.env.GITHUB_OWNER;
  const repo = config.githubRepoName || process.env.GITHUB_REPO;
  if (!pat || !owner || !repo) return null;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${pat}`,
          'User-Agent': 'agents-dashboard',
        },
        body: JSON.stringify({
          event_type: 'agent-task',
          client_payload: {
            taskId: task.id,
            title: task.title,
            description: task.description,
            assignee: task.assignee,
            priority: task.priority,
            branch: config.branch || 'main',
          },
        }),
      }
    );

    if (res.ok) {
      return `https://github.com/${owner}/${repo}/actions`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ ok: false, error: 'Message is required' }, { status: 400 });
    }

    const tasks = await universalReadTasks();

    // Check if this is a prioritization command
    const priorityCmd = parsePrioritizeCommand(message, tasks);
    if (priorityCmd) {
      if (priorityCmd.action === 'error') {
        return NextResponse.json({
          ok: true,
          data: {
            task: null,
            agentName: 'Product Manager',
            response: `⚠️ ${priorityCmd.message}`,
          },
        });
      }

      if (priorityCmd.action === 'reorder') {
        const { higherId, lowerId } = priorityCmd as { action: 'reorder'; higherId: string; lowerId: string };
        const higher = tasks.find((t: any) => t.id === higherId);
        const lower = tasks.find((t: any) => t.id === lowerId);
        const higherOrder = higher.order;
        higher.order = lower.order;
        lower.order = higherOrder;
        tasks.sort((a: any, b: any) => a.order - b.order);
        tasks.forEach((t: any, i: number) => { t.order = i; });
        await universalWriteTasks(tasks);

        return NextResponse.json({
          ok: true,
          data: {
            task: null,
            agentName: 'Product Manager',
            response: `✅ Reordered: **${higherId}** is now prioritized over **${lowerId}**.\n\n> ${higher.title}\n> ${lower.title}`,
          },
        });
      }

      if (priorityCmd.action === 'setPriority') {
        const { taskId, priority } = priorityCmd as { action: 'setPriority'; taskId: string; priority: Priority };
        const task = tasks.find((t: any) => t.id === taskId);
        task.priority = priority;
        await universalWriteTasks(tasks);

        return NextResponse.json({
          ok: true,
          data: {
            task,
            agentName: 'Product Manager',
            response: `✅ **${taskId}** priority set to **${priority}**.\n\n> ${task.title}`,
          },
        });
      }
    }

    // Check for list/reorder commands
    const lower = message.toLowerCase();
    if (lower.includes('list') || lower.includes('show') || lower.includes('all task') || lower.includes('my task')) {
      const byPriority: Record<string, any[]> = { high: [], medium: [], low: [] };
      tasks.forEach((t: any) => {
        if (byPriority[t.priority]) byPriority[t.priority].push(t);
      });

      let response = '📋 **All Tasks by Priority**\n\n';
      for (const p of ['high', 'medium', 'low'] as const) {
        if (byPriority[p].length > 0) {
          response += `**${p.toUpperCase()}**\n`;
          byPriority[p].forEach((t: any) => {
            response += `- ${t.id}: ${t.title} (_${t.status}, ${AGENT_NAMES[t.assignee] ?? t.assignee}_)\n`;
          });
          response += '\n';
        }
      }
      response += `_Total: ${tasks.length} tasks_`;

      return NextResponse.json({
        ok: true,
        data: { task: null, agentName: 'Product Manager', response },
      });
    }

    // Normal task creation
    const existingIds: string[] = tasks.map((t: { id: string }) => t.id);
    const newId = generateId(existingIds);
    const assignee = detectAgent(message);
    const agentName = AGENT_NAMES[assignee] ?? assignee;
    const priority = detectPriority(message);

    const title = message.length > 80 ? message.slice(0, 77) + '...' : message;

    const newTask = {
      id: newId,
      title,
      description: message,
      status: 'pending',
      priority,
      order: tasks.length,
      assignee,
      requestedBy: 'user',
      files: [],
      branch: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    tasks.push(newTask);
    await universalWriteTasks(tasks);

    const dispatchUrl = await dispatchToGitHub(newTask);
    const dispatchMsg = dispatchUrl
      ? `\n\n🚀 **Auto-dispatched to CI** — AI agent is working on it now. [View progress](${dispatchUrl})`
      : '\n\n_To run this task automatically in CI, configure GitHub credentials in [Settings](/agents/settings)._';

    return NextResponse.json({
      ok: true,
      data: {
        task: newTask,
        agentName,
        response: `✅ **${newId}** created — assigned to **${agentName}** with **${priority}** priority.\n\n> ${message}\n\nStatus: **Pending**.${dispatchMsg}`,
        dispatchUrl,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
