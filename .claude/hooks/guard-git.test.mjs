// Tests of guard-git.mjs: `node --test .claude/hooks/guard-git.test.mjs`.
// The git queries are faked, so the cases do not depend on the state of the checkout.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateCommand, parseSegments, splitCommand } from './guard-git.mjs';

/**
 * Constant here
 *
 * @description
 * Directory containing this test module, used to locate the hook under test.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
/**
 * Constant root
 *
 * @description
 * Repository root used for hook invocation and checkout-detection cases.
 */
const root = path.resolve(here, '../..');

/**
 * Function fakeGit
 *
 * @description
 * Creates a deterministic Git query stub whose branch, tag and commit-count responses drive command-policy cases.
 *
 * @param {{ branch?: string, pushed?: boolean, tags?: string[], total?: string, local?: string, fail?: boolean }} state
 * @returns {(args: string[]) => { ok: boolean, out: string }} The fake query function.
 */
function fakeGit({
  branch = 'feat/example',
  pushed = false,
  tags = [],
  total = '2',
  local = '2',
  fail = false,
} = {}) {
  return (args) => {
    const key = args.join(' ');
    if (key === 'symbolic-ref --short -q HEAD') return { ok: true, out: branch };
    if (key === 'rev-parse --abbrev-ref HEAD') return { ok: true, out: branch };
    if (key.startsWith('show-ref --verify --quiet refs/tags/')) {
      return { ok: tags.includes(args[3].slice('refs/tags/'.length)), out: '' };
    }
    if (key === 'branch -r --contains HEAD')
      return { ok: true, out: pushed ? '  origin/feat/example' : '' };
    if (args[0] === 'rev-list') {
      if (fail) return { ok: false, out: '' };
      return { ok: true, out: args.includes('--not') ? local : total };
    }
    return { ok: true, out: '' };
  };
}

/**
 * Function denied
 *
 * @description
 * Applies the command evaluator with a fake repository state and reports whether the command is refused.
 *
 * @param {string} command - Shell command to evaluate.
 * @param {object} state - Fake Git state passed to `fakeGit`.
 * @returns {boolean} Whether the command produces a refusal.
 */
const denied = (command, state) => evaluateCommand(command, { git: fakeGit(state) }) !== null;

void test('tokenizer honours quotes, separators and heredocs', () => {
  assert.deepEqual(parseSegments('git commit -m "a; b" && git push'), [
    ['git', 'commit', '-m', 'a; b'],
    ['git', 'push'],
  ]);
  assert.deepEqual(parseSegments("cat <<'EOF'\ngit push origin main\nEOF\ngit status"), [
    ['cat'],
    ['git', 'status'],
  ]);
});

void test('npx is unwrapped to the program it runs', () => {
  assert.equal(splitCommand(['npx', '-y', 'drizzle-kit', 'push']).program, 'drizzle-kit');
  assert.equal(splitCommand(['npx', 'nx', 'test', 'ui']).program, 'nx');
});

for (const command of [
  'git status',
  'git log --oneline -5',
  'git diff --staged',
  'git add .claude/agents/pf-test-writer.md',
  'git push -u origin feat/contact-form',
  'git push origin HEAD',
  'git push',
  'git push --dry-run origin main',
  'git push origin --delete feat/old-topic',
  'git tag',
  'git tag --list',
  'git switch -c feat/contact-form',
  'git switch -c fix/hero-contrast',
  'git switch -c chore/agent-tooling',
  'git switch main',
  'git checkout -b docs/deployment-notes',
  'git checkout -- libs/frontend/ui/src/index.ts',
  'git restore --staged .',
  'git branch -a',
  'git branch -d feat/merged-topic',
  'git worktree add ../site-tooling -b chore/agent-tooling',
  'git commit -m "feat(contact): add the honeypot field"',
  'git commit -m "$(cat <<\'EOF\'\nchore(tooling): add hooks\n\nBody line.\nEOF\n)"',
  'git commit --amend --no-edit',
  'git rebase origin/main',
  'git rebase --continue',
  'git config core.hooksPath .githooks',
  'git merge main',
  'echo "git push origin main --force"',
  'printf "%s" "npm publish"',
  'npm ci',
  'npm install',
  'npm publish --dry-run',
  'npm version',
  'npx nx affected -t lint typecheck test build',
  'npx nx run architecture:test',
  'npx nx run contact-service:db-migrate',
  'npx drizzle-kit generate --config apps/contact-service/drizzle.config.ts',
  'gh pr create --base main --title "feat(contact): x" --body "y"',
  'gh pr view 1',
  'gh run list',
  'gh workflow run ci.yml --ref feat/contact-form',
  'gh api repos/DevSkyLex/portfolio/actions/runs',
  'ansible-playbook playbooks/deploy.yml --syntax-check',
  'ansible-playbook playbooks/provision.yml --list-tasks',
  'ansible-galaxy collection install -r requirements.yml -p .collections',
  'ansible --version',
  'docker compose -f docker/compose.dev.yml up --build -d',
  'docker compose -f docker/compose.dev.yml down',
  'docker compose -f docker/compose.prod.yml config',
  'docker compose --env-file docker/.env.example -f docker/compose.prod.yml config',
  'docker build -f docker/service.Dockerfile --build-arg SERVICE=content-service -t portfolio-content .',
  'sh -n docker/scripts/deploy.sh.bak',
]) {
  void test(`allows: ${command}`, () => assert.equal(denied(command), false));
}

