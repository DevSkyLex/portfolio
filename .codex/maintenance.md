# Maintaining the portfolio agent tooling

## Check a tooling change

Run from the checkout root, stopping at the first failure:

```powershell
python -B .codex/scripts/validate.py
python -B -m unittest discover -s .codex/scripts -p "test_*.py"
node --test .claude/hooks/guard.test.mjs .claude/hooks/guard-git.test.mjs .claude/hooks/guard-delete.test.mjs .claude/hooks/format.test.mjs .claude/hooks/comment-diff.test.mjs .codex/hooks/adapter.test.mjs .codex/scripts/style-diff.test.mjs
npx prettier --check --ignore-path .gitignore .claude .codex .githooks .mcp.json AGENTS.md CLAUDE.md
```

`.prettierignore` excludes `.claude/` and `.codex/` from `npx nx format:check` and from the format hook;
the last command formats-checks the tooling explicitly against `.gitignore` only.

The `ai-tooling` job in `.github/workflows/ci.yml` runs the hook tests, Python tests and validator. The workspace also exposes npm scripts in `package.json`. Do not rebuild the application for a tooling-only change.

`validate.py` checks:

- the parity of the two catalogues through `check_agent_parity.py`: the same `pf-*` names in
  `.claude/agents/*.md` and `.codex/agents/*.toml`; Claude frontmatter (model and effort, explicit tools,
  no write or delegation tool for reviewers and auditors, no delegation for anyone, no reference to Codex
  roles, existing Claude skills and rules); every native role (explicit model and effort, Fast for Luna
  only, read-only sandbox for reviewers and auditors, none for writers); Fast disabled in
  `.claude/settings.json`;
- `.codex/config.toml`: no session policy (model, effort, approval, sandbox, trust, service tier, agent
  defaults), MCP servers without machine paths, every declared agent's `config_file` present and no `pf-*`
  role declared there (they are discovered);
- `.codex/hooks.json`, the Claude settings hooks and the byte-identical shared files: `guard.mjs`,
  `guard-git.mjs`, `guard-delete.mjs`, `format.mjs` in `.claude/hooks/` and `.codex/hooks/`, and
  `style-diff.mjs` in `.claude/skills/design-fidelity/` and `.codex/scripts/`;
- the Claude skills (frontmatter name and description) and command agent references when present;
- local Markdown links of `.codex/`, `.claude/`, `AGENTS.md` and `CLAUDE.md` (`check_links.py`);
- every repository path written in backticks in the agents, commands, rules, skills and references
  (`apps/…`, `libs/…`, `tools/…`, `docs/…`, `docker/…`, `ansible/…`, `.github/…`, `.claude/…`, `.codex/…`)
  exists, placeholders (`<ctx>`, `*`, `{a,b}`) excepted;
- that no client-scoped Codex file (agents, rules, references, hooks, workflow, rules index, config) names
  the Claude folder.

Hooks do not intercept arbitrary shell reads of secrets: instructions and sandbox permissions remain essential. Tests prove the checks, not that the instructions are sound: review the text of a changed agent, rule or
skill against the real tree. `python -B .codex/scripts/check_agent_parity.py` prints the catalogue report
alone.

## Hooks and their design

| Hook               | Claude event                         | Codex path                        | Refuses                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guard.mjs`        | PreToolUse `Write\|Edit\|MultiEdit`  | adapter, each patched file (pre)  | generated trees and files, `.git/`, Nx-managed AI files, secrets and local data (`.env`, `.data/`, vault, `docker/dev/secrets/`, key files, token or private-key text), component rules in `apps/web/src/styles.css`, `styleUrl`, Reactive Forms, `export *` outside the catalogue barrel and its internals, frameworks or I/O in a backend domain or application |
| `guard-git.mjs`    | PreToolUse `Bash\|PowerShell`        | adapter, shell (pre)              | pushes to or merges into `main`, force pushes, tags, hook bypasses, history rewrites, destructive resets, bad branch names, publishing, `gh pr merge`, production workflows, secrets, Ansible playbooks and vault, the production Compose stack, deployment scripts, `docker push`, volume deletion, `drizzle-kit push`                                           |
| `guard-delete.mjs` | PreToolUse `Bash\|PowerShell`        | adapter, shell (pre)              | out-of-tree recursive deletes, roots, `.git`, the checkout itself, `.data/` and the vault                                                                                                                                                                                                                                                                         |
| `format.mjs`       | PostToolUse `Write\|Edit\|MultiEdit` | adapter, each patched file (post) | nothing: formats with the repository Prettier, honouring `.prettierignore` (which excludes `.claude/` and `.codex/`)                                                                                                                                                                                                                                              |
| `adapter.mjs`      | —                                    | `hooks.json`                      | edits escaping the checkout (symlinks included) and the prefixes of `protected-paths.mjs`                                                                                                                                                                                                                                                                         |

When a guard rule changes: edit `.claude/hooks/<hook>.mjs`, copy it byte for byte to
`.codex/hooks/<hook>.mjs`, add allowed and denied cases to its test, and keep the rule aligned with
`eslint.config.mjs`, `tools/architecture/src/boundaries.spec.ts` and the Git hooks it mirrors. Guard tests
never modify protected files. The hooks are inert outside a checkout whose `package.json` is named
`@vfortin/source`.

## Git hooks

`.githooks/commit-msg` runs commitlint (`commitlint.config.mjs`); `.githooks/pre-push` runs
`npx nx format:check` and `npx nx affected -t lint typecheck` against the pushed range
(`PF_SKIP_PUSH_CHECKS=1` skips it for a human; the agent guard refuses that variable). `npm install` sets
`core.hooksPath` through the `prepare` script. Both hooks need the executable bit in the index
(`git add --chmod=+x .githooks/pre-push`) for Linux and macOS clones.

## Nx-managed files

`npm run ai:configure` selects only Claude and Codex through Nx
(`nx configure-ai-agents --agents claude codex --no-interactive`). Nx owns its seven skill folders
under `.agents/skills/`, `.codex/agents/ci-monitor-subagent.toml`, the `nx-mcp` and `ci-monitor-subagent`
entries of `config.toml`, and the Nx sections of `AGENTS.md` / `CLAUDE.md`. Use this explicit client
selection for updates; review the diff and preserve portfolio configuration and AI tooling sections.
Other assistant-specific configuration and duplicate skill trees are intentionally absent.

Valid `pf-*` skill folders under `.agents/skills/` belong to this repository and remain editable.
Every such skill has a thin discovery wrapper with matching name and description under
`.claude/skills/`; the validator checks canonical links, metadata parity, local references and
independence from either client's configuration. All other shared skill folders, including Nx and
vendored Angular guidance, remain immutable and excluded from automatic formatting. Update them with
their owning installer rather than hand editing them.
