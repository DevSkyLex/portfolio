#!/usr/bin/env node
/**
 * PreToolUse hook (portfolio): refuse git, release, deployment and secret commands that an agent must
 * never run on its own. Deny = exit 2 with the reason on stderr; everything else = exit 0.
 *
 * The same file runs for Claude Code (Bash, PowerShell) and, through the Codex adapter, for Codex shell
 * commands. It reads `tool_input.command` (or `cmd`) and denies:
 *
 *  1. Pushes that reach `main` (explicit refspec, `HEAD`, an implicit push from `main`), `--all`,
 *     `--mirror`, tag pushes, force pushes (`-f`, `--force*`, `+refspec`) and `--no-verify`. `main` is
 *     production: CI on `main` triggers "Deploy services" and "Site build".
 *  2. History rewrites: `commit --amend` of a pushed commit, a `rebase` over pushed commits,
 *     `filter-branch`, `filter-repo`; `merge` while on `main`.
 *  3. Hook bypasses: `--no-verify` / `commit -n`, `-c core.hooksPath=…`, changing or unsetting
 *     `core.hooksPath`, `PF_SKIP_PUSH_CHECKS=1`.
 *  4. Work-tree destruction: `reset --hard`, `clean -f`, `checkout .` / `restore .`, deleting `main`.
 *  5. Branch names other than `<type>/<lowercase-kebab>` (commit headers are checked by commitlint in
 *     `.githooks/commit-msg`). Tag creation and deletion.
 *  6. Publishing: `npm|pnpm|yarn publish`, `unpublish`, `deprecate`, `dist-tag add|rm`, `npm version <bump>`,
 *     `docker push`, `gh release create|delete|edit|upload`.
 *  7. Production and deployment: `gh pr merge` (a merge into `main` deploys), `gh workflow run` of the
 *     deploy or site-build workflows, `gh secret|variable set|delete`, `gh api` writes to merges, refs,
 *     releases, secrets or workflow dispatches, `ansible-playbook` (except `--syntax-check` and `--list-*`),
 *     ad-hoc `ansible`, `ansible-vault` operations, `docker compose` on `compose.prod.yml` (except `config`),
 *     and running `docker/scripts/{deploy,publish-site,backup}.sh`.
 *  8. Local data loss: `docker compose down -v`, `docker volume rm|prune`, `docker system prune`,
 *     `drizzle-kit push|drop`.
 *
 * Parsing is a small shell tokenizer: quotes are honoured, heredoc bodies and the arguments of `echo` /
 * `printf` / `Write-Output` are not commands, and only a program in command position counts. When a git
 * query needed for a decision fails, only the history-rewriting case is denied. The hook only acts inside
 * a portfolio checkout (marker: a package.json named `@vfortin/source`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Constant TYPES
 * @readonly
 *
 * @description
 * Conventional Commit type values accepted at the start of repository branch names.
 */
export const TYPES = 'build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test';
/**
 * Constant BRANCH_OK
 *
 * @description
 * Matches branch names using an accepted type and a lowercase kebab description.
 */
const BRANCH_OK = new RegExp(`^(?:${TYPES})/[a-z0-9]+(?:-[a-z0-9]+)*$`);
/**
 * Constant BRANCH_EXEMPT
 *
 * @description
 * Matches permanent and tool-owned branch names exempt from the naming convention.
 */
const BRANCH_EXEMPT = /^(?:main|claude\/.+|dependabot\/.+)$/;
/**
 * Constant PROTECTED_BRANCHES
 *
 * @description
 * Branches that must not be deleted or receive protected history operations.
 */
const PROTECTED_BRANCHES = new Set(['main']);
/**
 * Constant REPO_NAME
 *
 * @description
 * Package name used to identify a portfolio checkout before enforcing command policy.
 */
const REPO_NAME = '@vfortin/source';
/**
 * Constant PRODUCTION_WORKFLOWS
 *
 * @description
 * Matches workflow names that deploy services or publish the site to production.
 */