for (const [command, state] of [
  ['git push origin main'],
  ['git push origin HEAD:main'],
  ['git push origin feat/example:main'],
  ['git push origin develop:refs/heads/main'],
  ['git push', { branch: 'main' }],
  ['git push origin HEAD', { branch: 'main' }],
  ['git push origin --delete main'],
  ['git push --force origin feat/example'],
  ['git push -f'],
  ['git push -uf origin feat/example'],
  ['git push --force-with-lease'],
  ['git push origin +feat/example'],
  ['git push --tags'],
  ['git push --follow-tags origin feat/example'],
  ['git push --all'],
  ['git push --mirror'],
  ['git push origin v1.0.0'],
  ['git push origin refs/tags/v1.0.0'],
  ['git push origin snapshot', { tags: ['snapshot'] }],
  ['git push --no-verify origin feat/example'],
  ['git commit --no-verify -m "docs: x"'],
  ['git commit -n -m "docs: x"'],
  ['git -c core.hooksPath=/dev/null commit -m "docs: x"'],
  ['git config core.hooksPath .git/hooks'],
  ['git config --unset core.hooksPath'],
  ['PF_SKIP_PUSH_CHECKS=1 git push origin feat/example'],
  ["$env:PF_SKIP_PUSH_CHECKS = '1'; git push origin feat/example"],
  ['git commit --amend --no-edit', { pushed: true }],
  ['git rebase origin/main', { total: '3', local: '1' }],
  ['git rebase -i HEAD~3', { fail: true }],
  ['git filter-branch --tree-filter x'],
  ['git tag v1.0.0'],
  ['git tag -d v1.0.0'],
  ['git merge feat/example', { branch: 'main' }],
  ['git reset --hard origin/main'],
  ['git clean -fdx'],
  ['git checkout -- .'],
  ['git restore .'],
  ['git branch -D main'],
  ['git switch -c Feature/Thing'],
  ['git switch -c codex/agent-work'],
  ['git checkout -b feat/has_underscore'],
  ['git branch feat/double--dash'],
  ['git branch -m feat/old wip'],
  ['git worktree add ../x -b claude-work'],
  ['npm publish'],
  ['npm unpublish @vfortin/ui@0.0.1'],
  ['npm dist-tag add @vfortin/ui@0.0.1 latest'],
  ['yarn publish'],
  ['pnpm publish'],
  ['npm version patch'],
  ['gh pr merge 1 --squash'],
  ['gh workflow run deploy.yml'],
  ['gh workflow run site-build.yml -f revision=12'],
  ['gh workflow run "Deploy services"'],
  ['gh secret set VPS_HOST --body 1.2.3.4'],
  ['gh variable delete X'],
  ['gh release create v1.0.0'],
  ['gh api -X PUT repos/DevSkyLex/portfolio/pulls/1/merge'],
  ['gh api --method POST repos/DevSkyLex/portfolio/actions/workflows/deploy.yml/dispatches'],
  ['gh api -X PUT repos/DevSkyLex/portfolio/actions/secrets/VPS_HOST'],
  ['ansible-playbook playbooks/deploy.yml -e tag=abc --ask-vault-pass'],
  ['cd ansible && ansible-playbook playbooks/provision.yml -e ansible_user=ubuntu'],
  ['ansible-vault view ansible/inventory/group_vars/all/vault.yml'],
  ['ansible-vault decrypt ansible/inventory/group_vars/all/vault.yml'],
  ['ansible vps -m ping'],
  ['docker compose -f docker/compose.prod.yml up -d'],
  ['docker compose --env-file config -f docker/compose.prod.yml up -d'],
  ['bash docker/scripts/reload-nginx.sh'],
  ['bash docker/scripts/restore-check.sh'],
  ['docker compose -f compose.prod.yml --profile ops run --rm content-seed'],
  ['docker compose -f docker/compose.dev.yml down -v'],
  ['docker volume rm portfolio-dev_postgres'],
  ['docker system prune -a'],
  ['docker push ghcr.io/devskylex/portfolio-content-service:latest'],
  ['sh docker/scripts/deploy.sh abc'],
  ['bash /srv/portfolio/scripts/publish-site.sh 2026-01-01'],
  ['./docker/scripts/backup.sh'],
  ['npx drizzle-kit push --config apps/contact-service/drizzle.config.ts'],
  ['gh pr create --title x && git push origin main'],
  ['git status; git push origin main'],
  ["& 'C:\\Program Files\\Git\\cmd\\git.exe' push origin main"],
]) {
  void test(`denies: ${command}`, () => assert.equal(denied(command, state), true));
}

/**
 * Function cli
 *
 * @description
 * Runs the Git command guard with a simulated hook payload and optional working directory.
 *
 * @param {object | string} input - Payload object or raw text passed to standard input.
 * @param {string} cwd - Working directory supplied to the child process.
 * @returns {import('node:child_process').SpawnSyncReturns<string>} Child process result.
 */
const cli = (input, cwd = root) =>
  spawnSync(process.execPath, [path.join(here, 'guard-git.mjs')], {
    cwd,
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    windowsHide: true,
  });

void test('the CLI denies with exit 2 and a reason inside the repository', () => {
  const result = cli({ cwd: root, tool_name: 'Bash', tool_input: { command: 'npm publish' } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Blocked: npm publish/);
});

void test('the CLI passes an ordinary command, Codex cmd input and malformed input', () => {
  assert.equal(cli({ cwd: root, tool_input: { command: 'git status' } }).status, 0);
  assert.equal(cli({ cwd: root, tool_input: { cmd: 'git status' } }).status, 0);
  assert.equal(cli('not json').status, 0);
});

void test('the CLI is inert outside a portfolio checkout', () => {
  const outside = path.parse(root).root;
  assert.equal(cli({ cwd: outside, tool_input: { command: 'npm publish' } }, outside).status, 0);
});
