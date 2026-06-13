/**
 * GitHub-backed storage — replaces fs for Cloudflare Workers.
 * Reads/writes .opencode/tasks.json and .opencode/config.json via GitHub API.
 */

const CONFIG_PATH = '.opencode/config.json';
const TASKS_PATH = '.opencode/tasks.json';

interface GitHubConfig {
  pat: string;
  owner: string;
  repo: string;
  branch?: string;
}

function getConfig(): GitHubConfig | null {
  // In Cloudflare Workers, env vars are available via process.env
  // In local dev, we read from the stored config
  const pat = process.env.GITHUB_PAT || '';
  const owner = process.env.GITHUB_OWNER || '';
  const repo = process.env.GITHUB_REPO || '';
  const branch = process.env.GITHUB_BRANCH || 'master';
  if (!pat || !owner || !repo) return null;
  return { pat, owner, repo, branch };
}

const GH_API = 'https://api.github.com';

async function gh(path: string, options: RequestInit = {}) {
  const cfg = getConfig();
  if (!cfg) throw new Error('GitHub not configured. Set GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO env vars.');

  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.pat}`,
      'User-Agent': 'agents-dashboard',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }

  return res;
}

export async function readFile(repoPath: string): Promise<string | null> {
  const cfg = getConfig();
  if (!cfg) return null;
  const branch = cfg.branch || 'master';

  const res = await gh(`/repos/${cfg.owner}/${cfg.repo}/contents/${repoPath}?ref=${branch}`);
  if (res.status === 404) return null;

  const data = await res.json();
  if (data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return null;
}

export async function writeFile(repoPath: string, content: string, message: string): Promise<void> {
  const cfg = getConfig();
  if (!cfg) throw new Error('GitHub not configured');
  const branch = cfg.branch || 'master';

  // Try to get existing file SHA
  let sha: string | undefined;
  const existing = await gh(`/repos/${cfg.owner}/${cfg.repo}/contents/${repoPath}?ref=${branch}`);
  if (existing.status === 200) {
    const data = await existing.json();
    sha = data.sha;
  }

  const body: any = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await gh(`/repos/${cfg.owner}/${cfg.repo}/contents/${repoPath}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to write ${repoPath}: ${errBody}`);
  }
}

// ── Tasks ──────────────────────────────────────────────

export async function readTasks(): Promise<any[]> {
  const raw = await readFile(TASKS_PATH);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return parsed.tasks ?? [];
  } catch {
    return [];
  }
}

export async function writeTasks(tasks: any[]): Promise<void> {
  const data = JSON.stringify({ schema: 1, tasks }, null, 2);
  await writeFile(TASKS_PATH, data, `feat(agents): update tasks [skip ci]`);
}

// ── Config ─────────────────────────────────────────────

export async function readAppConfig(): Promise<Record<string, any>> {
  const raw = await readFile(CONFIG_PATH);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function writeAppConfig(config: Record<string, any>): Promise<void> {
  const data = JSON.stringify(config, null, 2);
  await writeFile(CONFIG_PATH, data, `chore(agents): update config [skip ci]`);
}

// ── Helper to detect if we're in a Workers environment ─

export function isWorkersEnv(): boolean {
  return typeof (globalThis as any).caches !== 'undefined' || typeof process?.env?.CF_PAGES !== 'undefined';
}

/**
 * Universal read — tries local fs first, falls back to GitHub API.
 * This keeps local dev working while supporting Cloudflare deployment.
 */
export async function universalReadTasks(): Promise<any[]> {
  // Try local fs first (local dev)
  try {
    const fs = await import('fs');
    const path = await import('path');
    const tasksPath = path.join(process.cwd(), '.opencode', 'tasks.json');
    if (fs.existsSync(tasksPath)) {
      const raw = fs.readFileSync(tasksPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed.tasks ?? [];
    }
  } catch {}

  // Fallback to GitHub API (Cloudflare Workers)
  return readTasks();
}

export async function universalWriteTasks(tasks: any[]): Promise<void> {
  // Local dev
  try {
    const fs = await import('fs');
    const path = await import('path');
    const tasksPath = path.join(process.cwd(), '.opencode', 'tasks.json');
    const data = JSON.stringify({ schema: 1, tasks }, null, 2);
    fs.writeFileSync(tasksPath, data, 'utf-8');
    return;
  } catch {}

  // Cloudflare Workers
  await writeTasks(tasks);
}

export async function universalReadConfig(): Promise<Record<string, any>> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), '.opencode', 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return readAppConfig();
}

export async function universalWriteConfig(config: Record<string, any>): Promise<void> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), '.opencode', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return;
  } catch {}
  await writeAppConfig(config);
}