const PRODUCTION_WORKFLOWS =
  /^(?:deploy(?:\.yml)?|site-build(?:\.yml)?|deploy services|site build)$/i;
/**
 * Constant MAIN_IS_PRODUCTION
 *
 * @description
 * Shared refusal reason explaining why work on `main` must go through a pull request.
 */
const MAIN_IS_PRODUCTION =
  'main is production: CI on main triggers "Deploy services" and "Site build" (docs/operations/deployment.md). Open a pull request.';

/**
 * Function parseSegments
 *
 * @description
 * Tokenizes shell text into simple commands while preserving quoted separators and skipping heredoc bodies.
 *
 * @param {string} command - Full shell command.
 * @returns {string[][]} The simple commands, each as its unquoted tokens.
 */
export function parseSegments(command) {
  const segments = [];
  const heredocs = [];
  let tokens = [];
  let token = '';
  let hasToken = false;
  let quote = null;
  /**
   * Function pushToken
   *
   * @description
   * Appends the current token only when input has started one, then resets token state.
   */
  const pushToken = () => {
    if (hasToken) tokens.push(token);
    token = '';
    hasToken = false;
  };
  /**
   * Function endSegment
   *
   * @description
   * Flushes the current token and records the segment when it contains at least one token.
   */
  const endSegment = () => {
    pushToken();
    if (tokens.length) segments.push(tokens);
    tokens = [];
  };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (quote === '"' && ch === '\\' && /["\\$`]/.test(command[i + 1] ?? ''))
        token += command[++i];
      else token += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      hasToken = true;
    } else if (ch === '\n') {
      endSegment();
      i = skipHeredocs(command, i, heredocs);
    } else if (ch === '<' && command[i + 1] === '<' && command[i + 2] !== '<') {
      pushToken();
      i += 2;
      const strip = command[i] === '-';
      if (strip) i++;
      while (command[i] === ' ' || command[i] === '\t') i++;
      let delimiter = '';
      const q = command[i];
      if (q === "'" || q === '"') {
        for (i++; i < command.length && command[i] !== q; i++) delimiter += command[i];
      } else {
        for (; i < command.length && !/[\s;&|()]/.test(command[i]); i++) delimiter += command[i];
        i--;
      }
      heredocs.push({ delimiter, strip });
    } else if (';&|()'.includes(ch)) {
      endSegment();
    } else if (/\s/.test(ch)) {
      pushToken();
    } else {
      token += ch;
      hasToken = true;
    }
  }
  endSegment();
  return segments;
}

/**
 * Function skipHeredocs
 *
 * @description
 * Advances the tokenizer past every heredoc body queued on the preceding command line.
 *
 * @param {string} command - Command text.
 * @param {number} newline - Index of the newline ending the command line.
 * @param {{ delimiter: string, strip: boolean }[]} heredocs - Delimiters queued from that line.
 * @returns {number} Index of the end of the last body.
 */
function skipHeredocs(command, newline, heredocs) {
  let end = newline;
  while (heredocs.length) {
    const { delimiter, strip } = heredocs.shift();
    let start = end + 1;
    for (;;) {
      if (start >= command.length) return command.length;
      let lineEnd = command.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = command.length;
      let line = command.slice(start, lineEnd).replace(/\r$/, '');
      if (strip) line = line.replace(/^\t+/, '');
      end = lineEnd;
      if (line === delimiter) break;
      start = lineEnd + 1;
    }
  }
  return end;
}

/**
 * Function splitCommand
 *
 * @description
 * Removes leading environment assignments and wrapper programs, then normalizes the executable and arguments.
 *
 * @param {string[]} tokens - Tokens of one simple command.
 * @returns {{ env: Record<string, string>, program: string, argv: string[] }} Assignments, the
 * normalized program name and its argument vector (program first).
 */
