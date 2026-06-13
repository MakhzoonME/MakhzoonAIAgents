import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), '.opencode', 'config.json');

export interface RepoConfig {
  repoUrl: string;
  branch: string;
  projectPath: string;
  gitUserName: string;
  gitUserEmail: string;
  autoSync: boolean;
  githubPat: string;
  githubRepoOwner: string;
  githubRepoName: string;
}

const DEFAULT_CONFIG: RepoConfig = {
  repoUrl: '',
  branch: 'main',
  projectPath: process.cwd(),
  gitUserName: '',
  gitUserEmail: '',
  autoSync: false,
  githubPat: '',
  githubRepoOwner: '',
  githubRepoName: '',
};

function readConfig(): RepoConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

function writeConfig(config: RepoConfig) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const config = readConfig();
    return NextResponse.json({ ok: true, data: config });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const allowed = ['repoUrl', 'branch', 'projectPath', 'gitUserName', 'gitUserEmail', 'autoSync', 'githubPat', 'githubRepoOwner', 'githubRepoName'];
    const current = readConfig();

    for (const key of Object.keys(body)) {
      if (allowed.includes(key)) {
        (current as any)[key] = body[key];
      }
    }

    writeConfig(current);
    return NextResponse.json({ ok: true, data: current });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
