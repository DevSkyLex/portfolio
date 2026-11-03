// Tests of the Codex hook adapter: `node --test .codex/hooks/adapter.test.mjs`.
// Every case is a dry run: the adapter parses patches and never applies them.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { editsFromPatch } from './adapter.mjs';
import { isImmutableSource } from './protected-paths.mjs';

/**
 * Constant root
 *
 * @description
 * Checkout root used as the default working directory for simulated hook events.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Function patch
 *
 * @description
 * Wraps patch operations in the apply-patch envelope.
 */
const patch = (body) => ({ command: `*** Begin Patch\n${body}\n*** End Patch` });

/**
 * Function invoke
 *
 * @description
 * Runs the adapter in a child process with one simulated tool event.
 */
function invoke(tool_name, tool_input, phase = 'pre', cwd = root) {
  return spawnSync(process.execPath, [path.join(root, '.codex/hooks/adapter.mjs'), phase], {
    cwd,
    input: JSON.stringify({ cwd, tool_name, tool_input }),
    encoding: 'utf8',
    windowsHide: true,
  });
}

/**
 * Function check
 *
 * @description
 * Asserts the adapter status for an apply-patch body (refusal by default).
 *
 * @returns {void}
 */
function check(body, status = 2) {
  const result = invoke('apply_patch', patch(body));
  assert.equal(result.status, status, result.stderr);
}

void test('parses multiple file edits and their rename destinations', () => {
  const edits = editsFromPatch(
    patch(
      '*** Add File: a.md\n+hello\n*** Update File: b.md\n*** Move to: c.md\n@@\n-old\n+new\n*** Delete File: d.md',
    ).command,
  );
  assert.equal(edits.length, 3);
  assert.equal(edits[1].destination, 'c.md');
  assert.match(edits[1].content, /new/);
  assert.doesNotMatch(edits[1].content, /old/);
});

void test('rejects incomplete and missing patch payloads', () => {
  assert.equal(invoke('apply_patch', {}).status, 2);
  assert.throws(() => editsFromPatch('*** Begin Patch\n*** Add File: a.md\n+x'));
});

void test('checks documentation without writing it', () => {
  check('*** Add File: docs/guard-test.md\n+Example', 0);
  assert.equal(existsSync(path.join(root, 'docs/guard-test.md')), false);
});

void test('accepts native string patch arguments', () => {
  assert.equal(
    invoke('apply_patch', patch('*** Add File: docs/guard-test.md\n+Example').command).status,
    0,
  );
});

for (const file of [
  'dist/apps/web/browser/index.html',
  'node_modules/example/index.js',
  'package-lock.json',
  'apps/web/src/locale/messages.xlf',
  'apps/web/content-snapshot/fr.json',
  '.git/config',
  'apps/content-service/.env',
  '.data/content/x',
  'ansible/inventory/group_vars/all/vault.yml',
]) {
  void test(`protects ${file} from patch changes`, () => check(`*** Add File: ${file}\n+example`));
}

void test('checks the destination of a rename', () =>
  check('*** Update File: docs/example.md\n*** Move to: dist/apps/web/x.md\n@@\n-old\n+new'));
void test('checks later files in a patch', () =>
  check('*** Add File: docs/example.md\n+ok\n*** Add File: package-lock.json\n+no'));
void test('rejects traversal beyond the checkout', () => check('*** Add File: ../outside.md\n+no'));
void test('applies the content rules of guard.mjs', () =>
  check(
    "*** Add File: libs/backend/contact/domain/src/lib/x.ts\n+import { Injectable } from '@nestjs/common';",
  ));

for (const file of [
  '.agents/skills/nx-workspace/SKILL.md',
  '.agents/skills/angular-developer/SKILL.md',
  '.codex/agents/ci-monitor-subagent.toml',
]) {
  void test(`rejects changes and deletions of externally managed ${file}`, () => {
    check(`*** Add File: ${file}\n+example`);
    check(`*** Update File: ${file}\n@@\n-old\n+new`);
    check(`*** Delete File: ${file}`);
    check(`*** Update File: docs/example.md\n*** Move to: ${file}\n@@\n-old\n+new`);
  });
  void test(`post hook leaves externally managed ${file} unchanged`, () => {
    const before = readFileSync(path.join(root, file));
    assert.equal(
      invoke('apply_patch', patch(`*** Update File: ${file}\n@@\n-old\n+new`), 'post').status,
      0,
    );
    assert.deepEqual(readFileSync(path.join(root, file)), before);
  });
}

