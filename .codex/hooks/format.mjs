#!/usr/bin/env node
/**
 * PostToolUse hook (portfolio): format the file that was just written with the repository's own Prettier
 * and `.prettierrc` (single quotes, width 100, Tailwind class sorting), so no edit fails
 * `npx nx format:check` for whitespace alone.
 *
 * The same file runs for Claude Code and, through the Codex adapter, for Codex edits.
 *
 *  - Formats `.ts .mts .cts .js .mjs .cjs .json .html .css .scss .md .mdx .yml .yaml`; anything else is a
 *    silent no-op.
 *  - Skips generated trees and installed collections, and lets Prettier apply `.prettierignore` and
 *    `.gitignore` (an explicitly passed ignored file is left untouched).
 *  - Finds the repository by walking up from the edited file to `.prettierrc`: the script's own location
 *    is useless in plugin mode, where it runs from a cached copy.
 *  - Degrades to a no-op when Prettier is not installed (fresh checkout). A real formatting failure (a
 *    syntax error) is reported on stderr with exit 2 so the agent sees it.
 *
 * Prettier's bin entry is run with `process.execPath` rather than `npx`: no npx start-up on every edit and
 * no shell quoting of Windows paths.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Constant FORMATTABLE
 * @readonly
 *
 * @description
 * File extensions that the post-write hook may pass to the workspace Prettier binary.
 */
const FORMATTABLE = new Set([
  '.ts',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
  '.css',
  '.scss',
  '.md',
  '.mdx',
  '.yml',
  '.yaml',
]);

/**
 * Constant SKIP
 * @readonly
 *
 * @description
 * Normalized path fragments protected from formatting because they are generated, installed or tool-managed.
 */
const SKIP = [
  '/node_modules/',
  '/dist/',
  '/tmp/',
  '/coverage/',
  '/test-results/',
  '/playwright-report/',
  '/.angular/',
  '/.nx/',
  '/.git/',
  '/out-tsc/',
  '/.agents/skills/',
  '/ansible/.collections/',
];

/**
 * Function findFormatRoot
 *
 * @description
 * Finds the nearest ancestor with a Prettier config, which identifies the repository formatter to use.
 *
 * @param {string} file - Edited file.
 * @returns {string | null} The formatting root, or null outside a Prettier project.
 */
export function findFormatRoot(file) {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    if (existsSync(path.join(dir, '.prettierrc'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Function isFormattable
 *
 * @description
 * Checks the supported extension and skips generated paths and the package lockfile before invoking Prettier.
 *
 * @param {string} file - Candidate path.
 * @returns {boolean} True for a supported extension outside the skipped trees and lockfiles.
 */
export function isFormattable(file) {
  const normalized = `/${path.resolve(file).replace(/\\/g, '/')}`;
  if (SKIP.some((segment) => normalized.includes(segment))) return false;
  if (normalized.endsWith('/package-lock.json')) return false;
  return FORMATTABLE.has(path.extname(normalized).toLowerCase());
}

/**
 * Function main
 *
 * @description
 * Reads the post-write payload and formats eligible existing files with the checkout's Prettier binary.
 * Missing configuration or Prettier is a no-op; formatting errors are reported with exit code 2.
 *
 * @returns {number} Exit status for the hook process.
 */
function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return 0;
  }
  const input = payload?.tool_input;
  const raw = input?.file_path ?? input?.filePath;
  if (!raw) return 0;
  const file = path.resolve(payload?.cwd || process.cwd(), raw);
  if (!existsSync(file) || !isFormattable(file)) return 0;
  const root = findFormatRoot(file);
  if (!root) return 0;
  const prettier = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  if (!existsSync(prettier)) return 0;
  try {
    execFileSync(
      process.execPath,
      [prettier, '--write', '--log-level', 'warn', '--ignore-unknown', file],
      {
        cwd: root,
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true,
      },
    );
  } catch (error) {
    if (error?.code === 'ENOENT') return 0;
    const detail = error?.stderr?.toString().trim() || error.message;
    process.stderr.write(`format hook: prettier failed for ${file}: ${detail}\n`);
    return 2;
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
