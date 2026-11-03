# Portfolio in Codex

This directory holds the Codex tooling of the portfolio monorepo. Start with [AGENTS.md](../AGENTS.md),
then follow the [workflow](workflow.md) and the [rules for the files you touch](rules.md). Architecture is
defined in [boundaries](../docs/architecture/boundaries.md) and [decisions](../docs/architecture/decisions.md);
generators in [docs/workspace/generators.md](../docs/workspace/generators.md); operations in
[docs/operations/deployment.md](../docs/operations/deployment.md).

## Choose the right entry point

A reference provides a procedure; an agent carries out a bounded responsibility. Having a specialist
available never makes delegation mandatory.

| Need                        | Reference                                                                                                                          | Agent                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page, section, component    | [UI catalogue](references/ui-catalogue.md), [naming](references/naming.md)                                                         | `pf-web-component-builder`                                                                                                                                                                                                               |
| Catalogue entry or token    | [UI catalogue](references/ui-catalogue.md)                                                                                         | `pf-web-ui-catalogue-builder`                                                                                                                                                                                                            |
| Form                        | [UI catalogue](references/ui-catalogue.md), [forms rule](rules/forms.md)                                                           | `pf-web-form-builder`                                                                                                                                                                                                                    |
| Store                       | [SignalStore](references/signalstore.md)                                                                                           | `pf-web-signal-store`                                                                                                                                                                                                                    |
| Service, adapter            | [data access](references/data-access.md)                                                                                           | `pf-web-data-access-builder`                                                                                                                                                                                                             |
| Library, entry point        | [naming](references/naming.md), [entry points](rules/barrels.md)                                                                   | `pf-web-feature-builder`                                                                                                                                                                                                                 |
| Route, prerender, hydration | [routing and SSR](rules/routing-ssr.md)                                                                                            | `pf-web-routing-ssr-builder`                                                                                                                                                                                                             |
| Domain, use case, adapter   | [API use case](references/api-use-case.md)                                                                                         | `pf-api-domain-builder`, `pf-api-use-case-builder`, `pf-api-adapter-builder`                                                                                                                                                             |
| Tests, browser              | [web testing](references/web-testing.md), [e2e](references/e2e.md)                                                                 | `pf-test-writer`, `pf-e2e-runner`                                                                                                                                                                                                        |
| Reviews (read-only)         | [validation](references/validation.md), [i18n review](references/i18n-review.md), [design fidelity](references/design-fidelity.md) | `pf-architecture-reviewer`, `pf-api-contract-reviewer`, `pf-security-auditor`, `pf-ops-reviewer`, `pf-workflow-reviewer`, `pf-web-i18n-auditor`, `pf-web-a11y-auditor`, `pf-web-design-fidelity-reviewer`, `pf-web-performance-reviewer` |
| Comments                    | [comments rule](rules/comments.md)                                                                                                 | `pf-comment-maintainer`, `pf-comment-reviewer`                                                                                                                                                                                           |

The catalogue has **23 portfolio agents** ([agents](references/agents.md)) plus the Nx-managed
`ci-monitor-subagent`. Claude Code has its own standalone tooling with the same agent names; neither client
depends on the other's files. Third-party skills: [third-party-skills.md](third-party-skills.md).

## Configuration

[config.toml](config.toml) is tracked and portable (no machine path, no model, approval, sandbox or trust
policy): it declares `nx-mcp` (written by `npx nx configure-ai-agents`), the optional `playwright`, `context7` and read-only `angular` servers, `features.multi_agent` and the Nx `ci-monitor-subagent`. Native `pf-*` roles are
discovered from `.codex/agents/` and are not declared there. An MCP entry does not prove a connection.
Keep personal settings and machine paths in user-level configuration.

The shared technology skills are discovered under `.agents/skills/`; start Angular work with
`pf-angular`, then read only the relevant upstream references. See
[technology tooling](../docs/workspace/technology-tooling.md) for the skill catalogue, Angular MCP pin,
Nx discovery limitation and upstream license.

## Hooks

[hooks.json](hooks.json) runs [hooks/adapter.mjs](hooks/adapter.mjs) before and after tool calls: shell
commands go through `guard-git.mjs` and `guard-delete.mjs`; every file of an edit or patch through
`guard.mjs` before and `format.mjs` (Prettier) after; edits escaping the checkout and the Nx-managed or
installed paths of `protected-paths.mjs` are refused. Hooks need the runtime's trust review and are not a
sandbox. Details in [maintenance.md](maintenance.md).

## Validation

Tooling prerequisites: Python 3.11+ and Node.js 24. Run the commands of [maintenance.md](maintenance.md)
after changing anything here; choose application checks with [validation](references/validation.md).
After changing roles or references, open a new session if the catalogue still shows old entries.
