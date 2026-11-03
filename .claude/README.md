# Portfolio: Claude Code tooling

This `.claude/` folder ships the Claude Code tooling of the portfolio Nx monorepo: **23 native agents**,
20 slash commands, 16 rules, 9 skills, 4 hooks with their tests, the project settings and the dev-server
configurations. The same 23 roles exist for Codex in `.codex/agents/`, with the same names and
responsibilities; the Claude definitions are standalone Markdown files and do not import or depend on the
Codex ones.

Start from [AGENTS.md](../AGENTS.md) (the rules every assistant follows) and [CLAUDE.md](../CLAUDE.md).
Architecture: [boundaries](../docs/architecture/boundaries.md), [decisions](../docs/architecture/decisions.md);
generators: [docs/workspace/generators.md](../docs/workspace/generators.md); operations:
[docs/operations/deployment.md](../docs/operations/deployment.md).

## Settings (`settings.json`)

- **Hooks** resolve through `${CLAUDE_PROJECT_DIR}`: `guard.mjs` before every `Write` / `Edit` /
  `MultiEdit`, `guard-git.mjs` then `guard-delete.mjs` before every `Bash` / `PowerShell` command,
  `format.mjs` after every write.
- **Permissions** pre-approve the Nx checks (`npx nx affected`, `run-many`, `test`, `lint`, `typecheck`,
  `build`, `e2e web-e2e`, `run architecture:test`, `run web:extract-i18n`, `format:check`, `format:write`,
  `show`), `npx prettier`, `node --test`, the tooling validators of `.codex/scripts/`, read-only git
  (`status`, `diff`, `log`, `show`) and the Codex CLI call of the `codex-challenge` skill. Reading service
  `.env` files, `.data/`, `docker/dev/secrets/`, the Ansible vault, `.vault-pass` and `*.pem` is denied.
  Nothing grants `git push`, `gh` writes, Ansible or Docker; those go through the prompt, and
  `guard-git` refuses the dangerous ones.
- These permissions and hooks do not intercept every possible shell or search access to secrets. The
  repository rules and active sandbox remain necessary; the broad `.env.*` read deny also covers examples.
- The Nx plugin (`nx@nx-claude-plugins`, marketplace `nrwl/nx-ai-agents-config`) stays enabled: it brings
  the `nx-mcp` server, the Nx skills and the `/monitor-ci` flow. The existing sandbox entry is kept.
  Update the Nx integration with `npm run ai:configure`, which selects Claude and Codex explicitly.
- **MCP**: `enabledMcpjsonServers` enables `playwright` and `context7` from the root `.mcp.json`.
- **Fast mode is off** (`fastMode: false`, `CLAUDE_CODE_DISABLE_FAST_MODE=1`); agent models and efforts
  are explicit in each frontmatter.

## Agents

Each agent has an explicit model and effort, an ownership statement, the skills to load and a bounded
three-heading report. Builders inherit permissions and never commit; reviewers and auditors are
read-only: their tools exclude `Edit`, `Write`, `MultiEdit` and `NotebookEdit`, and they ask the parent
for the output of checks that write caches or outputs. No agent lists `Agent` or `Task` or starts a Codex
challenge.

