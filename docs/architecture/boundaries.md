# Boundaries and tags

The `@nx/enforce-module-boundaries` rule is configured in `eslint.config.mjs`. Nx requires every constraint that matches a project to pass; within a constraint, the target tags are an OR.

## Tags

| Dimension  | Values                                                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope`    | `content`, `contact`, `identity`, `legal`, `platform` (technical capabilities), `app` (applications and shell)                                                                                                       |
| `platform` | `web`, `server`, `neutral`                                                                                                                                                                                           |
| `layer`    | backend: `domain`, `application`, `adapter-in`, `adapter-out`, `composition`, `contracts`; frontend: `model`, `data-access`, `ui`, `feature`, `shell`; cross-cutting: `platform`, `app`; workspace: `e2e`, `tooling` |

## What each layer may read

| Layer               | Allowed dependencies                                             | Banned packages                                                                                        |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `domain`            | `domain`                                                         | NestJS, Angular, NgRx, Drizzle, PGlite, `pg`, Express, jose, nodemailer, rxjs, `reflect-metadata`, Zod |
| `application`       | `domain`, `application`                                          | same as `domain`                                                                                       |
| `adapter-in`        | `application`, `domain`, `contracts`, `platform`                 |                                                                                                        |
| `adapter-out`       | `application`, `domain`, `platform`                              |                                                                                                        |
| `composition`       | `application`, `domain`, `adapter-in`, `adapter-out`, `platform` |                                                                                                        |
| `contracts`         | `contracts`                                                      | frameworks and I/O (Zod allowed)                                                                       |
| `platform` (server) | `platform`, `contracts`                                          |                                                                                                        |
| `platform` (web)    | `platform`                                                       |                                                                                                        |
| `model`             | `model`                                                          | frameworks and I/O, Zod                                                                                |
| `data-access`       | `model`, `contracts`, `platform`                                 |                                                                                                        |
| `ui`                | `ui`, `model`; the generic UI reads no business model            | `@angular/common/http`, NgRx, Zod                                                                      |
| `feature`           | `feature`, `data-access`, `ui`, `model`                          | Zod                                                                                                    |
| `shell`             | `feature`, `data-access`, `ui`, `platform`                       | Zod                                                                                                    |
| web app             | `shell`, `platform`                                              | Zod                                                                                                    |
| server app          | `composition`, `platform`                                        |                                                                                                        |
| `e2e`, `tooling`    | nothing: they test built artefacts and the workspace itself      |                                                                                                        |

A context reads nothing from another context except its `contracts`. The frontend never reaches `domain`, `application` or the adapters: no web layer allows them. On the web side only `data-access` reads contracts and Zod, so the browser bundle stays free of Zod (D10).

Secondary entry points are the only public deep imports, each justified by a decision: `@vfortin/web-shell/server` and `@vfortin/content-web-data-access/server` (D10); `@vfortin/identity-web-data-access/http`, `@vfortin/contact-web-data-access/links` and `@vfortin/content-web-data-access/admin` (D18); `@vfortin/identity-web-data-access/session`, `@vfortin/content-web-data-access/navigation` and `@vfortin/contact-web-data-access/summary` (D38). A new one is added to `SECONDARY_ENTRY_POINTS` in `tools/architecture/src/support/rules.ts` with its reason.

Inside a project, source imports use `@internal/<project-name>/*`, mapped to that project's `src/*` (D34). The web application also uses `@internal/web-snapshot/*` for its generated content snapshots outside `src`. These aliases are private to their owning project: they are not entry points and cannot be imported by another project. Public `@vfortin/*` aliases remain the only way to cross library boundaries. A project does not import its own public barrel.

## Frontend owner contracts

Each frontend library README declares `Purpose`, `Public entry points`, `Provider scope`, `Invariants`
and `Validation`. Its exact public-entry table is normative:

```md
| Entry point                                   | Consumers   |
| --------------------------------------------- | ----------- |
| `@vfortin/content-web-data-access/navigation` | `web-shell` |
```

The target owner grants access to exact module names and Nx consumer names. Fenced examples, prose,
unrelated tables and a consumer's own README grant nothing. `None` declares an entry with no approved
external TypeScript consumer; wildcards and self-consumers are rejected. Every configured frontend
root or secondary entry must have a row, and both type-only and runtime cross-project imports must
name an owner-approved entry. Layer/tag rules still apply after a grant.

The administration layout and command palette compose identity session, project navigation and inbox
summary ports. They import only the three D38 data-access secondaries; concrete APIs, stores and DTOs
remain behind owner providers. Inbox mutations invalidate the owner's summary immediately, and errors
remain explicit rather than turning into zero counts or empty search results.

The content data-access root, contact links and identity HTTP entries have source-level eager
reachability checks: they may not statically reach Zod, NgRx, Angular SSR or their separated admin/state
files. The check follows re-exports, public/private aliases and relative references; erased types and
dynamic imports are distinct. It does not model Angular's template-level deferred import rewriting or
replace bundle-size/browser acceptance checks.

## Source unit folders

Production components and executable units live in a folder named after the unit: for example,
`ui/sections/hero-section/hero-section.component.ts`,
`state/session/session.store.ts` and
`http/controllers/admin-content/admin-content.controller.ts`. The architecture gate checks the
immediate folder of role-suffixed component, directive, service, store, guard, interceptor, pipe,
provider, resolver, controller, presenter, mapper, job, use-case and utility files in application and
library source roots. A primary catalogue component or directive can stay at its matching entry root.

Each UI unit keeps its template and optional private child components, models, constants, options,
utilities and tests together. Child components have their own `components/<child>/` folder; utilities
have `utils/<helper>/` and unit tests live in the unit's `testing/` folder. Related model declarations
can share a `models/<concept>/` group. Constants and options remain flat inside their owner rather than
receiving one folder per file.

Owner route trees, bootstrap/composition files and `src/index.ts` or declared secondary entry points
remain intentional owner entries. Test hosts and fixtures are not production-unit placement targets.
This extends the Dentalstock folder convention within the existing Nx projects; it does not create
another project, public entry point or dependency permission.

## What Nx does not cover

`npx nx run architecture:test` (`tools/architecture`) proves the rules three ways:

- `boundaries.spec.ts` lints deliberately forbidden imports as if they were written in a given project and checks that each one fails, with allowed imports as controls;
- `rules.spec.ts` runs each structural rule on an in-memory fixture that must fail, and on one that must pass;
- `workspace.spec.ts` runs the structural rules on the real workspace.

Structural rules (`tools/architecture/src/support/rules.ts`):

| Rule                       | Checks                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| one tag per dimension      | exactly one `scope:*`, `platform:*`, `layer:*` per project, from the tables above, and no other tag                                        |
| tags match the folder      | `libs/<side>/<context>/<layer>` and `libs/contracts/<context>` carry the matching tags                                                     |
| no catch-all project       | no project named or placed under `shared`, `common`, `util(s)`, `helper(s)`, `misc`                                                        |
| library entry point        | every library has `src/index.ts` behind `@vfortin/<name>`; secondary entry points are declared                                             |
| no deep import             | `@vfortin/*` only through a declared entry point; private aliases only within their owning project; no relative import leaving its project |
| no test code in production | production files import nothing from `testing/` or a spec                                                                                  |
| specs in `testing/`        | see [testing](../workspace/testing.md)                                                                                                     |
| named unit folders         | production role-suffixed units use matching folders; catalogue entry roots, grouped models and flat constants/options remain valid         |
| no file cycle              | no runtime cycle between source files (type-only imports and re-exports are erased and ignored)                                            |
| owner contracts            | required frontend README contracts; exact public-entry grants owned by the target library; only approved Nx consumers                      |
| layout ports               | production admin shell components use owner session/navigation/summary ports, never concrete APIs, stores or DTOs                          |
| light entry reachability   | selected light APIs do not statically reach server validation, NgRx or separated admin/state implementations                               |
| spec semantic checking     | every project with a spec config has a spec compiler target required by its normal typecheck                                               |

The actual Nx ESLint rule owns layer restrictions and project cycles. Its rejected-import fixtures
include backend specs and web boundaries; the architecture suite does not implement those constraints
a second time. The file-cycle gate remains specific because the installed import-x cycle rule treats
erased type re-exports as runtime dependencies.

The architecture target also depends on `test-tooling`, which verifies the local explicit-type ESLint
policy. Browser preview and disposable-stack lifecycle tests belong to `web-e2e:test-tooling`; snapshot
collection tests belong to `web:test-snapshot`. CI runs these owner targets separately.

## Backend file names

| Layer          | Files                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`       | `<concept>/<concept>.ts` (entity or value object), `values/<value>/<value>.ts`, `errors/domain-error.ts`                                                                                |
| `application`  | `use-cases/<verb-noun>/<verb-noun>.use-case.ts` (one use case per file), shared steps in `use-cases/<step>/<step>.ts`, `ports/<ctx>/<ctx>.ports.ts`, `errors/application-error.ts`      |
| `adapters-in`  | `http/controllers/<name>/<name>.controller.ts`, `http/presenters/<name>/<name>.presenter.ts`, `http/mappers/<ctx>-problem/<ctx>-problem.mapper.ts`, `jobs/<name>/<name>.jobs.ts`        |
| `adapters-out` | `persistence/schema/<ctx>.schema.ts`, `persistence/repositories/<subject>/drizzle-<subject>.repositories.ts` (with the unit of work), named concern folders beneath other adapter areas |
| `composition`  | `<ctx>.module.ts`, `tasks/<name>/<name>.tasks.ts` (operations commands)                                                                                                                 |

Specs sit in a `testing/` folder beside their subject; in-memory fakes of the ports live in `application/src/lib/testing/<ctx>.fakes.ts`. Coverage thresholds are set in each backend `vitest.config.mts`: 95 % for `domain` and `application`, 90 % elsewhere (`testing/` and `index.ts` excluded).
