'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitBranch, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { RepoConfig } from '@/app/api/agents/settings/route';

export default function SettingsPage() {
  const [config, setConfig] = useState<RepoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/agents/settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setConfig(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/agents/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: json.error ?? 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to connect' });
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof RepoConfig>(key: K, value: RepoConfig[K]) {
    if (!config) return;
    setConfig({ ...config, [key]: value });
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/agents" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Agent Configuration</h1>
            <p className="text-xs text-gray-500">Connect your repository and manage agent settings</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {message && (
          <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-xs p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-gray-500" />
            Repository Connection
          </h2>
          <p className="text-xs text-gray-500 mb-5">Point the AI agents to any Git repository to start working.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GitHub / Git Repo URL</label>
              <input
                type="text"
                value={config?.repoUrl ?? ''}
                onChange={(e) => update('repoUrl', e.target.value)}
                placeholder="https://github.com/your-org/your-repo.git"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Repo Owner</label>
                <input
                  type="text"
                  value={config?.githubRepoOwner ?? ''}
                  onChange={(e) => update('githubRepoOwner', e.target.value)}
                  placeholder="your-org-or-username"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Repo Name</label>
                <input
                  type="text"
                  value={config?.githubRepoName ?? ''}
                  onChange={(e) => update('githubRepoName', e.target.value)}
                  placeholder="your-repo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                <input
                  type="text"
                  value={config?.branch ?? 'main'}
                  onChange={(e) => update('branch', e.target.value)}
                  placeholder="main"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Path</label>
                <input
                  type="text"
                  value={config?.projectPath ?? ''}
                  onChange={(e) => update('projectPath', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-xs p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">GitHub Personal Access Token</h2>
          <p className="text-xs text-gray-500 mb-5">Required for auto-dispatching tasks to GitHub Actions. Needs <code className="text-gray-700">repo</code> scope.</p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">PAT (classic or fine-grained)</label>
            <input
              type="password"
              value={config?.githubPat ?? ''}
              onChange={(e) => update('githubPat', e.target.value)}
              placeholder="ghp_..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Create at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">github.com/settings/tokens</a> with <code className="text-gray-500">repo</code> scope.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-xs p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Git Identity</h2>
          <p className="text-xs text-gray-500 mb-5">The name and email that will appear in commits made by agents.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Git User Name</label>
              <input
                type="text"
                value={config?.gitUserName ?? ''}
                onChange={(e) => update('gitUserName', e.target.value)}
                placeholder="AI Agent"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Git User Email</label>
              <input
                type="email"
                value={config?.gitUserEmail ?? ''}
                onChange={(e) => update('gitUserEmail', e.target.value)}
                placeholder="agent@your-org.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-xs p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Auto-sync with Repository</h2>
              <p className="text-xs text-gray-500">Agent commits are automatically pushed to the remote</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.autoSync ?? false}
                onChange={(e) => update('autoSync', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  );
}