export function splitCommand(tokens) {
  const env = {};
  let i = 0;
  for (; i < tokens.length; i++) {
    const t = tokens[i];
    const posix = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(t);
    if (posix) {
      env[posix[1]] = posix[2];
      continue;
    }
    const ps = /^\$env:([A-Za-z_][A-Za-z0-9_]*)(?:=(.*))?$/is.exec(t);
    if (ps) {
      if (ps[2] !== undefined) env[ps[1]] = ps[2];
      else if (tokens[i + 1] === '=') {
        env[ps[1]] = tokens[i + 2] ?? '';
        i += 2;
      }
      continue;
    }
    if (['sudo', 'env', 'command', 'exec', 'nohup', 'time', 'export', '&'].includes(t)) continue;
    break;
  }
  let argv = tokens.slice(i);
  /**
   * Function name
   *
   * @description
   * Normalizes an executable token to its lowercase basename without a Windows command extension.
   *
   * @param {string | undefined} token - Executable token to normalize.
   * @returns {string} Lowercase executable basename.
   */
  const name = (token) =>
    (token ?? '')
      .split(/[\\/]/)
      .pop()
      .toLowerCase()
      .replace(/\.(exe|cmd|bat)$/, '');
  if (name(argv[0]) === 'npx') {
    let j = 1;
    while (j < argv.length && argv[j].startsWith('-'))
      j += ['-p', '--package'].includes(argv[j]) ? 2 : 1;
    if (j < argv.length) argv = argv.slice(j);
  }
  return { env, program: name(argv[0]), argv };
}

/**
 * Function realGit
 *
 * @description
 * Creates a git query function bound to a working directory; callers can inject a fake for deterministic checks.
 *
 * @param {string} cwd - Repository directory.
 * @returns {(args: string[]) => { ok: boolean, out: string }} The query function.
 */
export function realGit(cwd) {
  return (args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
    return { ok: result.status === 0, out: (result.stdout ?? '').trim() };
  };
}

/**
 * Function currentBranch
 *
 * @description
 * Resolves the current branch for both committed and unborn branches, or returns null when Git cannot identify it.
 *
 * @param {(args: string[]) => { ok: boolean, out: string }} git - Git query function.
 * @returns {string | null} Current branch name, or null when unavailable.
 */
function currentBranch(git) {
  const symbolic = git(['symbolic-ref', '--short', '-q', 'HEAD']);
  if (symbolic.ok && symbolic.out) return symbolic.out;
  const r = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  return r.ok ? r.out : null;
}

/**
 * Function isTag
 *
 * @description
 * Checks for a local tag with the supplied name using the injected Git query function.
 *
 * @param {(args: string[]) => { ok: boolean, out: string }} git - Git query function.
 * @param {string} name - Candidate tag name.
 * @returns {boolean} Whether the local tag exists.
 */
const isTag = (git, name) => git(['show-ref', '--verify', '--quiet', `refs/tags/${name}`]).ok;
/**
 * Function deny
 *
 * @description
 * Creates the structured refusal consumed by command-policy dispatch.
 *
 * @param {string} what - Action that was refused.
 * @param {string} why - Reason shown to the user.
 * @returns {{ what: string, why: string }} Refusal result.
 */
const deny = (what, why) => ({ what, why });
/**
 * Function stripHeads
 *
 * @description
 * Removes a Git branch ref prefix before comparing the target name with protected branches.
 *
 * @param {string} ref - Git ref or branch name.
 * @returns {string} Branch name without the `refs/heads/` prefix.
 */
