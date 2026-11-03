# Angular architecture audit against Dentalstock

Audit date: 2026-11-02. This report compares the current portfolio working tree with the current
`G:/Projets/dentalstock/dentalstock-web` working tree. It is a review, not an implementation plan
already completed. Only this report was added; application source was not changed by this audit.

This is the historical baseline, including its original line references and validation results.
Subsequent corrections and their verification are recorded in the
[remediation report](angular-audit-remediation-2026-11-02.md). Read that report for the current state;
the findings below describe the working tree at the time of the audit.

## Verdict

The portfolio has a sound Nx dependency skeleton and uses the intended Angular primitives. Its
production components consistently use OnPush, its forms use Signal Forms, its stores generally have
deliberate lifetimes, and the public/server/admin entry points are separated in source. Replacing this
with Dentalstock's folder tree would not improve those properties.

The material gaps are in ownership and lifecycle contracts: the administration shell runs business
queries, editor identity is not synchronized after route reuse, dirty edits can be lost, authentication
retries do not fence the originating session, and public content is a startup dependency even for the
administration. Passing current tests does not prove these contracts: spec semantic checking and
authenticated browser acceptance are incomplete.

Dentalstock's normative architecture is the comparison baseline. Its own architecture document warns
about transitional implementation mismatches; an arbitrary existing file is not treated as precedent.
The portfolio's explicit decisions and the user's project-private alias convention remain valid.

## Scope and evidence

The review covered all 15 frontend Nx libraries, the web composition root, routes and rendering modes,
public and secondary entry points, stores, HTTP services/adapters/interceptors, four form workflows,
the catalogue control boundary, styling/i18n rules, frontend tests and CI. Five bounded read-only
reviews were consolidated with source inspection and parent-run checks.

An AST inventory found:

| Inventory                                                                                      |  Result |
| ---------------------------------------------------------------------------------------------- | ------: |
| TypeScript files under frontend/app/E2E source roots                                           |     606 |
| Production TypeScript files under frontend/app source roots, excluding testing and setup files |     471 |
| Production components / explicit OnPush components                                             | 86 / 86 |
| Production directives                                                                          |     185 |
| Production NgModules / legacy Input or Output decorators                                       |   0 / 0 |
| Frontend library spec files                                                                    |     115 |
| Web application spec files / E2E spec files                                                    |   2 / 4 |
| Frontend libraries with a test target                                                          |      14 |

`content-web-model` contains type/model declarations and has no test target. Its absence is not by
itself a defect. The UI catalogue was inspected at its architectural boundaries and representative
form/overlay controls; this report does not claim exhaustive browser acceptance of all 185 directives.
Backend business rules, deployment/security auditing and visual comparison with the mockup are outside
this Angular audit.

Primary references in the sibling repository:

- [Ownership and dependency direction](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md#2-core-ideas).
- [Published contracts and adapters](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md#5-published-contracts-and-adapters).
- [Forms](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md#104-uiforms) and [state](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md#1011-state).
- [Routing, SSR and hydration](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md#12-routing-ssr-and-hydration).
- [Public APIs](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md#13-imports-and-public-apis).
- [Tests and owner documentation](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md#14-testing-and-documentation-expectations).

## Comparison matrix

| Area                | Dentalstock principle                                                     | Portfolio assessment                                                                                             |
| ------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Ownership           | Features own business invariants; layouts compose owner-published ports   | Context libraries are appropriate; the admin shell bypasses owner contracts (F07)                                |
| Dependencies        | Public APIs, narrow consumers, enforced direction                         | Nx tags, public aliases and private aliases are strong; consumer contracts are undocumented (F12)                |
| UI package          | Domain-agnostic shared visual catalogue                                   | `ui` plus `design-tokens` is the appropriate monorepo equivalent                                                 |
| Pages and forms     | Pages orchestrate; forms render, validate and emit                        | The split exists, including the newer two-step login; editor validation and model ownership need work (F05, F13) |
| State               | Named call states, explicit scope and authority, replaceable reads        | Contact/inbox are well structured; editor route reads and auth retry authority have defects (F01, F03)           |
| HTTP                | Data-access services and adapters own transport                           | Services generally conform; admin model aliases preserve wire coupling (F13)                                     |
| Routing             | Owner routes and lazy pages; required identity resolved before activation | Top-level admin is lazy; inner admin pages are eager and project validity/reuse is incomplete (F01, F10, F11)    |
| SSR/hydration       | Explicit rendering/failure behavior and safe lifecycle                    | Static public rendering and CSR admin are justified; initialization couples them on failure (F06)                |
| i18n                | Explicit message IDs and translated public copy                           | French source plus English targets, and French-only admin, are documented product choices                        |
| Type safety         | Strict production and test compilation                                    | Production checks are strong; spec semantics are not part of the maintained gate (F08)                           |
| Tests               | Prove each owned boundary and real browser integration separately         | Coverage passes; authenticated stack acceptance is still planned (F09)                                           |
| Owner documentation | Short normative feature contracts, public entries and consumers           | Fourteen library READMEs are scaffolding (F12)                                                                   |

## Findings

P2 means an actionable correctness or validation issue to address in the next implementation cycle.
P3 means architectural debt, an enforcement gap, or a lower-impact lifecycle issue. Static findings
are identified as such; they are not presented as browser reproductions.

### F01 — P2: the editor retains the previous project when its route ID changes

Evidence: [editor input and lifecycle](../../libs/frontend/content/feature-admin/src/lib/ui/pages/admin-project-edit-page/admin-project-edit-page.component.ts:81),
`ngOnInit()` at line 188 and `loadOne(this.id())` at line 202;
[editor route](../../libs/frontend/content/feature-admin/src/lib/admin-content.routes.ts:15).

The page loads only in `ngOnInit()`. Navigation from project A to B through the command palette uses
the same route configuration, so Angular's default route reuse updates the bound input without
recreating the component. A's form can remain under B's URL. Saving uses the retained project object,
so the mismatch affects the operation's target as well as the display. `loadOne()` also lacks an
originating-read fence for a future reactive implementation.

Dentalstock assigns route synchronization to pages and replaceable reads to scoped/cancellable flows
([architecture, sections 2.5 and 10.11](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:119)).
[Angular's documented default reuse strategy](https://angular.dev/api/router/BaseRouteReuseStrategy)
confirms the reuse behavior. This is source/framework evidence, not a live editor reproduction.

Correction: react to the ID input, clear the old projection immediately, and cancel or discard obsolete
reads. Test A-to-B navigation while the same component is reused and while requests finish out of order.

### F02 — P2: navigation can discard an unsaved editor draft

Evidence: [dirty selector](../../libs/frontend/content/feature-admin/src/lib/ui/pages/admin-project-edit-page/admin-project-edit-page.component.ts:150),
[back link](../../libs/frontend/content/feature-admin/src/lib/ui/pages/admin-project-edit-page/admin-project-edit-page.component.html:5),
and [route without a deactivation contract](../../libs/frontend/content/feature-admin/src/lib/admin-content.routes.ts:15).
No `canDeactivate` or `beforeunload` protection was found under the frontend source tree.

The page knows that the form is dirty but navigation can destroy it without confirmation. Dentalstock
uses an [unsaved-change guard](G:/Projets/dentalstock/dentalstock-web/src/app/shared/unsaved-changes/unsaved-changes.guard.ts:9)
and documents dirty/pending behavior in the
[account contract](G:/Projets/dentalstock/dentalstock-web/src/app/features/account/FEATURE.md:131).

Correction: expose dirty/pending decisions from the page, bind a guard owned by the route and use the
existing accessible confirmation service. Cover sidebar, palette, back-link and browser-exit cases.
Static finding; no draft was created or discarded during this audit.

### F03 — P2: authentication retries do not check the originating session

Evidence: [auth interceptor](../../libs/frontend/identity/data-access/src/lib/http/interceptors/auth/auth.interceptor.ts:63),
especially refresh at line 74 and `session.clear()` at line 78;
[session generation](../../libs/frontend/identity/data-access/src/lib/state/session/session.store.ts:92).

The store ignores obsolete refresh results, but the interceptor can still act on their boolean result.
An old refresh can finish after a new login, return false and cause the interceptor to clear the new
session. A delayed 401 from an earlier session can also refresh and replay using the replacement
session. Root session scope is appropriate; it does not replace request-origin checks.

Dentalstock captures generation before a request and checks it before refresh and retry in its
[unauthorized interceptor](G:/Projets/dentalstock/dentalstock-web/src/app/features/auth/http/interceptors/unauthorized.interceptor.ts:40),
as required by its [concurrency contract](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:823).

Correction: expose a narrow session authority/generation contract, capture it per request and reject
stale side effects before refresh, clear and replay. Add an interceptor/store composition test. Static
finding; the race was not reproduced against real cookies in this audit.

### F04 — P2: failed logout is displayed as completed navigation

Evidence: [layout logout](../../libs/frontend/shell/src/lib/admin/layouts/admin-layout/admin-layout.component.ts:322)
swallows revocation failure and navigates to login;
[admin guard](../../libs/frontend/identity/feature/src/lib/http/guards/admin/admin.guard.ts:20) can refresh from the
remaining cookie on a later visit.

If the revocation request fails before the server processes it, the user sees the login page even
though the session family/cookie can remain usable. Clearing only in-memory state does not establish
server-side logout. Dentalstock's owner-published auth workflow and explicit failure/concurrency
contracts are the relevant comparison, not a requirement to copy its tenant model.

Correction: make revocation failure visible, retain a deliberate local signed-out policy and offer a
retry. Keep this behavior in the identity owner rather than duplicating it in the shell. Source-supported
scenario; no logout failure was induced against the user's account.

### F05 — P2: editor validation does not represent its API contract or server field errors

Evidence: [Signal Form schema](../../libs/frontend/content/feature-admin/src/lib/ui/forms/project-form/project-form.component.ts:165),
[request contract](../../libs/contracts/content/src/lib/admin-project.contract.ts:9), and
[page error rendering/form inputs](../../libs/frontend/content/feature-admin/src/lib/ui/pages/admin-project-edit-page/admin-project-edit-page.component.html:88).

The form validates required French text and paragraph alignment. The API additionally requires text
length at most 4,000, at most 30 paragraphs, HTTPS URLs, valid technology keys and at most 12
technologies. With native validation disabled, values such as `http://example.test` or oversized text
reach the API. Normalized field errors are available in the write error, but the page shows only the
global message and does not pass field errors to the form.

Dentalstock requires schema validation and server-to-field mapping in
[section 10.4](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:659) and its
[Signal Forms guide](G:/Projets/dentalstock/dentalstock-web/docs/guides/signal-forms.md:96).

Correction: publish browser-safe bounds/rules at the appropriate model/form surface, validate them and
map typed server errors to the nested field tree until the corresponding submitted value changes.
The existing contact form already demonstrates much of this behavior. Static finding.

### F06 — P2: a failed public snapshot prevents admin startup and defeats the public fallback

Evidence: [root providers](../../libs/frontend/shell/src/lib/provide-web-shell.ts:43),
[async snapshot initializer](../../libs/frontend/content/data-access/src/lib/providers/content-snapshot-loader/content-snapshot-loader.provider.ts:27),
and [progressive fallback](../../apps/web/public/theme.js:19).

Public content is loaded as a root application initializer on every route, including login. A second,
synchronous initializer sets `data-app` before that promise settles. If the snapshot chunk fails,
bootstrap rejects, but the four-second fallback sees `data-app` and leaves `data-js` in place.
Prerendered content that depends on removal of that marker can remain hidden, and CSR login does not
render at all. Angular's installed `ApplicationInitStatus` implementation confirms that initializers
are all called before their promises are awaited.

Dentalstock [section 12.6](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:1131) reserves global
initialization for application-wide requirements and excludes feature page loading.

Runtime confirmation used a separate headless Chromium against the local built site, without touching
user tabs or data. The baseline login heading rendered. Aborting the French snapshot chunk produced:

| Route          | Blocked requests | `data-js` after the fallback window | `data-app` |  Login heading |
| -------------- | ---------------: | ----------------------------------- | ---------- | -------------: |
| `/`            |                1 | present                             | present    | not applicable |
| `/admin/login` |                1 | present                             | present    |         absent |

Both cases logged a failed dynamic import. The probe waited for removal of `data-js` with a six-second
assertion timeout; removal never occurred. The browser was closed after the probe.

Correction: make the content dependency specific to public routes, and mark application usability
only after successful startup. Add rejected-loader tests for both public fallback and independent
administration startup.

### F07 — P2: the administration layout owns business queries and concrete session state

Evidence: [concrete project service](../../libs/frontend/shell/src/lib/admin/layouts/admin-layout/admin-layout.component.ts:167),
[message query](../../libs/frontend/shell/src/lib/admin/layouts/admin-layout/admin-layout.component.ts:244),
[palette loading](../../libs/frontend/shell/src/lib/admin/layouts/admin-layout/admin-layout.component.ts:281), and
[palette project model](../../libs/frontend/shell/src/lib/admin/layouts/admin-layout/components/command-palette/command-palette.component.ts:17).

The shell fetches projects and unread totals directly and owns their failure policy. It also injects
the concrete session store. An inbox read/archive does not invalidate the badge until navigation;
query failure becomes zero unread or an empty palette. These are business workflows rendered in a
layout, rather than shell composition through owner contracts.

Dentalstock explicitly prohibits layout injection of feature stores/services in
[section 4](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:197) and describes owner-bound ports
in section 5. Its [practice layout](G:/Projets/dentalstock/dentalstock-web/src/app/layouts/practice-layout/practice-layout.component.ts:57)
demonstrates composition through published slots/contracts.

Correction: publish narrow identity/logout, project navigation/search and unread-count contracts from
their owners, bind them through providers and let owner state/events invalidate the shell projection.
Represent unknown/failure separately from zero results. Add a layout dependency rule. This currently
passes Portfolio's layer table; it is an architectural policy gap, not a claimed existing lint failure.

### F08 — P2: semantic TypeScript checking of library specs is not a maintained gate

Evidence: the resolved Nx `content-web-feature-admin:typecheck` runs
`tsc -p .../tsconfig.lib.json --noEmit`; its [library tsconfig](../../libs/frontend/content/feature-admin/tsconfig.lib.json:12)
excludes specs. This production-only pattern applies across the frontend libraries. Angular libraries
use [Analog's default plugin configuration](../../libs/frontend/content/feature-admin/vite.config.mts:11),
and no Vitest `test.typecheck` option is enabled. The installed plugin defaults to syntactic-only
checking unless semantic checking is explicitly enabled.

Tests can therefore execute with mismatched fixture/host/helper types that the production typecheck
does not see. Type-aware ESLint rules do not replace TypeScript assignability checks. Dentalstock uses
the native Angular test builder with
[tsconfig.spec.json](G:/Projets/dentalstock/dentalstock-web/angular.json:213) and requires strict
compiler contracts in [section 14.5](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:1237).

Correction: add maintained Nx spec-typecheck targets or enable verified semantic checking for all test
files. Keep the production gate. A diagnostic compile of the current content-admin `tsconfig.spec.json`
passed during this audit: this is a missing maintained gate, not a claim that those current specs contain
type errors.

### F09 — P2: authenticated browser acceptance is unimplemented

Evidence: [unauthenticated admin E2E scope](../../apps/web-e2e/src/admin-access.spec.ts:4),
[planned stack journeys](../workspace/testing.md:85), and
[optional CI stack job](../../.github/workflows/ci.yml:125).

There are no `@stack` specs. The optional job attempts Docker startup without producing the required
pruned service bundles, built website, development configuration, seed or bootstrap account. A fresh
runner cannot turn this skeleton into a working acceptance gate merely by setting `E2E_STACK=enabled`.
Mocked component HTTP tests do not prove real cookies, TOTP, refresh/replay, publication conflicts or
inbox mutation integration.

Dentalstock [section 14.1](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:1187) separates owned
unit-boundary proofs from real browser/hydration qualification.

Correction: finish the explicit build/bootstrap/seed pipeline, then implement the documented login,
refresh, editor conflict/publication and inbox journeys. Keep test accounts/database data isolated.
This finding concerns the maintained acceptance system, not whether one manually created demo account
can log in.

### F10 — P2: unknown project slugs have inconsistent client and HTTP outcomes

Evidence: [unrestricted project route](../../libs/frontend/content/feature/src/lib/content.routes.ts:13),
[nullable project projection](../../libs/frontend/content/feature/src/lib/ui/pages/project-page/project-page.component.ts:93),
and [template without a missing-project branch](../../libs/frontend/content/feature/src/lib/ui/pages/project-page/project-page.component.html:1).

Router navigation to an unknown slug activates a detail page with no rendered body; title updates
occur only for a found project. A direct HTTP request instead receives the prerendered Nginx 404.
Dentalstock [section 12.2](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:1094) assigns data
required for route validity to pre-activation logic.

Correction: validate existence at the owner route or render an explicit not-found state with coherent
title and navigation. Test direct requests and Angular router transitions separately. Static finding;
no invalid navigation was performed in the user's browser.

### F11 — P3: administration is lazy only as a whole

Evidence: [admin route imports](../../libs/frontend/shell/src/lib/admin/admin.routes.ts:2) and
[static editor/list imports](../../libs/frontend/content/feature-admin/src/lib/admin-content.routes.ts:2).
Opening login reaches the layout, inbox and project-editor graph before authentication; there is no
page-level lazy boundary inside administration.

Dentalstock's [route ownership guidance](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:1028)
and actual [auth routes](G:/Projets/dentalstock/dentalstock-web/src/app/features/auth/auth.routes.ts:33)
use lazy owner entries and lazy pages.

Correction: keep the public-to-admin boundary, then lazy-load the identity owner route, protected
business subtrees, pages and layout. This is a module-graph/granularity observation, not a measured
bundle-size regression or a claim that admin code is in the public initial bundle.

### F12 — P3: ownership and approved consumers are not documented per frontend owner

Fourteen of the fifteen frontend library READMEs contain generated Nx scaffolding; the UI catalogue
README is the exception. Examples include [content data access](../../libs/frontend/content/data-access/README.md:3)
and [shell](../../libs/frontend/shell/README.md:3). They do not state responsibility, public entries,
consumers, provider scope and invariants. Alias checks validate names/targets, not owner-granted
consumer contracts.

Dentalstock [section 14.2](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:1203) requires these
contracts and an enforced public-entry consumer table.

Correction: use the existing Nx READMEs, or one authoritative context contract referenced by its
libraries, to document those decisions. Add a small structural gate for meaningful owner contracts.
The file need not literally be named `FEATURE.md`, and no generic `shared` project is required.

### F13 — P3: presentation models and forms remain coupled to data-access surfaces

Evidence: [AdminProject transport alias](../../libs/frontend/content/data-access/src/lib/admin/models/admin-project/admin-project.type.ts:12),
[AdminMessage transport alias](../../libs/frontend/contact/data-access/src/lib/models/admin-message/admin-message.type.ts:12),
[project form imports](../../libs/frontend/content/feature-admin/src/lib/ui/forms/project-form/project-form.component.ts:15),
and [contact form imports](../../libs/frontend/contact/feature/src/lib/ui/forms/contact-form/contact-form.component.ts:28).

The administration's display models are DTO aliases, and forms import pure form helpers/value types
from data access. This does not hide HTTP calls in controls, but it lets transport changes propagate
through presentation without an adapter boundary. Dentalstock has a stronger presentation dependency
rule and keeps transport models inside data access
([sections 4 and 10.6](G:/Projets/dentalstock/dentalstock-web/ARCHITECTURE.md:224)).

Correction: move browser-safe form/value rules to model/form-owned surfaces and adapt transport at the
page/data boundary when meanings differ. D5 justifies shared API contracts instead of an Orval client;
it does not require every view model to be a transport alias. Avoid mechanically duplicating identical
types with no independent UI meaning.

## Lower-priority follow-ups

| Item                     | Evidence and impact                                                                                                                                                                                                        | Direction                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login call state         | [LoginPageComponent](../../libs/frontend/identity/feature/src/lib/ui/pages/login-page/login-page.component.ts:131) maintains an ad-hoc pending boolean across credential and OTP flows                                     | Keep root session authority; use route-scoped named flow call states where that simplifies failure/concurrency contracts. Dentalstock section 10.11                                                                    |
| Credentials email rule   | [credentials form](../../libs/frontend/identity/feature/src/lib/ui/forms/credentials-form/credentials-form.component.ts:160) requires a nonempty email but does not validate email syntax, with native validation disabled | Add the Signal Forms email rule and a field message; compare Dentalstock's [auth form](G:/Projets/dentalstock/dentalstock-web/src/app/features/auth/ui/forms/auth-form/auth-form.component.ts:808)                     |
| Test-server route parity | [serve-site.mjs](../../apps/web-e2e/support/preview/serve-site.mjs:77) does not reproduce the Nginx `/en/admin*` redirect or admin no-store/noindex headers                                                                | Add parity cases or explicitly narrow the simulator claim; compare [site.conf](../../docker/nginx/snippets/site.conf:84) and Dentalstock's SSR/hydration qualification                                                 |
| Theme lifecycle          | [ThemeService](../../libs/frontend/shell/src/lib/theme/theme.service.ts:104) registers an anonymous media listener without disposal                                                                                        | Retain a handler and remove it with `DestroyRef`, as in Dentalstock's [ThemeService](G:/Projets/dentalstock/dentalstock-web/src/app/core/theme/services/theme/theme.service.ts:129); low ordinary root-lifetime impact |
| Typing enforcement depth | Portfolio strict compiler settings are strong, but it lacks several Dentalstock explicit-boundary/return and type-aware `no-unsafe-*` rules plus selected extended template diagnostics                                    | Consider equivalent ESLint/Angular diagnostics deliberately; missing rules are not proof of a current production type error                                                                                            |

Catalogue module-global ID counters remain a multi-render SSR-readiness question, not a demonstrated
live hydration failure. The public footer's injector-scoped ID service and explicit contact trigger ID
are positive mitigations. A real repeated-render/hydration test is needed before declaring those
controls universally SSR-safe.

## What should remain different from Dentalstock

- Nx context/layer libraries are valid owner boundaries; do not copy `core`, `shared` and `layouts`
  folders literally or create empty/catch-all projects.
- `@internal/<project>/*` aliases are confined to the owner; `@vfortin/*` is the public cross-project
  surface. The snapshot alias is a deliberate web-only exception. The user's alias decision is retained.
- Shared Zod contracts and direct HttpClient services are justified by the single repository (D5).
  Contract schemas still belong at the data boundary, not in visual controls.
- Public static rendering from a build snapshot and CSR administration are appropriate product choices
  (D7/D18). Dentalstock's live authenticated SaaS and SSR auth/onboarding policy solve different needs.
- Incremental contact hydration and lazy canvas renderers are explicit portfolio choices; cleanup and
  static renderer fallbacks are already present.
- French public source, English targets and French-only admin are documented localization choices.
- Simple page-scoped collections do not automatically need entity stores. Imperative one-shot commands
  do not automatically need an `rxMethod` migration; replaceable reads still need cancellation/fencing.
- ESLint/Prettier and Analog/Vitest can remain; their gates must provide the same promised guarantees.

## Validation performed in this audit

| Check                                                                                                                                                                                                           | Result and scope                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npx nx show projects -p 'libs/frontend/**' --json`                                                                                                                                                             | 15 frontend libraries                                                                                         |
| Resolved `nx show project content-web-feature-admin --json`                                                                                                                                                     | Confirmed actual inferred test target and production-only typecheck                                           |
| `npx nx run architecture:test`                                                                                                                                                                                  | Passed, uncached                                                                                              |
| `npx nx run-many -t lint typecheck -p 'libs/frontend/**' web --parallel=2`                                                                                                                                      | 32 tasks passed; 12 cached                                                                                    |
| `npx nx run-many -t test -p 'libs/frontend/**' --coverage --parallel=2`                                                                                                                                         | All 14 available test targets passed, uncached; model-only library has no test target                         |
| `npx nx build web`                                                                                                                                                                                              | Passed, uncached                                                                                              |
| `npx nx exec --projects=content-web-feature-admin --excludeTaskDependencies -- node <workspace>/node_modules/typescript/bin/tsc -p <workspace>/libs/frontend/content/feature-admin/tsconfig.spec.json --noEmit` | Diagnostic spec compilation passed; this does not add a maintained CI target                                  |
| Isolated Chromium startup fault injection                                                                                                                                                                       | Baseline login renders; blocked public snapshot prevents both admin startup and fallback marker removal (F06) |
| `npx nx affected -t lint typecheck test build`                                                                                                                                                                  | Could not select affected projects because local `main` is absent; explicit frontend checks above were used   |

An initial diagnostic `nx exec` invocation using nested `npx` failed to locate npm from a dependency
directory on this Windows host. The absolute-compiler invocation above avoided that runner issue and
completed the intended spec check. No compiler error was inferred from the runner failure.

No current full E2E suite, authenticated browser mutation, real cookie-race reproduction, bundle-size
measurement or visual qualification was performed. Earlier chat results are not counted as fresh
evidence in this report. No secret files were read, no data was changed and no user tab was controlled.
The pre-existing local stack was left running.

## Suggested implementation order

1. Correct editor route synchronization and dirty/pending navigation protection (F01–F02).
2. Fence authentication request side effects and expose failed logout clearly (F03–F04).
3. Isolate public startup dependencies and verify the rejected-loader fallback (F06).
4. Complete editor validation and field-error propagation (F05).
5. Add maintained spec typechecking and real authenticated stack journeys (F08–F09).
6. Move shell business orchestration behind owner contracts, then add owner/consumer documentation and
   enforcement (F07, F12–F13).
7. Finish missing-project routing, inner admin lazy loading and the lower-priority lifecycle/test
   parity work (F10–F11).

These actions target concrete invariants and acceptance tests. Moving files or adding extra barrels
alone would not address the findings.
