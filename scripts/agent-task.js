/**
 * AI Agent Task Runner — runs inside GitHub Actions CI.
 *
 * Reads task details from env vars, scans the repo,
 * calls an AI API (Anthropic or OpenAI) to generate changes,
 * applies them to the filesystem. The `create-pull-request`
 * action picks up the changes and creates a PR.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Config ─────────────────────────────────────────────
const TASK_ID = process.env.TASK_ID || 'unknown';
const TITLE = process.env.TASK_TITLE || '';
const DESCRIPTION = process.env.TASK_DESCRIPTION || '';
const ASSIGNEE = process.env.TASK_ASSIGNEE || 'frontend';
const PRIORITY = process.env.TASK_PRIORITY || 'medium';
const AI_PROVIDER = process.env.AI_PROVIDER || 'anthropic';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const GH_TOKEN = process.env.GH_TOKEN || '';

const REPO_ROOT = process.cwd();
const MAX_CONTEXT_FILES = 40;

// ── Helpers ────────────────────────────────────────────

function log(...args) {
  console.log(`[agent]`, ...args);
}

function exec(cmd, opts = {}) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf-8', ...opts });
}

function getRepoStructure(dir = REPO_ROOT, prefix = '') {
  const ignore = new Set([
    'node_modules', '.git', '.next', 'cache', 'dist', 'build',
    '.github', '.opencode', 'package-lock.json',
  ]);
  const entries = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (ignore.has(item)) continue;
      const fullPath = path.join(dir, item);
      const relPath = prefix ? `${prefix}/${item}` : item;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        entries.push({ path: relPath, type: 'dir' });
        entries.push(...getRepoStructure(fullPath, relPath));
      } else if (stat.isFile() && !item.startsWith('.')) {
        entries.push({ path: relPath, type: 'file', size: stat.size });
      }
    }
  } catch {}
  return entries;
}

function getGitDiff() {
  try {
    return exec('git diff --stat');
  } catch {
    return '';
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf-8');
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  const fullPath = path.join(REPO_ROOT, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  log(`  wrote ${filePath}`);
}

function fileExists(filePath) {
  return fs.existsSync(path.join(REPO_ROOT, filePath));
}

function deleteFile(filePath) {
  const fullPath = path.join(REPO_ROOT, filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    log(`  deleted ${filePath}`);
  }
}

// ── Repo scan ─────────────────────────────────────────

function buildContext() {
  log('Scanning repository...');
  const structure = getRepoStructure();
  const fileTree = structure
    .filter((e) => e.type === 'file')
    .map((e) => e.path);

  // Read key config files
  const configFiles = [
    'package.json', 'tsconfig.json', 'next.config.mjs',
    'tailwind.config.ts', 'postcss.config.mjs',
  ];
  const configs = {};
  for (const f of configFiles) {
    const content = readFile(f);
    if (content) configs[f] = content;
  }

  // Find relevant files based on task description
  const keywords = DESCRIPTION.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const relevantFiles = fileTree.filter((f) => {
    const lower = f.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });

  // Read relevant files (up to limit)
  const relevantContent = {};
  const filesToRead = [...new Set([...relevantFiles, ...configFiles])].slice(0, MAX_CONTEXT_FILES);
  for (const f of filesToRead) {
    const content = readFile(f);
    if (content) relevantContent[f] = content;
  }

  return { fileTree, configs, relevantContent };
}

// ── AI Call ────────────────────────────────────────────

async function callAI(prompt) {
  if (AI_PROVIDER === 'openai' && OPENAI_KEY) {
    return callOpenAI(prompt);
  }
  if (ANTHROPIC_KEY) {
    return callAnthropic(prompt);
  }
  throw new Error(
    'No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY as a repository secret.'
  );
}

async function callAnthropic(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Anthropic API error: ${JSON.stringify(json)}`);
  return json.content[0].text;
}

async function callOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OpenAI API error: ${JSON.stringify(json)}`);
  return json.choices[0].message.content;
}

// ── Apply changes from AI response ────────────────────

function applyChanges(response) {
  // The AI returns a JSON block with operations
  let json;
  try {
    // Extract JSON from the response (handle markdown code fences)
    const match = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (match) {
      json = JSON.parse(match[1]);
    } else {
      // Try parsing the entire response
      const start = response.indexOf('[');
      const end = response.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        json = JSON.parse(response.slice(start, end + 1));
      } else {
        throw new Error('No JSON array found in response');
      }
    }
  } catch (e) {
    log('Failed to parse AI response as JSON. Raw response:');
    log(response.slice(0, 2000));
    throw new Error(`Parse error: ${e.message}`);
  }

  if (!Array.isArray(json)) {
    throw new Error('AI response is not an array of operations');
  }

  for (const op of json) {
    if (!op.action || !op.file) {
      log('  skipping invalid operation:', JSON.stringify(op));
      continue;
    }

    switch (op.action) {
      case 'create':
      case 'write':
        writeFile(op.file, op.content || '');
        break;
      case 'edit':
        if (fileExists(op.file)) {
          writeFile(op.file, op.content);
        } else {
          log(`  skip edit — ${op.file} does not exist`);
        }
        break;
      case 'delete':
        deleteFile(op.file);
        break;
      default:
        log(`  unknown action: ${op.action}`);
    }
  }

  log(`Applied ${json.length} operations`);
}

// ── Main ───────────────────────────────────────────────

async function main() {
  log(`Task: ${TASK_ID} — ${TITLE}`);
  log(`Assignee: ${ASSIGNEE} | Priority: ${PRIORITY}`);
  log('');

  const context = buildContext();
  log(`Found ${context.fileTree.length} files in repo`);
  log(`Reading ${Object.keys(context.relevantContent).length} relevant files`);

  const fileTreeStr = context.fileTree.join('\n');
  const configStr = Object.entries(context.configs)
    .map(([name, content]) => `--- ${name} ---\n${content}`)
    .join('\n\n');
  const relevantStr = Object.entries(context.relevantContent)
    .map(([name, content]) => `--- ${name} ---\n${content}`)
    .join('\n\n');

  const prompt = `You are an AI coding agent running in a GitHub Action. Your task is to implement the following feature/bugfix by making file changes to this repository.

## Task
- **ID:** ${TASK_ID}
- **Title:** ${TITLE}
- **Description:** ${DESCRIPTION}
- **Priority:** ${PRIORITY}
- **Assigned to:** ${ASSIGNEE}

## Repository file tree
\`\`\`
${fileTreeStr}
\`\`\`

## Key configuration files
${configStr}

## Relevant source files
${relevantStr}

## Instructions
1. Analyze the task and the codebase.
2. Plan what files need to be created, modified, or deleted.
3. Return a JSON array of operations. Each operation is an object:

For creating a new file:
\`\`\`json
{ "action": "create", "file": "path/to/new-file.ts", "content": "// file content here" }
\`\`\`

For editing an existing file:
\`\`\`json
{ "action": "edit", "file": "path/to/existing-file.ts", "content": "// full new content of the file" }
\`\`\`

For deleting a file:
\`\`\`json
{ "action": "delete", "file": "path/to/file-to-delete.ts" }
\`\`\`

4. Make sure the changes are complete, working, and follow the existing code style (imports, naming conventions, etc).
5. If the task is a feature that requires new files, create them. If it's a bugfix, edit the relevant files.
6. Return ONLY the JSON array wrapped in a code block. No other text.`;

  log('Sending to AI...');
  const response = await callAI(prompt);
  log('Received AI response');

  applyChanges(response);

  const diff = getGitDiff();
  if (diff.trim()) {
    log('\nChanges made:');
    log(diff);
  } else {
    log('\nNo changes were made — the AI may have determined nothing needed to change.');
  }

  log('\nDone.');
}

main().catch((err) => {
  console.error('[agent] Fatal error:', err.message);
  process.exit(1);
});