const stripHeads = (ref) => ref.replace(/^refs\/heads\//, '');
/**
 * Function hasShort
 *
 * @description
 * Checks whether a short-option cluster contains a particular option letter.
 *
 * @param {string} arg - Short-option token.
 * @param {string} letter - Option letter to find.
 * @returns {boolean} Whether the option cluster contains the letter.
 */
const hasShort = (arg, letter) => /^-[A-Za-z]+$/.test(arg) && arg.slice(1).includes(letter);

/**
 * Function checkPush
 *
 * @description
 * Rejects force, bypass, bulk and tag pushes, plus refspecs that target the protected production branch.
 *
 * @param {string[]} args - Arguments following the `git push` subcommand.
 * @param {(args: string[]) => { ok: boolean, out: string }} git - Git query function used for branch and tag checks.
 * @returns {{ what: string, why: string } | null} First refusal, or null when the push is allowed.
 */
function checkPush(args, git) {
  const valueOptions = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
  const positional = [];
  let dryRun = false;
  let deleting = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (valueOptions.has(a)) {
      i++;
      continue;
    }
    if (a === '--dry-run' || hasShort(a, 'n')) dryRun = true;
    if (a === '--delete' || hasShort(a, 'd')) deleting = true;
    if (/^--force(?:-with-lease|-if-includes)?(?:=.*)?$/.test(a) || hasShort(a, 'f')) {
      return deny(
        'force push',
        'Force pushes rewrite published history. Push new commits instead.',
      );
    }
    if (a === '--no-verify')
      return deny('git push --no-verify', 'The pre-push hook checks format and lint.');
    if (['--all', '--mirror', '--tags', '--follow-tags'].includes(a)) {
      return deny(
        `git push ${a}`,
        'It pushes tags or every branch, main included. Push your branch by name.',
      );
    }
    if (!a.startsWith('-')) positional.push(a);
  }
  if (dryRun) return null;
  const refspecs = positional.slice(1);
  if (refspecs.length === 0) {
    return currentBranch(git) === 'main' ? deny('git push from main', MAIN_IS_PRODUCTION) : null;
  }
  for (const spec of refspecs) {
    if (spec.startsWith('+'))
      return deny(`force refspec ${spec}`, 'A "+" refspec is a force push.');
    const [src, dst] = spec.includes(':') ? spec.split(':') : [spec, spec];
    const target = stripHeads(dst === 'HEAD' || dst === '@' ? (currentBranch(git) ?? dst) : dst);
    if (target === 'main') {
      return deny(deleting ? 'delete branch main' : `push to main (${spec})`, MAIN_IS_PRODUCTION);
    }
    const names = [src, dst].filter(Boolean);
    if (
      names.some((n) => n.startsWith('refs/tags/') || /^v\d+(?:\.\d+)*(?:[-+].*)?$/.test(n)) ||
      (src && !src.startsWith('refs/') && src !== 'HEAD' && isTag(git, src))
    ) {
      return deny(`tag push (${spec})`, 'This repository does not use tags; ask the user.');
    }
  }
  return null;
}

/**
 * Function checkCommit
 *
 * @description
 * Rejects commit-hook bypasses and amendments when the current commit is already present on a remote branch.
 *
 * @param {string[]} args - Arguments following the `git commit` subcommand.
 * @param {(args: string[]) => { ok: boolean, out: string }} git - Git query function used to check remote reachability.
 * @returns {{ what: string, why: string } | null} First refusal, or null when the commit operation is allowed.
 */
function checkCommit(args, git) {
  if (args.includes('--no-verify') || args.some((a) => hasShort(a, 'n'))) {
    return deny('git commit --no-verify', 'The commit-msg hook runs commitlint; do not bypass it.');
  }
  if (args.includes('--amend')) {
    const r = git(['branch', '-r', '--contains', 'HEAD']);
    if (r.ok && r.out) {
      return deny(
        'git commit --amend of a pushed commit',
        `HEAD is already on ${r.out.split('\n')[0].trim()}. Add a new commit instead.`,
      );
    }
  }
  return null;
}

/**
 * Function checkRebase
 *
 * @description
 * Allows control operations and rebases only when Git proves that every rewritten commit is unpublished.
 *
 * @param {string[]} args - Arguments following the `git rebase` subcommand.
 * @param {(args: string[]) => { ok: boolean, out: string }} git - Git query function used to count commits.
 * @returns {{ what: string, why: string } | null} First refusal, or null when the rebase is allowed.
 */
