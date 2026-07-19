import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.join(root, 'agent', 'ccus-ai-agent');

function runCli(...args) {
  return spawnSync(
    process.execPath,
    ['agent/ccus-ai-agent/logic/cli.mjs', ...args],
    { cwd: root, encoding: 'utf8' }
  );
}

test('agent workspace exposes the product maintenance contract', () => {
  for (const file of [
    'AGENTS.md',
    'SKILL.md',
    'ARCHITECTURE.md',
    'METHODOLOGY.md',
    'RUNBOOK.md',
    'SAFETY.md',
    'DESIGN.md',
  ]) {
    assert.equal(fs.existsSync(path.join(workspace, file)), true, file);
  }
});

test('stale scratchpads and duplicate exporter are absent', () => {
  for (const file of [
    'TASKS.md',
    'FINDINGS.md',
    'PROGRESS.md',
    path.join('logic', 'export-md-fixed.mjs'),
  ]) {
    assert.equal(fs.existsSync(path.join(workspace, file)), false, file);
  }

  assert.equal(
    fs.existsSync(path.join(workspace, 'archive', '2026-04-task-history.md')),
    true
  );
});

test('maintenance CLI exposes help without touching the database', () => {
  const result = runCli('--help');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CCUS Policy Hub maintenance commands/);
  assert.match(result.stdout, /db:audit:deep/);
});

test('unknown maintenance commands fail instead of succeeding silently', () => {
  const result = runCli('not:a:real:command');
  assert.equal(result.status, 3, result.stderr || result.stdout);
  assert.match(result.stderr, /Unknown or non-canonical maintenance command/);
  assert.match(result.stderr, /manage:help/);
});

test('package scripts expose the validated CLI and remove retired no-op commands', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.manage, /logic\/cli\.mjs/);
  assert.match(pkg.scripts['manage:help'], /logic\/cli\.mjs/);
  assert.equal('manage:db:lint-governance' in pkg.scripts, false);
  assert.equal('manage:db:optimize' in pkg.scripts, false);
});
