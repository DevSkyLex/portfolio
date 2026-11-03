# Portfolio native agents

The 23 `pf-*` role definitions in `.codex/agents/` set their model, effort and tier directly; the
Nx-managed `ci-monitor-subagent` (declared in [config.toml](../config.toml)) serves `/monitor-ci` and is
not part of this catalogue. See [the workflow](../workflow.md#native-agent-settings) for invocation,
availability and permissions.

| Agent                             | Responsibility                                                                                                                                                          | Model                  | Effort | Mode            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ | --------------- |
| `pf-api-adapter-builder`          | Build portfolio backend adapters: NestJS controllers and jobs, problem mappers, Drizzle repositories and migrations, mail and crypto adapters, and composition modules. | gpt-6.1-sol · Standard | medium | Assigned writes |
| `pf-api-contract-reviewer`        | Compare portfolio Zod contracts with controllers, problem mappers, frontend data access, fixtures and routing for drift.                                                | gpt-6.1-sol · Standard | high   | Read-only       |
| `pf-api-domain-builder`           | Build portfolio backend domain models, value rules and domain errors free of frameworks, ORM, Zod and I/O.                                                              | gpt-6.1-sol · Standard | high   | Assigned writes |
| `pf-api-use-case-builder`         | Build portfolio backend use cases with typed commands, application ports, application errors, outbox writes and in-memory fakes.                                        | gpt-6.1-sol · Standard | high   | Assigned writes |
| `pf-architecture-reviewer`        | Review portfolio project tags, module boundaries, hexagonal layering, public entry points and decision records.                                                         | gpt-6.1-sol · Standard | high   | Read-only       |
| `pf-comment-maintainer`           | Maintain assigned portfolio comments and JSDoc in English without changing behaviour, and format only the assigned files.                                               | gpt-6-luna · Fast      | medium | Assigned writes |
| `pf-comment-reviewer`             | Review comment accuracy and verification evidence without editing.                                                                                                      | gpt-6.1-sol · Standard | high   | Read-only       |
| `pf-e2e-runner`                   | Verify portfolio behaviour in a real browser on the built site with Playwright and axe, and record durable evidence.                                                    | gpt-6.1-sol · Standard | medium | Assigned writes |
| `pf-ops-reviewer`                 | Review portfolio Docker images, Compose stacks, Nginx configuration, Ansible roles and deployment scripts.                                                              | gpt-6.1-sol · Standard | high   | Read-only       |
| `pf-security-auditor`             | Review portfolio authentication, sessions, tokens, admin authorization, contact privacy, CSP and secret handling.                                                       | gpt-6.1-sol · Standard | xhigh  | Read-only       |
| `pf-test-writer`                  | Write and repair portfolio unit and integration tests at the boundary each unit owns, front and back.                                                                   | gpt-6.1-sol · Standard | high   | Assigned writes |
| `pf-web-a11y-auditor`             | Audit portfolio semantics, keyboard and focus behaviour, contrast intent and reduced motion with concrete evidence and limits.                                          | gpt-6.1-sol · Standard | high   | Read-only       |
| `pf-web-component-builder`        | Build portfolio pages, sections and presentational components from @vfortin/ui and the Orbite tokens with correct ownership and signal contracts.                       | gpt-6.1-sol · Standard | medium | Assigned writes |
| `pf-web-data-access-builder`      | Build portfolio frontend data-access services over HttpClient and the shared Zod contracts, with pure adapters to view models.                                          | gpt-6.1-sol · Standard | medium | Assigned writes |
| `pf-web-design-fidelity-reviewer` | Compare portfolio pages with the mockup boards through Playwright computed-style diffs and captures, and report deviations.                                             | gpt-6.1-sol · Standard | high   | Read-only       |
| `pf-web-feature-builder`          | Define portfolio frontend context libraries, their tags, public and secondary entry points, route trees and documentation.                                              | gpt-6.1-sol · Standard | high   | Assigned writes |
| `pf-web-form-builder`             | Build portfolio Signal Forms bound to @vfortin/ui controls with contract-aligned rules and server field errors.                                                         | gpt-6.1-sol · Standard | high   | Assigned writes |
| `pf-web-i18n-auditor`             | Audit portfolio message ids, the French source catalog and its English translations without claiming linguistic or visual completeness.                                 | gpt-6-luna · Fast      | medium | Read-only       |
| `pf-web-performance-reviewer`     | Review portfolio bundle cost, lazy and deferred loading, hydration and rendering cost of the animated layers from evidence.                                             | gpt-6.1-sol · Standard | high   | Read-only       |
| `pf-web-routing-ssr-builder`      | Build portfolio routes, render modes, prerender parameters, guards, interceptors and hydration boundaries.                                                              | gpt-6.1-sol · Standard | xhigh  | Assigned writes |
| `pf-web-signal-store`             | Build portfolio NgRx SignalStore slices with named CallState fields, normalized store errors and deliberate provider scope.                                             | gpt-6.1-sol · Standard | high   | Assigned writes |
| `pf-web-ui-catalogue-builder`     | Build or tune entries of the @vfortin/ui catalogue and the Orbite design tokens on @angular/cdk and Tailwind.                                                           | gpt-6.1-sol · Standard | high   | Assigned writes |
| `pf-workflow-reviewer`            | Review portfolio GitHub workflows, Git hooks and the CI, image and site-publication gates.                                                                              | gpt-6.1-sol · Standard | high   | Read-only       |

## Selection boundaries

- Frontend builders split by artefact: pages, sections and presentational components
  (`pf-web-component-builder`), Signal Forms (`pf-web-form-builder`), stores (`pf-web-signal-store`),
  services and adapters (`pf-web-data-access-builder`), routes, render modes and hydration
  (`pf-web-routing-ssr-builder`), library structure and entry points (`pf-web-feature-builder`), the
  generic catalogue and tokens (`pf-web-ui-catalogue-builder`). Avoid assigning one file to two of them.
- Backend builders split by layer: domain (`pf-api-domain-builder`), application use cases and ports
  (`pf-api-use-case-builder`), adapters, migrations and composition (`pf-api-adapter-builder`).
- `pf-test-writer` owns specs at every boundary; `pf-e2e-runner` owns the Playwright suite and browser
  evidence; neither changes production code to make a test pass.
- Reviewers and auditors are read-only: architecture (`pf-architecture-reviewer`), contracts
  (`pf-api-contract-reviewer`), security and privacy (`pf-security-auditor`), operations
  (`pf-ops-reviewer`), CI and hooks (`pf-workflow-reviewer`), localization (`pf-web-i18n-auditor`),
  accessibility (`pf-web-a11y-auditor`), mockup fidelity (`pf-web-design-fidelity-reviewer`) and
  performance (`pf-web-performance-reviewer`). They ask the parent for the output of writing checks.
- Design fidelity compares observed values with the mockup; accessibility judges semantics and
  interaction; e2e executes scenarios. Visibility assertions alone do not establish fidelity.
- `pf-comment-maintainer` changes comments only; `pf-comment-reviewer` reviews comment accuracy and verification evidence without writing.

Read-only roles use the native read-only sandbox. Implementation roles keep the user's runtime
permissions; no agent grants itself filesystem, network or approval authority, and none deploys.
