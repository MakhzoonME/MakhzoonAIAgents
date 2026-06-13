import { NextResponse } from 'next/server';
import { universalReadConfig, universalWriteConfig } from '@/lib/github/storage';

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
  projectPath: process.env.PWD || process.cwd(),
  gitUserName: '',
  gitUserEmail: '',
  autoSync: false,
  githubPat: '',
  githubRepoOwner: '',
  githubRepoName: '',
};

export async function GET() {
  try {
    const config = await universalReadConfig();
    return NextResponse.json({ ok: true, data: { ...DEFAULT_CONFIG, ...config } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const allowed = ['repoUrl', 'branch', 'projectPath', 'gitUserName', 'gitUserEmail', 'autoSync', 'githubPat', 'githubRepoOwner', 'githubRepoName'];
    const current = await universalReadConfig();

    for (const key of Object.keys(body)) {
      if (allowed.includes(key)) {
        (current as any)[key] = body[key];
      }
    }

    await universalWriteConfig(current);
    return NextResponse.json({ ok: true, data: { ...DEFAULT_CONFIG, ...current } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