| Agent                             | Responsibility                                                                                                                                                          | Model  | Effort | Mode            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | --------------- |
| `pf-api-adapter-builder`          | Build portfolio backend adapters: NestJS controllers and jobs, problem mappers, Drizzle repositories and migrations, mail and crypto adapters, and composition modules. | sonnet | high   | Assigned writes |
| `pf-api-contract-reviewer`        | Compare portfolio Zod contracts with controllers, problem mappers, frontend data access, fixtures and routing for drift.                                                | opus   | high   | Read-only       |
| `pf-api-domain-builder`           | Build portfolio backend domain models, value rules and domain errors free of frameworks, ORM, Zod and I/O.                                                              | opus   | high   | Assigned writes |
| `pf-api-use-case-builder`         | Build portfolio backend use cases with typed commands, application ports, application errors, outbox writes and in-memory fakes.                                        | opus   | high   | Assigned writes |
| `pf-architecture-reviewer`        | Review portfolio project tags, module boundaries, hexagonal layering, public entry points and decision records.                                                         | opus   | xhigh  | Read-only       |
| `pf-comment-maintainer`           | Maintain assigned portfolio comments and JSDoc in English without changing behaviour, and format only the assigned files.                                               | sonnet | medium | Assigned writes |
| `pf-comment-reviewer`             | Review comment accuracy and verification evidence without editing.                                                                                                      | sonnet | high   | Read-only       |
| `pf-e2e-runner`                   | Verify portfolio behaviour in a real browser on the built site with Playwright and axe, and record durable evidence.                                                    | sonnet | high   | Assigned writes |
| `pf-ops-reviewer`                 | Review portfolio Docker images, Compose stacks, Nginx configuration, Ansible roles and deployment scripts.                                                              | sonnet | high   | Read-only       |
| `pf-security-auditor`             | Review portfolio authentication, sessions, tokens, admin authorization, contact privacy, CSP and secret handling.                                                       | opus   | xhigh  | Read-only       |
| `pf-test-writer`                  | Write and repair portfolio unit and integration tests at the boundary each unit owns, front and back.                                                                   | sonnet | high   | Assigned writes |
| `pf-web-a11y-auditor`             | Audit portfolio semantics, keyboard and focus behaviour, contrast intent and reduced motion with concrete evidence and limits.                                          | sonnet | high   | Read-only       |
| `pf-web-component-builder`        | Build portfolio pages, sections and presentational components from @vfortin/ui and the Orbite tokens with correct ownership and signal contracts.                       | sonnet | high   | Assigned writes |
| `pf-web-data-access-builder`      | Build portfolio frontend data-access services over HttpClient and the shared Zod contracts, with pure adapters to view models.                                          | sonnet | high   | Assigned writes |
| `pf-web-design-fidelity-reviewer` | Compare portfolio pages with the mockup boards through Playwright computed-style diffs and captures, and report deviations.                                             | sonnet | high   | Read-only       |
| `pf-web-feature-builder`          | Define portfolio frontend context libraries, their tags, public and secondary entry points, route trees and documentation.                                              | opus   | high   | Assigned writes |
| `pf-web-form-builder`             | Build portfolio Signal Forms bound to @vfortin/ui controls with contract-aligned rules and server field errors.                                                         | sonnet | high   | Assigned writes |
| `pf-web-i18n-auditor`             | Audit portfolio message ids, the French source catalog and its English translations without claiming linguistic or visual completeness.                                 | sonnet | medium | Read-only       |
| `pf-web-performance-reviewer`     | Review portfolio bundle cost, lazy and deferred loading, hydration and rendering cost of the animated layers from evidence.                                             | sonnet | high   | Read-only       |
| `pf-web-routing-ssr-builder`      | Build portfolio routes, render modes, prerender parameters, guards, interceptors and hydration boundaries.                                                              | opus   | xhigh  | Assigned writes |
| `pf-web-signal-store`             | Build portfolio NgRx SignalStore slices with named CallState fields, normalized store errors and deliberate provider scope.                                             | opus   | high   | Assigned writes |
| `pf-web-ui-catalogue-builder`     | Build or tune entries of the @vfortin/ui catalogue and the Orbite design tokens on @angular/cdk and Tailwind.                                                           | sonnet | high   | Assigned writes |
| `pf-workflow-reviewer`            | Review portfolio GitHub workflows, Git hooks and the CI, image and site-publication gates.                                                                              | sonnet | high   | Read-only       |

## Commands

| Builders                                                    | Backend                      | Review (read-only)                       | Gate          |
| ----------------------------------------------------------- | ---------------------------- | ---------------------------------------- | ------------- |
| `/pf-component`, `/pf-form`, `/pf-store`, `/pf-data-access` | `/pf-domain`, `/pf-use-case` | `/pf-arch-review`, `/pf-contract-review` | `/pf-quality` |
| `/pf-ui`, `/pf-feature`, `/pf-route`                        | `/pf-adapter`                | `/pf-a11y`, `/pf-design-review`          |               |
| `/pf-test`, `/pf-e2e`, `/pf-comments`                       |                              | `/pf-security`, `/pf-ops-review`         |               |

A command is **delegation**: it names the agent, passes `$ARGUMENTS` and states what the report must
contain; the rules live in the agent. `/pf-quality` runs the gate itself, stopping at the first failure:
`npx nx format:check`, `npx nx affected -t lint typecheck test build`, `npx nx run architecture:test`,
then the tooling tests when `.claude/`, `.codex/`, `.githooks/` or `.mcp.json` changed.

## Skills (`skills/`)

