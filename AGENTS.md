<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Portfolio — project rules

- Architecture and boundaries: `docs/architecture/boundaries.md`; decisions: `docs/architecture/decisions.md`; generators: `docs/workspace/generators.md`.
- Every project carries three tags (`scope:*`, `platform:*`, `layer:*`). Never widen `depConstraints` to let an import through: move the code.
- A project is only created when it receives its first real code. No `shared`, `common` or `utils`.
- Backend: `domain` and `application` without NestJS, ORM, Zod or transport; tested without starting Nest. Ports in `application`, implementations in `adapters-out`, wiring in `composition`.
- Frontend: `dentalstock-web` conventions (standalone, OnPush, `input()`/`output()`, NgRx SignalStore, Signal Forms, Tailwind v4 on tokens, literal classes).
- Verify before finishing: `npx nx affected -t lint typecheck test build` and `npx nx run architecture:test`.
- Operations: `docs/operations/deployment.md` (Ansible, Compose, workflows); full local stack: `docker/compose.dev.yml`.

# AI tooling

Mandatory for every assistant, whatever the vendor; explicit user instructions take precedence over
procedures, never over the hard limits.

- **Claude Code**: [.claude/README.md](.claude/README.md) — the `pf-*` agents, the `/pf-*` commands
  (`/pf-quality` runs the local gate), path-scoped rules in `.claude/rules/`, skills and hooks.
- **Codex**: read [.codex/workflow.md](.codex/workflow.md) and the matching entries of
  [.codex/rules.md](.codex/rules.md) before editing; native roles in `.codex/agents/`, setup and
  maintenance in [.codex/README.md](.codex/README.md).
- **Specialists** (23 `pf-*` roles, same names in both clients) are available, not mandatory: delegate a
  bounded responsibility with explicit files and checks. Reviewers and auditors are read-only.
- **Language**: code, comments, docs, prompts, tests, logs, routes, commits and PR text in English;
  public UI copy is French source with explicit `@@` ids and English targets in
  `apps/web/src/locale/messages.en.xlf`; the admin UI is French only.
- **Hard limits** (never without the user's explicit request in this conversation; the hooks refuse most
  of them): no commit unless asked; no push to `main`, merge into it or `gh pr merge` (`main` deploys); no
  deployment (deploy or site-build workflows, Ansible playbooks, `docker/compose.prod.yml`, deployment
  scripts, image pushes); no tags, force pushes, rewrites of pushed history or hook bypasses
  (`--no-verify`, `core.hooksPath`, `PF_SKIP_PUSH_CHECKS`); never read or write secrets (service `.env`
  files, `.data/`, `docker/dev/secrets/`, the Ansible vault, key files); never hand-edit generated files
  (`dist/`, `node_modules/`, `package-lock.json`, `apps/web/src/locale/messages.xlf`,
  `apps/web/content-snapshot/`, `migrations/meta/`) or the files managed by `npx nx configure-ai-agents`.
  A refusal means stop and ask, not find another way.
- Commits follow Conventional Commits (`commitlint.config.mjs`, `.githooks/commit-msg`); branches are
  `<type>/<kebab-description>`. Report the checks you actually ran; a check not run is reported as not run.

## Technology skills

Project-owned technology skills live in `.agents/skills/pf-*/`; the installed Nx and official Angular
packs remain tool-managed. For Angular work load `pf-angular` before the official `angular-developer`
references. Nx owns generators and tasks; the Angular MCP provides read-only documentation.
See [technology tooling](docs/workspace/technology-tooling.md) for the catalogue and source policy.
