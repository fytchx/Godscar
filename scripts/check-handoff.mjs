#!/usr/bin/env node
// Handoff gate: a code/config/asset change commit must carry durable docs in that SAME commit.
// This enforces a basic continuity rule, not design quality, approval or deploy success.
import { execFileSync } from 'node:child_process';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const ref = process.argv[2] || 'HEAD';
let parents;
try {
  parents = git('rev-list', '--parents', '-n', '1', ref).split(/\s+/);
} catch (error) {
  console.error('Cannot inspect commit:', error.message);
  process.exit(2);
}
if (parents.length < 2) {
  console.log('Root commit: no parent to compare. Skipping handoff gate.');
  process.exit(0);
}
// For a merge commit, compare with first parent. Source PR commit gates should
// also run independently so that a merge cannot hide undocumented changes.
const changed = git('diff-tree', '--no-commit-id', '--name-only', '-r', parents[0])
  .split('\n')
  .map(path => path.trim())
  .filter(Boolean);
const trackedSource = changed.filter(path =>
  /^(web\/|preview\/|server\/|scripts\/|assets\/|public\/|package\.json$|package-lock\.json$|\.github\/workflows\/)/.test(path)
);
if (trackedSource.length === 0) {
  console.log('Documentation-only change: no source handoff required.');
  process.exit(0);
}
const missing = ['docs/PROJECT-STATE.md', 'docs/CHANGELOG.md']
  .filter(path => !changed.includes(path));
if (missing.length) {
  console.error('Handoff gate FAILED. This commit changes project files:');
  for (const path of trackedSource) console.error('  ' + path);
  console.error('Missing same-commit continuity updates:', missing.join(', '));
  console.error('Follow docs/WORKFLOW.md and commit code + state + changelog atomically.');
  process.exit(1);
}
console.log('Handoff gate passed. Project state and changelog updated with source changes.');