| Skill                 | Answers                                                           | Codex counterpart                      |
| --------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| `portfolio-naming`    | project names, tags, folders, suffixes, selectors, use cases, ids | `.codex/references/naming.md`          |
| `ui-catalogue`        | consuming and extending `@vfortin/ui`, tokens, themes, icons      | `.codex/references/ui-catalogue.md`    |
| `signalstore-recipes` | store templates, call states, errors, scope                       | `.codex/references/signalstore.md`     |
| `data-access-recipes` | services, type-only contracts, adapters, errors, snapshot         | `.codex/references/data-access.md`     |
| `web-testing`         | `nx test` usage, harnesses, boundaries                            | `.codex/references/web-testing.md`     |
| `e2e-playwright`      | the built-site suite, projects, locators, axe, browsers           | `.codex/references/e2e.md`             |
| `api-use-case-recipe` | a backend change from domain to composition, with tests           | `.codex/references/api-use-case.md`    |
| `design-fidelity`     | mockup sources, local serving, `style-diff.mjs`                   | `.codex/references/design-fidelity.md` |
| `codex-challenge`     | a read-only Codex second opinion, on explicit request             | none                                   |

Each skill names its Codex counterpart: change one, change both. `design-fidelity/style-diff.mjs` is a
byte-identical copy of `.codex/scripts/style-diff.mjs` (tests: `.codex/scripts/style-diff.test.mjs`).

## Rules (`rules/`)

Path-scoped instructions that load automatically when a matching file is read; `language.md` and
`git-and-commits.md` have no `paths:` and always load. Each has a Codex twin in `.codex/rules/`.

| Rule                   | Loads for                                   | Carries                                                            |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `barrels.md`           | library entry points                        | named exports, the catalogue exception, secondary entries          |
| `comments.md`          | `*.ts`, `*.mjs`, `*.html`                   | English, contract-first JSDoc, decision references                 |
| `components.md`        | components, directives, the web app sources | OnPush, prefixes, inputs and outputs, prerender safety, i18n       |
| `design-system.md`     | catalogue, tokens, styles, templates        | `@vfortin/ui`, tokens, themes, plain-page constraints              |
| `forms.md`             | contact, login, admin forms                 | Signal Forms, contract bounds, server errors, honeypot             |
| `data-access.md`       | data-access and `web-http`                  | services, type-only contracts, adapters, snapshot                  |
| `state.md`             | stores                                      | SignalStore house shape and scope                                  |
| `routing-ssr.md`       | routes, shell, guards, interceptors         | prerender, admin client rendering, hydration, Nginx parity         |
| `testing.md`           | specs and `testing/`                        | runners, boundaries, architecture cases                            |
| `e2e.md`               | the e2e project                             | built site, projects, locators, axe                                |
| `backend-hexagonal.md` | backend libraries and services              | layers, ports, outbox, migrations, roles                           |
| `contracts.md`         | contracts                                   | Zod mini, type-only in the browser, fixtures                       |
| `ops.md`               | Docker, Ansible, workflows, scripts         | production limits, secrets, images, Nginx                          |
| `security.md`          | identity, auth, Nginx                       | secrets, tokens, cookies, privacy, CSP                             |
| `language.md`          | always                                      | English everywhere, French source UI copy                          |
| `git-and-commits.md`   | always                                      | no commit unless asked, `main` is production, Conventional Commits |

## MCP servers (`../.mcp.json`)

| Server       | Command                                               | Note                                                                                     |
| ------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `playwright` | `npx -y @playwright/mcp`                              | browser automation for locator work; only `pf-e2e-runner` declares its tools             |
| `context7`   | `npx -y @upstash/context7-mcp`                        | library documentation (Angular, NgRx, NestJS, Drizzle, Tailwind, CDK)                    |
| `angular`    | `npx -y @angular/cli@22.2.5 mcp --read-only --root .` | Angular best practices and versioned documentation; discovery and execution stay with Nx |

`angular` runs `npx -y @angular/cli@22.2.5 mcp --read-only --root .` with analytics disabled. It supplies
best-practice and versioned documentation lookups; Nx owns project discovery and task execution because
this workspace has no `angular.json`. It needs no local CLI dependency. The relevant frontend agents
explicitly include its two documentation tools. `nx-mcp` remains supplied by the Nx plugin.

Shared technology skills have thin discovery entries under `.claude/skills/` and canonical bodies under
`.agents/skills/`. Start Angular work with `pf-angular`, then read the relevant official
`angular-developer` references. The other project skills cover NestJS, Drizzle/PostgreSQL/PGlite, Zod
and the local Compose/Nginx/Traefik contract. Existing catalogue, NgRx and testing recipes stay available.
See [technology tooling](../docs/workspace/technology-tooling.md) for sources, license and update checks.