for (const file of [
  '.agents/skills/pf-/SKILL.md',
  '.agents/skills/pf-nestjs/../angular-developer/SKILL.md',
]) {
  void test(`protects externally owned skill ${file} through every patch operation`, () => {
    check(`*** Add File: ${file}\n+example`);
    check(`*** Update File: ${file}\n@@\n-old\n+new`);
    check(`*** Delete File: ${file}`);
    check(`*** Update File: docs/example.md\n*** Move to: ${file}\n@@\n-old\n+new`);
    assert.equal(isImmutableSource(root, path.join(root, file)), true);
  });
}

void test('permits authored shared skills while preserving external skill ownership', () => {
  const file = '.agents/skills/pf-nestjs/SKILL.md';
  check(`*** Add File: ${file}\n+example`, 0);
  check(`*** Update File: ${file}\n@@\n-old\n+new`, 0);
  check(`*** Delete File: ${file}`, 0);
  check(`*** Update File: docs/example.md\n*** Move to: ${file}\n@@\n-old\n+new`, 0);
  assert.equal(isImmutableSource(root, path.join(root, file)), false);
  assert.equal(isImmutableSource(root, path.join(root, '.agents/skills/pf-/SKILL.md')), true);
  assert.equal(isImmutableSource(root, path.join(root, '.agents/skills/pf-nestjs')), true);
  assert.equal(
    isImmutableSource(root, path.join(root, '.AGENTS/SKILLS/PF-NESTJS/SKILL.md')),
    false,
  );
  assert.equal(
    isImmutableSource(root, path.join(root, '.AGENTS/SKILLS/ANGULAR-DEVELOPER/SKILL.md')),
    process.platform === 'win32',
  );
});

void test('immutable prefixes are matched case-insensitively on Windows only', () => {
  assert.equal(isImmutableSource(root, path.join(root, 'ansible', '.collections', 'x.yml')), true);
  assert.equal(
    isImmutableSource(root, path.join(root, 'ansible', 'roles', 'base', 'tasks', 'main.yml')),
    false,
  );
});

void test('allows maintenance of the Codex tooling itself', () =>
  check('*** Update File: .codex/workflow.md\n@@\n-old\n+new', 0));

for (const [command, status] of [
  ['git status --short', 0],
  ['git switch -c feat/contact-form', 0],
  ['git switch -c codex/agent-work', 2],
  ['git commit -m "chore(codex): add hooks"', 0],
  ['git push origin main', 2],
  ['git push --force', 2],
  ['gh pr merge 1', 2],
  ['gh workflow run deploy.yml', 2],
  ['ansible-playbook playbooks/deploy.yml -e tag=abc', 2],
  ['npx nx affected -t lint typecheck test build', 0],
  ['git reset --hard', 2],
  ['rm -rf dist', 0],
  ['rm -rf .data', 2],
  ['rm -rf /', 2],
]) {
  void test(`shell: ${command}`, () => {
    const result = invoke('Bash', { command });
    assert.equal(result.status, status, result.stderr);
  });
}

void test('accepts unified exec cmd input', () =>
  assert.equal(invoke('exec_command', { cmd: 'git status --short' }).status, 0));
void test('rejects a push to main through unified exec and PowerShell input', () => {
  assert.equal(invoke('exec_command', { cmd: 'git push origin main' }).status, 2);
  assert.equal(invoke('PowerShell', { command: 'git push origin main' }).status, 2);
});
void test('post hook skips a deleted file and shell calls', () => {
  assert.equal(invoke('apply_patch', patch('*** Delete File: docs/absent.xyz'), 'post').status, 0);
  assert.equal(invoke('Bash', { command: 'git push origin main' }, 'post').status, 0);
});

void test('manifest hook resolves from a nested working directory', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, '.codex/hooks.json'), 'utf8'));
  const command = manifest.hooks.PreToolUse[0].hooks[0].command;
  const cwd = path.join(root, '.codex/hooks');
  const result = spawnSync(command, {
    shell: true,
    cwd,
    input: JSON.stringify({
      cwd,
      tool_name: 'Bash',
      tool_input: { command: 'git status --short' },
    }),
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
});
