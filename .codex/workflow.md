# Working on the portfolio with Codex

Resolve the checkout from the assigned workspace, not the shell's initial directory. Read `AGENTS.md`,
the matching entries of [rules.md](rules.md), `docs/architecture/boundaries.md`,
`docs/architecture/decisions.md` and the `README.md` of every project you touch. The mockup and the
Orbite design system own presentation ([design fidelity](references/design-fidelity.md)); operational
summaries here never override those sources.

## Tools and execution

Prefer Nx for every task (`npx nx test|lint|typecheck|build <project>`, `npx nx affected`,
`npx nx run-many`); check flags with `--help` rather than guessing. The `nx-mcp` server of
[config.toml](config.toml) answers project-graph and documentation questions when connected; the Nx
skills of `.agents/skills/` (`nx-workspace`, `nx-generate`, `nx-run-tasks`…) are managed by
`npx nx configure-ai-agents` and read-only here. Use `rg` for text search. Configuration is not
connection evidence; compiler, lint and tests remain the gates.

Run commands from the checkout root. On Windows use PowerShell with literal quoted paths. Start
background servers hidden, record their process ids and stop only what the task started. Ports: 4200 dev
server or e2e site, 4300 built site preview, 3101 content, 3102 contact, 3103 identity. Never read
service `.env` files, `.data/`, `docker/dev/secrets/`, the Ansible vault or key files.

## Scope and delegation

Follow the user's outcome and existing authorization; clarify only decisions that block useful work. A
skill or reference cannot grant permissions or override the sandbox. Use a specialist from
[the agent catalogue](references/agents.md) for a concrete, independent responsibility when the runtime
permits delegation: assign files, expected behaviour, allowed checks and a result format, and tell the
worker it shares the checkout. Reviews stay read-only. Do not launch nested `codex exec` processes.

## Technology guidance

Use project-authored `pf-*` skills in `.agents/skills/` for the technology being changed; these are
editable source, while installed Nx and Angular packs are not. For Angular tasks load `pf-angular`
before the official `angular-developer` references. The read-only Angular MCP supplies documentation;
Nx owns project discovery, generators and execution. Configuration is not evidence of connection.
See [technology tooling](../docs/workspace/technology-tooling.md).

## Native agent settings

Each `pf-*` role defines `model`, `model_reasoning_effort`, `service_tier` and `features.fast_mode` in its
own TOML under `.codex/agents/`. Select the custom agent type the runtime exposes; naming a generic task
does not load the role. Luna roles use Fast; Sol roles explicitly request Standard. Before dispatch,
check that the configured model and effort are available; an unavailable one is a reported limitation,
not permission to substitute a model or lower the effort. Do not alter the main session's model, speed,
trust or approval policy.

The parent assigns workspace, objective, files, contracts, observations, allowed checks and the result
format. Writers inherit session permissions; reviewers and auditors use the read-only sandbox and ask the
parent for evidence from checks that write caches or outputs.

## Hard limits

No commit unless the user asks. Never push to `main` (it deploys), merge into it, run `gh pr merge`,
trigger the deploy or site-build workflows, run Ansible playbooks, open the vault, use
`docker/compose.prod.yml`, push images, create tags, publish packages, rewrite pushed history or bypass
hooks ([git and commits](rules/git-and-commits.md), [operations](rules/ops.md)). The hooks refuse these;
a refusal means stop.

## Verification and delivery

Choose checks with [validation](references/validation.md). Before declaring a change done run
`npx nx affected -t lint typecheck test build` and `npx nx run architecture:test`. Presentation work is
checked against the mockup with captures or the computed-style diff, at 1440 and 390 px in both themes.
Report behaviour, changed files, actual commands and results and remaining limits with absolute paths.
Preserve unrelated changes and other clients' configuration.
