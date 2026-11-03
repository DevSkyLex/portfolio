// Tests of guard-delete.mjs: `node --test .claude/hooks/guard-delete.test.mjs`. Nothing is deleted.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateDelete } from './guard-delete.mjs';

/**
 * Constant here
 *
 * @description
 * Directory containing this test module, used to locate the delete guard executable.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

for (const [command, denied] of [
  ['rm -rf C:/Users/someone/project', true],
  ['rm -rf ~/work', true],
  ['rm -rf /', true],
  ['rm -rf ../site', true],
  ['rm -rf site', true],
  ['rm -rf G:/Projets/portfolio', true],
  ['Remove-Item -Recurse -Force G:/Projets/portfolio/site', true],
  ['rm -rf .git', true],
  ['rm -rf .data', true],
  ['rm -rf .data/content', true],
  ['rm .data/dev-admin.env', true],
  ['Remove-Item -Recurse .data\\identity-keys', true],
  ['rm ansible/inventory/group_vars/all/vault.yml', true],
  ['rm ansible/.vault-pass', true],
  ['Remove-Item -Recurse -Force C:/Users/someone/project', true],
  ['cd /g/Projets/x && rm -rf dist', false],
  ['rm -rf dist', false],
  ['rm -rf dist/apps/web', false],
  ['rm -rf node_modules', false],
  ['rm -rf coverage test-results playwright-report', false],
  ['rm -rf .angular .nx/cache', false],
  ['rm -rf /tmp/pf-scratch', false],
  ['rm -f docs/old.md', false],
  ['rm -rf libs/frontend/ui/src/lib/site-banner', false],
  ['git rm -r libs/frontend/legal/feature/src/lib/old', false],
  ['echo done', false],
]) {
  void test(`guard-delete: ${command}`, () =>
    assert.equal(evaluateDelete(command) !== null, denied));
}

void test('the CLI denies with exit 2 and passes malformed input', () => {
  /**
   * Function run
   *
   * @description
   * Starts the delete guard with raw hook input and captures the process response.
   *
   * @param {string} input - Hook payload text passed to standard input.
   * @returns {import('node:child_process').SpawnSyncReturns<string>} Child process result.
   */
  const run = (input) =>
    spawnSync(process.execPath, [path.join(here, 'guard-delete.mjs')], {
      input,
      encoding: 'utf8',
      windowsHide: true,
    });
  const result = run(JSON.stringify({ tool_input: { command: 'rm -rf .data' } }));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Blocked: delete of untracked local data/);
  assert.equal(run(JSON.stringify({ tool_input: { cmd: 'rm -rf dist' } })).status, 0);
  assert.equal(run('not json').status, 0);
});
