// Tests of format.mjs: `node --test .claude/hooks/format.test.mjs`.
// Formatting cases run in a temporary project outside the checkout and remove it.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { findFormatRoot, isFormattable } from './format.mjs';

/**
 * Constant here
 *
 * @description
 * Directory containing this test module, used to locate the formatter hook executable.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
/**
 * Constant root
 *
 * @description
 * Repository root whose Prettier installation and configuration are exercised by hook tests.
 */
const root = path.resolve(here, '../..');

/**
 * Function run
 *
 * @description
 * Runs the formatter hook with a synthetic post-write payload for one candidate path.
 *
 * @param {string} file - File path supplied to the hook payload.
 * @returns {import('node:child_process').SpawnSyncReturns<string>} Child process result.
 */
const run = (file) =>
  spawnSync(process.execPath, [path.join(here, 'format.mjs')], {
    cwd: root,
    input: JSON.stringify({ cwd: root, tool_name: 'Edit', tool_input: { file_path: file } }),
    encoding: 'utf8',
    windowsHide: true,
  });

void test('selects formattable files and skips generated or installed ones', () => {
  assert.equal(isFormattable(path.join(root, 'docs', 'architecture', 'decisions.md')), true);
  assert.equal(isFormattable(path.join(root, 'libs', 'frontend', 'ui', 'src', 'index.ts')), true);
  assert.equal(isFormattable(path.join(root, 'apps', 'web', 'src', 'styles.css')), true);
  assert.equal(isFormattable(path.join(root, 'docker', 'compose.dev.yml')), true);
  assert.equal(isFormattable(path.join(root, '.codex', 'agents', 'x.toml')), false);
  assert.equal(isFormattable(path.join(root, '.codex', 'scripts', 'validate.py')), false);
  assert.equal(isFormattable(path.join(root, 'package-lock.json')), false);
  assert.equal(isFormattable(path.join(root, 'dist', 'apps', 'web', 'x.json')), false);
  assert.equal(isFormattable(path.join(root, '.nx', 'workspace-data', 'x.json')), false);
  assert.equal(
    isFormattable(path.join(root, '.agents', 'skills', 'nx-workspace', 'SKILL.md')),
    false,
  );
  assert.equal(isFormattable(path.join(root, 'ansible', '.collections', 'x.yml')), false);
});

void test('finds the repository through .prettierrc', () => {
  assert.equal(findFormatRoot(path.join(root, 'docs', 'architecture', 'x.md')), root);
});

/**
 * Function scratchProject
 *
 * @description
 * Creates a temporary Prettier project whose `node_modules` junction points to the checkout installation.
 * Formatting stays outside the checkout while the repository's Prettier package is reused.
 *
 * @returns {string} Path to the temporary project directory.
 */
function scratchProject() {
  const dir = mkdtempSync(path.join(tmpdir(), 'pf-format-project-'));
  writeFileSync(path.join(dir, '.prettierrc'), '{ "singleQuote": true, "printWidth": 100 }\n');
  symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
  return dir;
}

/**
 * Constant hasPrettier
 *
 * @description
 * Indicates whether formatter integration cases can run against the checkout's installed Prettier package.
 */
const hasPrettier = existsSync(path.join(root, 'node_modules', 'prettier'));

void test(
  'formats an edited file with the project Prettier configuration',
  { skip: !hasPrettier },
  () => {
    const dir = scratchProject();
    try {
      const file = path.join(dir, 'fixture.mjs');
      writeFileSync(file, 'const  value = {a:1,b:"two"}\nexport default value\n');
      const result = run(file);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        readFileSync(file, 'utf8'),
        "const value = { a: 1, b: 'two' };\nexport default value;\n",
      );
    } finally {
      unlinkSync(path.join(dir, 'node_modules'));
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

void test('reports a syntax error with exit 2', { skip: !hasPrettier }, () => {
  const dir = scratchProject();
  try {
    const file = path.join(dir, 'broken.mjs');
    writeFileSync(file, 'const = ;\n');
    assert.equal(run(file).status, 2);
  } finally {
    unlinkSync(path.join(dir, 'node_modules'));
    rmSync(dir, { recursive: true, force: true });
  }
});

void test('is a no-op outside any Prettier project, for a missing file and for an unknown type', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pf-format-'));
  try {
    const file = path.join(dir, 'x.mjs');
    writeFileSync(file, 'const  a=1\n');
    assert.equal(run(file).status, 0);
    assert.equal(readFileSync(file, 'utf8'), 'const  a=1\n');
    assert.equal(run(path.join(dir, 'missing.mjs')).status, 0);
    assert.equal(run(path.join(root, '.codex', 'config.toml')).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
