import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TASKS_PATH = path.join(process.cwd(), '.opencode', 'tasks.json');
const CONFIG_PATH = path.join(process.cwd(), '.opencode', 'config.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {}
  return {};
}

async function dispatchToGitHub(task: any): Promise<{ ok: boolean; url?: string; error?: string }> {
  const config = readConfig();
  const pat = config.githubPat;
  const owner = config.githubRepoOwner;
  const repo = config.githubRepoName;
  if (!pat || !owner || !repo) {
    return { ok: false, error: 'GitHub PAT or repo not configured. Go to Settings.' };
  }

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
      return { ok: true, url: `https://github.com/${owner}/${repo}/actions` };
    }
    const body = await res.text();
    return { ok: false, error: `GitHub API returned ${res.status}: ${body}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return NextResponse.json({ ok: false, error: 'taskId is required' }, { status: 400 });
    }

    const raw = fs.readFileSync(TASKS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const tasks = data.tasks ?? [];
    const task = tasks.find((t: any) => t.id === taskId);

    if (!task) {
      return NextResponse.json({ ok: false, error: `Task ${taskId} not found` }, { status: 404 });
    }

    const result = await dispatchToGitHub(task);
    return NextResponse.json({ ok: result.ok, data: result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
