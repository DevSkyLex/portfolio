---
name: portfolio-naming
description: Lookup table for portfolio naming — Nx project names, import paths and tags, folders, file suffixes, class names, selector prefixes, store and call-state names, use cases and ports, message ids and test names. Use when creating any file or project, or when unsure whether an existing name is the convention.
---

# Naming lookup

Codex counterpart: `.codex/references/naming.md`; change one, change both. Normative sources:
`docs/architecture/boundaries.md` (tags), `docs/workspace/generators.md` (project names and import paths).

## Projects

| Kind                           | Folder                                                        | Nx name / import path                              | Tags                                                                       |
| ------------------------------ | ------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| frontend context layer         | `libs/frontend/<ctx>/<layer>`                                 | `<ctx>-web-<layer>` / `@vfortin/<ctx>-web-<layer>` | `scope:<ctx>,platform:web,layer:<layer>`                                   |
| backend domain / application   | `libs/backend/<ctx>/<layer>`                                  | `<ctx>-<layer>` / `@vfortin/<ctx>-<layer>`         | `scope:<ctx>,platform:neutral,layer:<layer>`                               |
| backend adapters / composition | `libs/backend/<ctx>/<adapters-in\|adapters-out\|composition>` | `<ctx>-<folder>`                                   | `scope:<ctx>,platform:server,layer:<adapter-in\|adapter-out\|composition>` |
| contracts                      | `libs/contracts/<ctx>`                                        | `<ctx>-contracts` / `@vfortin/<ctx>-contracts`     | `scope:<ctx>,platform:neutral,layer:contracts`                             |
| server platform                | `libs/backend/platform/<capability>`                          | `backend-<capability>`                             | `scope:platform,platform:server,layer:platform`                            |
| web platform                   | `libs/frontend/{http,ui,design-tokens}`                       | `web-http`, `ui`, `design-tokens`                  | `scope:platform,platform:web,layer:…`                                      |
| service                        | `apps/<ctx>-service`                                          | `<ctx>-service`                                    | `scope:app,platform:server,layer:app`                                      |

Contexts: `content`, `contact`, `identity`, `legal`. Never `shared`, `common` or `utils`. Check real names
with `npx nx show projects`.

## Frontend files

| Unit                                    | File                                                                                   | Class / symbol                                       | Selector                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| route page                              | `ui/pages/<name>-page/<name>-page.component.ts`                                        | `<Name>PageComponent`                                | `<prefix>-<name>-page`                                 |
| form                                    | `ui/forms/<name>-form/<name>-form.component.ts` + `models/<name>-form-values.model.ts` | `<Name>FormComponent`, emits `submitted`             | `<prefix>-<name>-form`                                 |
| dataview (list, cards)                  | `ui/dataviews/<name>-dataview/<name>-dataview.component.ts`                            | `<Name>DataviewComponent`                            | `<prefix>-<name>-dataview`                             |
| feature composition                     | `ui/components/<name>/<name>.component.ts`                                             | `<Name>Component`                                    | `<prefix>-<name>`                                      |
| feature type                            | `models/<concept>/<concept>.interface.ts` / `.type.ts`                                 | `PascalCase`, one declaration per file               | —                                                      |
| fixed values / option sets              | `constants/<name>.constants.ts`, `options/<name>.constants.ts`                         | `SCREAMING_CASE`                                     | —                                                      |
| pure function                           | `utils/<name>/<name>.utils.ts` + `testing/<name>.utils.spec.ts`                        | `camelCase` function                                 | —                                                      |
| home section                            | `ui/sections/<name>-section/<name>-section.component.ts`                               | `<Name>SectionComponent`                             | `<prefix>-<name>-section` (contact: `contact-section`) |
| presentational                          | `<name>/<name>.component.ts`                                                           | `<Name>Component`                                    | `<prefix>-<name>`                                      |
| directive                               | `directives/<name>/<name>.directive.ts`                                                | `<Name>Directive`                                    | `[<prefix>CamelCase]` (`uiBtn`, `uiReveal`)            |
| catalogue directive on a native element | `<entry>/<entry>.directive.ts`                                                         | `<Entry>Directive`                                   | `button[uiBtn]`, `div[uiCard]`                         |
| service                                 | `services/<concern>/<concern>.service.ts`                                              | `<Concern>Service` (`ContactApiService`)             | —                                                      |
| adapter                                 | `adapters/<concept>.adapter.ts`                                                        | `to<Model>` functions                                | —                                                      |
| store                                   | `state/<name>/<name>.store.ts` (admin slices stay with their owner)                    | `<Name>Store` + `<Name>StoreType`                    | —                                                      |
| call state                              | state field                                                                            | `<verb>CallState` (`sendCallState`, `loadCallState`) | —                                                      |
| route tree                              | `<ctx>.routes.ts`                                                                      | `<CTX>_ROUTES`                                       | —                                                      |
| guard / interceptor                     | `http/guards/<name>/<name>.guard.ts`, `http/interceptors/<name>/<name>.interceptor.ts` | `adminGuard`, `authInterceptor`                      | —                                                      |
| model                                   | `model/src/lib/<ctx>.model.ts`                                                         | `PascalCase` interfaces and literal unions           | —                                                      |
| spec                                    | `testing/<subject>.spec.ts`                                                            | `describe('<ExactSymbol>')`                          | —                                                      |