function checkRebase(args, git) {
  const control = [
    '--abort',
    '--continue',
    '--skip',
    '--quit',
    '--edit-todo',
    '--show-current-patch',
  ];
  if (args.some((a) => control.includes(a))) return null;
  const valueOptions = new Set([
    '--onto',
    '-x',
    '--exec',
    '-s',
    '--strategy',
    '-X',
    '--strategy-option',
  ]);
  const positional = [];
  let root = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (valueOptions.has(a)) i++;
    else if (a === '--root') root = true;
    else if (!a.startsWith('-')) positional.push(a);
  }
  const tip = positional[1] ?? 'HEAD';
  const range = root ? [tip] : [`${positional[0] ?? '@{upstream}'}..${tip}`];
  const total = git(['rev-list', '--count', ...range]);
  const local = git(['rev-list', '--count', ...range, '--not', '--remotes']);
  if (!total.ok || !local.ok) {
    return deny(
      'git rebase (range not verifiable)',
      'The guard cannot prove the commits are unpublished.',
    );
  }
  if (total.out !== local.out) {
    return deny('git rebase of pushed commits', 'The range contains commits a remote already has.');
  }
  return null;
}

/**
 * Function checkBranchName
 *
 * @description
 * Enforces the repository branch naming rule while exempting permanent and tool-owned branch names.
 *
 * @param {string} name - Branch name to validate.
 * @returns {{ what: string, why: string } | null} Refusal for an invalid name, or null when accepted.
 */
function checkBranchName(name) {
  if (!name || BRANCH_EXEMPT.test(name) || BRANCH_OK.test(name)) return null;
  return deny(
    `branch name "${name}"`,
    `Branches are <type>/<lowercase-kebab-description> with a type among ${TYPES.split('|').join(', ')}.`,
  );
}

/**
 * Function checkGit
 *
 * @description
 * Removes global Git options, then routes the selected subcommand to its safety check.
 *
 * @param {string[]} argv - Git executable and command arguments.
 * @param {(args: string[]) => { ok: boolean, out: string }} git - Git query function used by subcommand checks.
 * @returns {{ what: string, why: string } | null} First refusal, or null when the command is allowed.
 */
