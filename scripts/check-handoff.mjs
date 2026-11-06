#!/usr/bin/env node
// Minimal continuity gate: every commit that changes working project files
// must also update PROJECT-STATE and CHANGELOG IN THAT SAME COMMIT.
// It cannot replace review, branch protection, usability or gameplay tests.
import { execFileSync } from 'node:child_process';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}
function commitParents(sha) {
  return git('rev-list', '--parents', '-n', '1', sha).split(/\s+/);
}
function changedPaths(sha) {
  const parents = commitParents(sha);
  if (parents.length === 1) return [];
  return git('diff', '--name-only', parents[1], sha)
    .split('\n').map(path => path.trim()).filter(Boolean);
}
function pushCommitList() {
  const before = process.env.BEFORE_SHA || '';
  const head = process.env.GITHUB_SHA || 'HEAD';
  if (/^[a-f0-9]{40}$/.test(before) && !/^0+$/.test(before)) {
    try {
      const list = git('rev-list', '--reverse', before + '..' + head);
      if (list) return list.split('\n');
    } catch (error) {
      console.warn('Cannot compare full push range; checking HEAD only:', error.message);
    }
  }
  // On a new branch, manual run, or PR merge checkout, validate the checked-out commit.
  return [head];
}

let failed = false;
const commits = pushCommitList();
for (const sha of commits) {
  let changed;
  try {
    changed = changedPaths(sha);
  } catch (error) {
    console.error('Cannot inspect commit ' + sha + ': ' + error.message);
    process.exit(2);
  }
  const trackedSource = changed.filter(path =>
    /^(web\/|preview\/|server\/|scripts\/|assets\/|public\/|package\.json$|package-lock\.json$|\.github\/workflows\/)/.test(path)
  );
  if (trackedSource.length === 0) continue;
  const missing = ['docs/PROJECT-STATE.md', 'docs/CHANGELOG.md']
    .filter(path => !changed.includes(path));
  if (missing.length > 0) {
    failed = true;
    console.error('Handoff FAILED for commit ' + sha.slice(0, 12));
    console.error('Project changes: ' + trackedSource.join(', '));
    console.error('Missing same-commit docs: ' + missing.join(', '));
  } else {
    console.log('Handoff OK for ' + sha.slice(0, 12));
  }
}
if (failed) {
  console.error('Update docs/PROJECT-STATE.md and docs/CHANGELOG.md in the SAME commit as source/config changes.');
  console.error('See docs/WORKFLOW.md. CI flags violations; branch protection is not configured here.');
  process.exit(1);
}
console.log('Godscar handoff check passed for ' + commits.length + ' commit(s).');