## Hooks (`hooks/`)

| Hook               | Event                                    | Refuses or does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `guard.mjs`        | PreToolUse `Write`, `Edit`, `MultiEdit`  | generated trees (`node_modules`, `dist`, `tmp`, `.angular`, `.nx`, `coverage`, test reports, `out-tsc`, `.vitest`), the content snapshot, Drizzle `migrations/meta`, installed Ansible collections, `package-lock.json`, `apps/web/src/locale/messages.xlf`, `.git/`, files managed by `npx nx configure-ai-agents`; secrets and local data (`.env*`, `.data/`, the vault and `.vault-pass`, `docker/dev/secrets/`, key files, token or private-key text); class rules in `apps/web/src/styles.css`, `styleUrl`, Reactive Forms, `export *` outside the catalogue barrel and catalogue internals in it, frameworks or I/O in a backend domain or application |
| `guard-git.mjs`    | PreToolUse `Bash`, `PowerShell`          | pushes to or merges into `main` (it deploys), force pushes, tags, `--no-verify`, `core.hooksPath` changes, `PF_SKIP_PUSH_CHECKS`, history rewrites, `reset --hard`, `clean -f`, `checkout .`, bad branch names, publishing, `gh pr merge`, `gh workflow run` of deploy or site-build, `gh secret` / `variable` writes, `gh release` writes, `gh api` writes, `ansible-playbook` (except `--syntax-check` / `--list-*`), ad-hoc `ansible`, `ansible-vault`, `docker compose` on `compose.prod.yml` (except `config`), `docker compose down -v`, volume and system prunes, `docker push`, the deploy, publish and backup scripts, `drizzle-kit push` / `drop`  |
| `guard-delete.mjs` | PreToolUse `Bash`, `PowerShell`          | out-of-tree recursive deletes, roots, `.git`, the checkout itself, `.data/` and the vault; disposable outputs always pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `format.mjs`       | PostToolUse `Write`, `Edit`, `MultiEdit` | formats the edited file with the repository Prettier (`.prettierrc`, Tailwind class sorting), honouring `.prettierignore` (which currently excludes `.claude/` and `.codex/`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

The hooks are dependency-free Node modules, cross-platform and inert outside a checkout whose
`package.json` is named `@vfortin/source`. A hook cannot know what the user asked for: when the user
really wants a refused action, they run it themselves. The Codex hooks carry byte-identical copies of the
four files (change one, change both); `hooks/hooks.json` wires the same hooks through
`${CLAUDE_PLUGIN_ROOT}` for plugin mode. Tests: the `node --test` line of `.codex/maintenance.md`.

## Plugin (`.claude-plugin/plugin.json`)

The folder is also a plugin named `portfolio`, so agents, commands, skills and hooks can be installed from
another workspace. In this repository the tooling loads natively: do not also enable the plugin here, or
the hooks run twice. Rules, permissions and settings are not plugin components. After changing anything
under `.claude/`, bump the plugin `version` (patch).

## Dev servers (`launch.json`)

| Configuration      | Port | What                                                                                                                                                              |
| ------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web`              | 4200 | `npx nx serve web`: dev server, French only, proxy of the API prefixes to the services (`apps/web/proxy.conf.json`)                                               |
| `site`             | 4300 | `node apps/web-e2e/support/preview/serve-site.mjs dist/apps/web/browser 4300`: the built, prerendered FR/EN site served like Nginx (run `npx nx build web` first) |
| `content-service`  | 3101 | `npx nx serve content-service` (PGlite; `npx nx run content-service:db-migrate` and `db-seed` first)                                                              |
| `contact-service`  | 3102 | `npx nx serve contact-service` (`json:` SMTP that only logs)                                                                                                      |
| `identity-service` | 3103 | `npx nx serve identity-service` (`npx nx run identity-service:generate-key` once)                                                                                 |

The standalone Playwright suite starts a dedicated built-site server on `E2E_PORT` (default 4200,
validated 1–65535). Choose an available port rather than stopping or reusing an unknown user's server.
`web-e2e:e2e-stack` separately owns an isolated real-service stack on 18080/18025, including UI
mutations, TOTP/cookie flows and authenticated axe checks; it never uses `portfolio-dev` or its volumes.

## Validating this tooling

Run the commands of [.codex/maintenance.md](../.codex/maintenance.md#check-a-tooling-change): the
validator and its Python tests, the hook and script tests, and Prettier on the tooling folders.
