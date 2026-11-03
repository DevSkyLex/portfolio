/**
 * Codex hook adapter (portfolio): maps native Codex tool calls onto the shared hooks.
 *
 *  - Shell calls (`Bash`, `PowerShell`, `exec_command`): `guard-git.mjs` then `guard-delete.mjs`, pre phase
 *    only.
 *  - Edits (`apply_patch`, `Edit`, `Write`): every file of the patch, rename destinations included, goes
 *    through `guard.mjs` before and `format.mjs` after the edit. Paths that escape the checkout (also
 *    through a symlink) are refused; the immutable prefixes of `protected-paths.mjs` are refused before
 *    and never formatted after.
 *
 * The patch is parsed, never applied or executed. Any hook failure is reported with exit 2.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isImmutableSource } from './protected-paths.mjs';

/**
 * Constant root
 *
 * @description
 * Repository root, from the adapter's own location.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Function inside
 *
 * @description
 * Whether `file` resolves inside `parent` (or is `parent`).
 *
 * @param {string} parent - Bounding directory.
 * @param {string} file - Candidate path.
 * @returns {boolean} True when the file stays inside.
 */
const inside = (parent, file) => {
  const relative = path.relative(parent, file);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
};

/**
 * Function editsFromPatch
 *
 * @description
 * Parses a native apply-patch payload into file operations (added and context lines as content, rename
 * destinations recorded). The patch is inspected only.
 *
 * @param {string} patch - Complete apply-patch text.
 * @returns {{ file: string, operation: string, content: string, destination?: string }[]} The operations.
 * @throws {Error} When the patch is not an apply-patch payload, is incomplete or empty, or has a bad move.
 */
export function editsFromPatch(patch) {
  if (typeof patch !== 'string' || !patch.startsWith('*** Begin Patch')) {
    throw new Error('Unsupported patch payload; expected tool_input.command.');
  }
  const edits = [];
  let current;
  for (const line of patch.replaceAll('\r\n', '\n').split('\n')) {
    const header = /^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line);
    if (header) {
      current = { file: header[2], operation: header[1], content: '' };
      edits.push(current);
    } else if (line.startsWith('*** Move to: ')) {
      if (!current || current.operation !== 'Update') throw new Error('Invalid move header.');
      current.destination = line.slice('*** Move to: '.length);
    } else if (current && (line.startsWith('+') || line.startsWith(' '))) {
      current.content += `${line.slice(1)}\n`;
    } else if (current && (line.startsWith('@@') || line.startsWith('-'))) {
      current.content += '\n';
    }
  }
  if (!patch.trimEnd().endsWith('*** End Patch') || edits.length === 0) {
    throw new Error('Incomplete or empty patch; cannot inspect it.');
  }
  return edits;
}

/**
 * Function run
 *
 * @description
 * Runs one shared hook with a payload; a non-zero exit becomes an exception.
 *
 * @param {string} script - Absolute hook path.
 * @param {object} payload - Payload written to the hook's stdin.
 * @param {string} cwd - Working directory of the hook.
 * @throws {Error} When the hook is missing, fails to start or refuses.
 *
 * @returns {void}
 */
function run(script, payload, cwd) {
  if (!existsSync(script)) throw new Error(`Missing Codex hook: ${script}`);
  const result = spawnSync(process.execPath, [script], {
    cwd,
    env: process.env,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 20000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr?.trim() || result.error?.message || `Hook exited ${result.status}`,
    );
  }
}

/**
 * Function canonicalTarget
 *
 * @description
 * Resolves a target through its nearest existing ancestor, so a symlink escape is seen even for a file
 * that does not exist yet.
 *
 * @param {string} file - Edit target.
 * @returns {string} Canonical path with the unresolved suffix reattached.
 * @throws {Error} When no ancestor exists.
 */
function canonicalTarget(file) {
  let ancestor = file;
  while (!existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error('Cannot resolve target parent.');
    ancestor = parent;
  }
  return path.resolve(realpathSync(ancestor), path.relative(ancestor, file));
}

/**
 * Function handle
 *
 * @description
 * Routes a Codex tool payload through the shared guards (pre) or the formatter (post).
 *
 * @param {object} payload - Native Codex payload (`cwd`, `tool_name`, `tool_input`).
 * @param {'pre' | 'post'} phase - Hook phase.
 * @throws {Error} When a guard refuses or an edit escapes the checkout.
 *
 * @returns {void}
 */
export function handle(payload, phase) {
  const cwd = path.resolve(payload.cwd || root);
  const input = payload.tool_input;
  if (/^(Bash|PowerShell|exec_command)$/.test(payload.tool_name || '')) {
    if (phase !== 'pre') return;
    const command = input?.command ?? input?.cmd;
    if (typeof command !== 'string') throw new Error('Missing shell command.');
    const mapped = { ...payload, cwd, tool_input: { command } };
    run(path.join(root, '.codex/hooks/guard-git.mjs'), mapped, root);
    run(path.join(root, '.codex/hooks/guard-delete.mjs'), mapped, root);
    return;
  }
  const patch =
    typeof input === 'string' ? input : (input?.command ?? input?.patch ?? input?.input);
  const edits =
    /apply_patch/.test(payload.tool_name || '') || typeof patch === 'string'
      ? editsFromPatch(patch)
      : [
          {
            file: input?.file_path ?? input?.filePath,
            content: input?.content ?? input?.new_string ?? '',
            operation: 'Update',
          },
        ];
  for (const edit of edits) {
    if (!edit.file) throw new Error('Missing edit path.');
    const targets =
      phase === 'pre'
        ? [edit.file, edit.destination].filter(Boolean)
        : [edit.destination || edit.file];
    for (const target of targets) {
      const file = path.resolve(cwd, target);
      const canonical = canonicalTarget(file);
      if (!inside(root, file) || !inside(realpathSync(root), canonical)) {
        throw new Error('Edit escapes the configured project (including symlinks).');
      }
      if (isImmutableSource(root, file) || isImmutableSource(realpathSync(root), canonical)) {
        if (phase === 'pre') {
          throw new Error(
            'Externally managed Nx/vendor skills and installed Ansible collections are read-only.',
          );
        }
        continue;
      }
      const mapped = {
        ...payload,
        cwd: root,
        tool_input: { file_path: file, content: edit.content },
      };
      if (phase === 'pre') run(path.join(root, '.codex/hooks/guard.mjs'), mapped, root);
      else if (edit.operation !== 'Delete' && existsSync(file)) {
        run(path.join(root, '.codex/hooks/format.mjs'), mapped, root);
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const payload = JSON.parse(readFileSync(0, 'utf8'));
    const phase = process.argv[2];
    if (!['pre', 'post'].includes(phase)) throw new Error('Expected pre or post.');
    handle(payload, phase);
  } catch (error) {
    process.stderr.write(`portfolio Codex hook: ${error.message}\n`);
    process.exitCode = 2;
  }
}
