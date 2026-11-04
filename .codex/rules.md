# Rules for Codex

Read the matching rules before editing; paths are relative to the repository root. These are routing
references, not automatic activation. `docs/architecture/boundaries.md`, `docs/architecture/decisions.md`
and the library `README.md` files remain normative. Generated trees, `package-lock.json`,
`apps/web/src/locale/messages.xlf`, `apps/web/content-snapshot/` and the files managed by
`npx nx configure-ai-agents` are never hand-edited.

| Rule                                             | Matching paths or task                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| [Entry points](rules/barrels.md)                 | `libs/**/src/index.ts`, secondary entry points (`server.ts`, `http.ts`, `links.ts`)                                       |
| [Comments](rules/comments.md)                    | Authored `*.ts`, `*.mjs`, `*.html`                                                                                        |
| [Components](rules/components.md)                | `libs/frontend/**/*.component.{ts,html}`, `*.directive.ts`, `apps/web/src/**`                                             |
| [Design system](rules/design-system.md)          | `libs/frontend/ui/**`, `libs/frontend/design-tokens/**`, `apps/web/src/styles.css`, `apps/web/src/admin.css`, templates  |
| [Forms](rules/forms.md)                          | Contact, login and admin forms, `*.draft.ts`                                                                              |
| [Data access](rules/data-access.md)              | `libs/frontend/*/data-access/**`, `libs/frontend/http/**`                                                                 |
| [State](rules/state.md)                          | `**/state/**`, `*.store.ts`                                                                                               |
| [Routing and SSR](rules/routing-ssr.md)          | `*.routes.ts`, `*.routes.server.ts`, `libs/frontend/shell/**`, guards, interceptors, `apps/web/src/**`                    |
| [Tests](rules/testing.md)                        | `*.spec.ts`, `testing/` folders                                                                                           |
| [E2E](rules/e2e.md)                              | `apps/web-e2e/**`, browser verification                                                                                   |
| [Backend hexagonal](rules/backend-hexagonal.md)  | `libs/backend/**`, `apps/*-service/**`                                                                                    |
| [Contracts](rules/contracts.md)                  | `libs/contracts/**`                                                                                                       |
| [Operations](rules/ops.md)                       | `docker/**`, `ansible/**`, `.github/workflows/**`, `apps/web/scripts/**`, `apps/web-e2e/support/**`, `.github/scripts/**` |
| [Security](rules/security.md)                    | Identity, platform auth, Nginx, secrets, privacy-relevant contact code                                                    |
| [Git and commits](rules/git-and-commits.md)      | Every task                                                                                                                |
| [Language](rules/language.md)                    | Every task                                                                                                                |
| [Naming](references/naming.md)                   | Naming a project, file, class, selector, store, use case or message id                                                    |
| [Validation](references/validation.md)           | Choosing checks, including tooling-only work                                                                              |
| [Localization review](references/i18n-review.md) | Message ids, catalogs, locales                                                                                            |