Selector prefixes come from each library's `eslint.config.mjs`: `content`, `contact`, `identity`,
`legal`, `ui`, `app`. The `Component` suffix is kept in this codebase.
Folders follow the dentalstock unit template (D37): each component keeps its template, optional
`components/<child>/`, `models/`, `constants/`, `options/`, `utils/<helper>/` and `testing/` together.
Services, stores, HTTP handlers and utilities have named unit folders; their role-suffixed source
filename matches the immediate folder. A primary catalogue component/directive can stay at its matching
entry root. Related model files can share a concept folder; constants and options stay flat inside their
owner. Route/bootstrap/composition files and public entry points remain owner entries. Feature source
keeps one declaration per file, no interface or constant beside a component class, and forms out of pages.

## Backend files

| Unit           | File                                                                                | Symbol                                                 |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| aggregate      | `domain/src/lib/<concept>/<concept>.ts`                                             | `PascalCase` class, `<Concept>Props`                   |
| domain error   | `domain/src/lib/errors/domain-error.ts`                                             | `DomainError`, `InvalidValueError`                     |
| use case       | `application/src/lib/use-cases/<verb-noun>/<verb-noun>.use-case.ts`                 | `<VerbNoun>` + `<VerbNoun>Command`                     |
| ports          | `application/src/lib/ports/<ctx>/<ctx>.ports.ts`                                    | capability names (`ContactMessageRepository`, `Clock`) |
| fakes          | `application/src/lib/testing/<ctx>.fakes.ts`                                        | `InMemory<Ctx>Store`                                   |
| controller     | `adapters-in/src/lib/http/controllers/<ctx>/<ctx>.controller.ts`                    | `<Ctx>Controller`                                      |
| problem mapper | `adapters-in/src/lib/http/mappers/<ctx>-problem/<ctx>-problem.mapper.ts`            | `<ctx>ProblemMapper`                                   |
| repository     | `adapters-out/src/lib/persistence/repositories/<ctx>/drizzle-<ctx>.repositories.ts` | `Drizzle<Concept>Repository`                           |
| schema         | `adapters-out/src/lib/persistence/schema/<ctx>.schema.ts`                           | `pgSchema('<ctx>')`                                    |
| module         | `composition/src/lib/<ctx>.module.ts`                                               | `<Ctx>Module`                                          |
| contract       | `contracts/<ctx>/src/lib/<concept>.contract.ts`                                     | `<Concept>Schema` + type                               |

## Messages, hooks, git

- i18n ids are dotted `@@area.key` (`@@contact.error.email`, `@@route.home`, `@@ui.dialog.close`);
  French source, English target.
- E2E hooks: role and accessible name first, then a section `id` (`#projects`, `#contact`).
- Error codes are dotted and stable (`identity.invalid-credentials`, `request.invalid`).
- Branches `<type>/<kebab>`; commits `type(scope): subject` (rule `git-and-commits.md`).