function checkGit(argv, git) {
  let i = 1;
  for (; i < argv.length && argv[i].startsWith('-'); i++) {
    const a = argv[i];
    const config = a === '-c' ? argv[++i] : a.startsWith('-c') ? a.slice(2) : null;
    if (a === '-C' || a === '--git-dir' || a === '--work-tree') i++;
    if (config && /^core\.hookspath\s*=/i.test(config)) {
      return deny('git -c core.hooksPath=…', 'It disables the repository hooks (.githooks).');
    }
  }
  const sub = argv[i];
  const args = argv.slice(i + 1);
  switch (sub) {
    case 'push':
      return checkPush(args, git);
    case 'commit':
      return checkCommit(args, git);
    case 'rebase':
      return checkRebase(args, git);
    case 'filter-branch':
    case 'filter-repo':
      return deny(`git ${sub}`, 'It rewrites history.');
    case 'tag': {
      const listing = args.length === 0 || args.some((a) => ['-l', '--list'].includes(a));
      if (listing && !args.some((a) => ['-d', '--delete'].includes(a))) return null;
      return deny('git tag', 'This repository does not use tags; ask the user.');
    }
    case 'merge':
      if (args.includes('--abort') || args.includes('--continue')) return null;
      return currentBranch(git) === 'main' ? deny('git merge on main', MAIN_IS_PRODUCTION) : null;
    case 'reset':
      return args.includes('--hard')
        ? deny('git reset --hard', 'It discards uncommitted work.')
        : null;
    case 'clean':
      return args.some((a) => a === '--force' || hasShort(a, 'f'))
        ? deny('git clean -f', 'It deletes untracked files permanently.')
        : null;
    case 'checkout':
    case 'restore': {
      const paths = args.includes('--') ? args.slice(args.indexOf('--') + 1) : args;
      const stagedOnly =
        sub === 'restore' &&
        args.some((a) => a === '--staged' || a === '-S') &&
        !args.some((a) => a === '--worktree' || a === '-W');
      if (!stagedOnly && (paths.includes('.') || paths.includes(':/'))) {
        return deny(`git ${sub} .`, 'It reverts every uncommitted change at once.');
      }
      if (sub === 'checkout') {
        const at = args.findIndex((a) => a === '-b' || a === '-B');
        if (at !== -1) return checkBranchName(args[at + 1]);
      }
      return null;
    }
    case 'switch': {
      const at = args.findIndex((a) => ['-c', '-C', '--create', '--force-create'].includes(a));
      return at === -1 ? null : checkBranchName(args[at + 1]);
    }
    case 'branch': {
      const del = args.some(
        (a) => ['-d', '-D', '--delete'].includes(a) || /^-[a-zA-Z]*[dD]$/.test(a),
      );
      const names = args.filter((a) => !a.startsWith('-'));
      if (del) {
        const hit = names.find((n) => PROTECTED_BRANCHES.has(n.replace(/^origin\//, '')));
        return hit
          ? deny(`delete branch ${hit}`, 'main is the long-lived production branch.')
          : null;
      }
      if (args.some((a) => ['-m', '-M', '--move'].includes(a)))
        return checkBranchName(names.at(-1));
      if (args.some((a) => a.startsWith('-'))) return null;
      return checkBranchName(names[0]);
    }
    case 'worktree': {
      if (args[0] !== 'add') return null;
      const at = args.findIndex((a) => a === '-b' || a === '-B');
      return at === -1 ? null : checkBranchName(args[at + 1]);
    }
    case 'config': {
      const key = args.find((a) => /^core\.hookspath$/i.test(a));
      if (!key) return null;
      const value = args[args.indexOf(key) + 1];
      if (
        args.includes('--unset') ||
        args.includes('--unset-all') ||
        (value && value !== '.githooks')
      ) {
        return deny(
          'git config core.hooksPath',
          'The repository hooks live in .githooks; keep them.',
        );
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Function checkPackageManager
 *
 * @description
 * Rejects package publication, registry tag changes and npm version bumps while allowing dry-run publishing.
 *
 * @param {string} program - Normalized package-manager executable name.
 * @param {string[]} argv - Package-manager executable and command arguments.
 * @returns {{ what: string, why: string } | null} Refusal for a release operation, or null otherwise.
 */
function checkPackageManager(program, argv) {
  const sub = argv[1];
  if (sub === 'publish' && argv.includes('--dry-run')) return null;
  if (['publish', 'unpublish', 'deprecate'].includes(sub)) {
    return deny(
      `${program} ${sub}`,
      'The workspace is private: nothing is published to a registry.',
    );
  }
  if (sub === 'dist-tag' && ['add', 'rm'].includes(argv[2])) {
    return deny(`${program} dist-tag ${argv[2]}`, 'Registry tags are a release action.');
  }
  if (program === 'npm' && sub === 'version' && argv.slice(2).some((a) => !a.startsWith('-'))) {
    return deny('npm version <bump>', 'It bumps and tags; the workspace is not versioned.');
  }
  return null;
}

/**
 * Function checkGh
 *
 * @description
 * Rejects GitHub CLI operations that merge, deploy, change credentials or publish releases.
 *
 * @param {string[]} argv - GitHub CLI executable and command arguments.
 * @returns {{ what: string, why: string } | null} Refusal for a protected operation, or null otherwise.
 */
function checkGh(argv) {
  const [, group, action] = argv;
  if (group === 'pr' && action === 'merge') {
    return deny('gh pr merge', `${MAIN_IS_PRODUCTION} The user merges.`);
  }
  if (group === 'workflow' && action === 'run') {
    const workflow = argv.slice(3).find((a) => !a.startsWith('-'));
    if (workflow && PRODUCTION_WORKFLOWS.test(workflow)) {
      return deny(
        `gh workflow run ${workflow}`,
        'It deploys to the VPS. Only the user triggers a deployment.',
      );
    }
  }
  if (['secret', 'variable'].includes(group) && ['set', 'delete', 'remove'].includes(action)) {
    return deny(
      `gh ${group} ${action}`,
      'Repository secrets and variables are changed by the user.',
    );
  }
  if (group === 'release' && ['create', 'delete', 'edit', 'upload'].includes(action)) {
    return deny(`gh release ${action}`, 'This repository publishes no GitHub release.');
  }
  if (group === 'api') {
    const text = argv.join(' ');
    if (
      /\/merge\b|\/git\/refs|\/releases\b|\/secrets\b|\/variables\b|\/dispatches\b/.test(text) &&
      /(-X|--method)[ =]?(PUT|POST|PATCH|DELETE)/i.test(text)
    ) {
      return deny(
        'gh api write',
        'Same limits as merges, pushes, releases, secrets and deployments.',
      );
    }
  }
  return null;
}

/**
 * Function checkAnsible
 *
 * @description
 * Refuses production Ansible operations while allowing playbook syntax and inventory-listing checks.
 *
 * @param {string} program - Normalized Ansible executable name.
 * @param {string[]} argv - Ansible executable and command arguments.
 * @returns {{ what: string, why: string } | null} Refusal for an operational command, or null otherwise.
 */
function checkAnsible(program, argv) {
  if (program === 'ansible-playbook') {
    const harmless = argv.some(
      (a) => a === '--syntax-check' || /^--list-(?:hosts|tasks|tags)$/.test(a),
    );
    return harmless
      ? null
      : deny(
          'ansible-playbook',
          'Playbooks act on the production VPS (ansible/inventory/production.yml).',
        );
  }
  if (program === 'ansible-vault') {
    const sub = argv.find((a, index) => index > 0 && !a.startsWith('-'));
    return sub &&
      ['view', 'decrypt', 'edit', 'encrypt', 'encrypt_string', 'rekey', 'create'].includes(sub)
      ? deny(`ansible-vault ${sub}`, 'The vault holds production secrets; only the user opens it.')
      : null;
  }
  if (program === 'ansible') {
    return argv.some((a) => a === '--version' || a === '--help')
      ? null
      : deny('ansible ad-hoc command', 'It runs on the production inventory.');
  }
  return null;
}

/**
 * Function checkDocker
 *
 * @description
 * Rejects image publication, destructive volume cleanup and operations on the production Compose stack.
 *
 * @param {string[]} argv - Docker executable and command arguments.
 * @returns {{ what: string, why: string } | null} Refusal for a protected operation, or null otherwise.
 */
function checkDocker(argv) {
  const [, sub] = argv;
  if (sub === 'push')
    return deny('docker push', 'Images are published by the "Deploy services" workflow.');
  if (sub === 'volume' && ['rm', 'remove', 'prune'].includes(argv[2])) {
    return deny(`docker volume ${argv[2]}`, 'It deletes database volumes; ask the user.');
  }
  if (sub === 'system' && argv[2] === 'prune')
    return deny('docker system prune', 'It deletes volumes and images.');
  const compose =
    sub === 'compose' ? argv.slice(2) : argv[0] === 'docker-compose' ? argv.slice(1) : null;
  if (compose) {
    const verb = compose.find(
      (a, index) =>
        !a.startsWith('-') &&
        ![
          '-f',
          '--file',
          '-p',
          '--profile',
          '--project-name',
          '--env-file',
          '--project-directory',
          '--ansi',
          '--progress',
          '--parallel',
        ].includes(compose[index - 1]),
    );
    if (compose.some((a) => /compose\.prod\.ya?ml$/.test(a)) && verb !== 'config') {
      return deny(
        'docker compose on compose.prod.yml',
        'The production stack runs on the VPS, through Ansible.',
      );
    }
    if (verb === 'down' && compose.some((a) => a === '-v' || a === '--volumes')) {
      return deny(
        'docker compose down -v',
        'It deletes the Postgres volume of the stack; ask the user.',
      );
    }
  }
  return null;
}

/**
 * Function checkScripts
 *
 * @description
 * Rejects deployment scripts and direct Drizzle schema changes that bypass reviewed migrations.
 *
 * @param {string} program - Normalized executable name.
 * @param {string[]} argv - Executable and command arguments.
 * @returns {{ what: string, why: string } | null} Refusal for a protected operation, or null otherwise.
 */
function checkScripts(program, argv) {
  const script =
    /(?:^|[\\/])(?:docker[\\/])?scripts[\\/](?:deploy|publish-site|backup|reload-nginx|restore-check)\.sh$/;
  if (
    script.test(argv[0] ?? '') ||
    (['sh', 'bash'].includes(program) && argv.slice(1).some((a) => script.test(a)))
  ) {
    return deny(
      'docker/scripts deployment script',
      'These scripts run on the VPS through Ansible.',
    );
  }
  if (program === 'drizzle-kit' && ['push', 'drop'].includes(argv[1])) {
    return deny(
      `drizzle-kit ${argv[1]}`,
      'Schemas change through generated migrations and db-migrate only.',
    );
  }
  return null;
}

/**
 * Function evaluateCommand
 *
 * @description
 * Tokenizes a shell command and applies the relevant Git, package, hosting, infrastructure and data-safety checks.
 * Non-command text passed to output programs is ignored by the tokenizer and dispatcher.
 *
 * @param {string} command - Shell command text.
 * @param {{ git: Function }} dependencies - Git query function.
 * @returns {{ what: string, why: string } | null} The first refusal, or null.
 */
export function evaluateCommand(command, { git }) {
  if (typeof command !== 'string' || !command.trim()) return null;
  for (const tokens of parseSegments(command)) {
    const { env, program, argv } = splitCommand(tokens);
    if (env.PF_SKIP_PUSH_CHECKS !== undefined) {
      return deny(
        'PF_SKIP_PUSH_CHECKS',
        'The pre-push checks are the last gate before CI: fix what they report.',
      );
    }
    if (['echo', 'printf', 'write-output', 'write-host'].includes(program)) continue;
    let denial = null;
    if (program === 'git') denial = checkGit(argv, git);
    else if (['npm', 'pnpm', 'yarn'].includes(program)) denial = checkPackageManager(program, argv);
    else if (program === 'gh') denial = checkGh(argv);
    else if (program.startsWith('ansible')) denial = checkAnsible(program, argv);
    else if (program === 'docker' || program === 'docker-compose') denial = checkDocker(argv);
    else denial = checkScripts(program, argv);
    if (denial) return denial;
  }
  return null;
}

/**
 * Function isRepoRoot
 *
 * @description
 * Checks whether the directory's package manifest identifies this workspace.
 *
 * @param {string} dir - Candidate repository root.
 * @returns {boolean} Whether the directory is the expected checkout root.
 */
function isRepoRoot(dir) {
  const manifest = path.join(dir, 'package.json');
  if (!existsSync(manifest)) return false;
  try {
    return JSON.parse(readFileSync(manifest, 'utf8'))?.name === REPO_NAME;
  } catch {
    return false;
  }
}

/**
 * Function findRepoRoot
 *
 * @description
 * Walks from a directory toward the filesystem root and returns the nearest matching checkout.
 *
 * @param {string} start - Directory to start from.
 * @returns {string | null} The checkout root, or null.
 */
export function findRepoRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (isRepoRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Function main
 *
 * @description
 * Reads a shell hook payload, evaluates commands only inside this checkout and reports policy refusals.
 * Malformed payloads and commands outside a recognized checkout pass through.
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
  const command = payload?.tool_input?.command ?? payload?.tool_input?.cmd;
  const cwd = payload?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (typeof command !== 'string' || !findRepoRoot(cwd)) return 0;
  const denial = evaluateCommand(command, { git: realGit(cwd) });
  if (!denial) return 0;
  process.stderr.write(
    `Blocked: ${denial.what}\n${denial.why}\n` +
      'If the user explicitly asked for this, stop and let them run it themselves (AGENTS.md, hard limits).\n',
  );
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
