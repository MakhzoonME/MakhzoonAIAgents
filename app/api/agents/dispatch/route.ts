import { NextResponse } from 'next/server';
import { universalReadTasks, universalReadConfig } from '@/lib/github/storage';

async function dispatchToGitHub(task: any): Promise<{ ok: boolean; url?: string; error?: string }> {
  const config = await universalReadConfig();
  const pat = config.githubPat || process.env.GITHUB_PAT;
  const owner = config.githubRepoOwner || process.env.GITHUB_OWNER;
  const repo = config.githubRepoName || process.env.GITHUB_REPO;
  const branch = config.branch || process.env.GITHUB_BRANCH || 'main';

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
            branch,
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

    const tasks = await universalReadTasks();
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
