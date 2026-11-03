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

# AI tooling (Claude Code)

`AGENTS.md` holds the rules every assistant follows, including the hard limits; this repository ships its
own `.claude/` tooling, described in [.claude/README.md](.claude/README.md).

- **Agents and commands**: 23 `pf-*` agents (`.claude/agents/`) and `/pf-*` commands; `/pf-quality` runs
  `npx nx format:check`, `npx nx affected -t lint typecheck test build`, `npx nx run architecture:test`
  and, when the tooling changed, its tests.
- **Rules** (`.claude/rules/`) are path-scoped: each loads when you open a matching file; `language.md`
  and `git-and-commits.md` always load.
- **Hooks** run on every edit and shell command: `guard.mjs` refuses edits of generated files, secrets,
  local data and Nx-managed files and the high-signal architecture violations; `guard-git.mjs` refuses
  pushes to `main`, merges, deployments, Ansible, the production stack, tags, force pushes, history
  rewrites and hook bypasses; `guard-delete.mjs` refuses deletes git cannot undo; `format.mjs` formats the
  edited file with Prettier. A refusal means stop and ask, not work around it.
- **Dev servers** for the Browser pane are in `.claude/launch.json` (`web` 4200, `site` 4300, services
  3101 to 3103).
- **Hard limits** (the "AI tooling" section of `AGENTS.md` is authoritative): no commit unless the user
  asks; never push to `main`, merge into it or deploy; never read or write secrets (service `.env` files,
  `.data/`, `docker/dev/secrets/`, the Ansible vault, key files); never hand-edit generated or Nx-managed
  files. Code, docs and prompts are English; public UI copy is French source with English targets.

## Technology skills

Project-owned technology skills live in `.agents/skills/pf-*/`; the installed Nx and official Angular
packs remain tool-managed. For Angular work load `pf-angular` before the official `angular-developer`
references. Nx owns generators and tasks; the Angular MCP provides read-only documentation.
See [technology tooling](docs/workspace/technology-tooling.md) for the catalogue and source policy.
