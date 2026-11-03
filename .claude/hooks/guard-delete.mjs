#!/usr/bin/env node
/**
 * PreToolUse hook (portfolio): refuse file deletions that exceed the allowed scope or target sensitive local data.
 * Deny = exit 2 with the reason on stderr; everything else = exit 0.
 *
 * The companion of guard.mjs (what is written) and guard-git.mjs (git, release and deployment commands,
 * including `reset --hard`, `clean -f` and `checkout .`). It reads `tool_input.command` (or `cmd`) and
 * denies:
 *
 *  1. A recursive delete (`rm -r…`, `Remove-Item -Recurse`, `rmdir /s`, `rd /s`) of an absolute,
 *     drive-rooted, `~`-rooted or `..`-escaping target that is not clearly disposable. Relative targets
 *     inside the work tree pass this policy; tracking status is not checked, so untracked files might not be recoverable.
 *  2. Any delete of a filesystem root, of a `.git` directory, of the whole checkout (`site`,
 *     `…/portfolio`, `…/portfolio/site`) or of the untracked local data git cannot restore: `.data/`
 *     (PGlite databases, development keys), the Ansible vault and `.vault-pass`.
 *
 * Disposable targets always pass: `node_modules`, `dist`, `tmp`, `coverage`, `test-results`,
 * `playwright-report`, `.angular`, `.nx/cache`, `out-tsc`, temporary and scratchpad folders. Rule 1 runs
 * per shell segment, so `cd /abs && rm -rf dist` stays a relative delete.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Constant DISPOSABLE
 *
 * @description
 * Recognizes generated output, caches and scratch folders exempt from deletion refusals.
 */
const DISPOSABLE =
  /(node_modules|(^|[\s/'"])(dist|tmp)([\s/'"]|$)|coverage|test-results|playwright-report|\.angular|\.nx\/cache|out-tsc|[/\\]te?mp[/\\]|scratchpad)/i;
/**
 * Constant RECURSIVE
 *
 * @description
 * Matches recursive deletion forms supported by POSIX shells and PowerShell.
 */
const RECURSIVE = /\b(rm\s+(-[a-z]*r[a-z]*\s+)+|remove-item\b.*-recurse|rmdir\s+\/s|rd\s+\/s)/i;
/**
 * Constant OUT_OF_TREE
 *
 * @description
 * Detects path tokens that are absolute, home-rooted or escape through a parent segment.
 */
const OUT_OF_TREE = /(\s|=|["'])(\/|[A-Za-z]:\/|~\/|\.\.\/)/;
/**
 * Constant WHOLE_TREE
 *
 * @description
 * Matches deletion targets that could remove a filesystem root, repository metadata or the whole checkout.
 */
const WHOLE_TREE =
  /\b(rm|remove-item|rmdir|rd|del)\b[^|;&\n]*\s["']?(?:\/|[A-Za-z]:\/?|~\/?|\S*\.git\/?|(?:\.{1,2}\/)?site\/?|\S*\/portfolio(?:\/site)?\/?)["']?(?=\s|$)/i;
/**
 * Constant LOCAL_DATA
 *
 * @description
 * Matches local databases and secret-bearing files that Git cannot restore.
 */
const LOCAL_DATA =
  /\b(rm|remove-item|rmdir|rd|del)\b[^|;&\n]*\s["']?(?:\S*\/)?(?:\.data(?:\/\S*)?|\.vault-pass|\S*group_vars\/[^/\s]+\/vault\.yml)["']?(?=\s|$)/i;

/**
 * Function evaluateDelete
 *
 * @description
 * Scans shell command segments and refuses deletion of checkout roots, sensitive local data and recursive out-of-tree targets.
 * Relative in-tree targets are allowed without consulting Git tracking state.
 *
 * @param {string} command - Shell command text.
 * @returns {string | null} The refusal reason, or null when the command is allowed.
 */
export function evaluateDelete(command) {
  if (typeof command !== 'string' || !command) return null;
  const unified = command.replace(/\\/g, '/');
  const masked = unified.replace(/\bgit(\s+-C\s+\S+)?\s+rm\b/g, 'git-tracked-removal');
  for (const raw of masked.split(/(?:&&|\|\||;|\||\n)/)) {
    const segment = raw.replace(/\s+/g, ' ').trim();
    if (!/\b(rm|remove-item|rmdir|rd|del)\b/i.test(segment)) continue;
    if (LOCAL_DATA.test(segment)) {
      return `delete of untracked local data or secrets (.data, the Ansible vault): ${segment}`;
    }
    if (WHOLE_TREE.test(segment) && !DISPOSABLE.test(segment.replace(/^\S+/, ''))) {
      return `delete of a filesystem root, a .git directory or the whole checkout: ${segment}`;
    }
    if (RECURSIVE.test(segment) && OUT_OF_TREE.test(segment) && !DISPOSABLE.test(segment)) {
      return `recursive delete of an out-of-tree path: ${segment}`;
    }
  }
  return null;
}

/**
 * Function main
 *
 * @description
 * Reads a hook payload and writes a refusal to stderr with exit code 2; malformed input is treated as a no-op.
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
  const denial = evaluateDelete(payload?.tool_input?.command ?? payload?.tool_input?.cmd ?? '');
  if (!denial) return 0;
  process.stderr.write(
    `Blocked: ${denial}\nGit cannot restore that. If this is genuinely the task, the user runs it themselves.\n`,
  );
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
