# Frontend specs

Claude Code keeps an equivalent skill; change one, change both. Rule: [testing](../rules/testing.md).

## Commands

```bash
npx nx test content-web-ui                    # one project, once (no watch outside a TTY)
npx nx test content-web-ui -- planet-math     # Vitest file filter
npx nx affected -t test                       # what the change touches
npx nx test web                               # the app (@angular/build:unit-test)
```

A filter that matches nothing runs 0 files and still succeeds: read the executed count. Never run bare
`npx vitest` from the root: each project has its own `vite.config.mts` / `vitest.config.mts`.

## Setup

Angular libraries run Vitest through `@analogjs/vitest-angular`; each `src/test-setup.ts` imports
`@angular/localize/init` and calls `setupTestBed({ zoneless: true })`
(`libs/frontend/content/feature/src/test-setup.ts`). `$localize` therefore returns the French source text
in specs.

## Boundaries

| Unit                     | Assert                                                                      | Harness                                                                      |
| ------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| store                    | call-state transitions, returned field errors, conflict flags               | service mocked with `of()` / `throwError()`                                  |
| service                  | URL, method, body, mapping of the response                                  | `provideHttpClient()`, `provideHttpClientTesting()`, `HttpTestingController` |
| adapter, pure helper     | output for normal, empty and edge inputs                                    | plain import, no `TestBed`                                                   |
| presentational component | rendering from `input()` (`fixture.componentRef.setInput`), emitted outputs | `TestBed.createComponent`, `provideRouter([])` when it has links             |
| page / section           | orchestration of the store and children                                     | store provided with a mock                                                   |
| guard / interceptor      | allow or redirect `UrlTree`, header added only where expected               | `TestBed.runInInjectionContext`                                              |
| directive                | host behaviour                                                              | a host component                                                             |
| canvas maths             | pure geometry (`planet-math`, `scene-maths`)                                | plain import                                                                 |

Exemplars: `libs/frontend/content/ui/src/lib/testing/content-ui.spec.ts`,
`libs/frontend/contact/data-access/src/lib/testing/contact-data-access.spec.ts`,
`libs/frontend/identity/data-access/src/lib/testing/identity-data-access.spec.ts`,
`libs/frontend/content/ui/src/lib/planet/utils/planet-math/testing/planet-math.utils.spec.ts`.

## Rules

- Specs in `testing/` beside the subject; `describe('<ExactSymbol>')`.
- Browser APIs missing from jsdom (canvas, `IntersectionObserver`, `matchMedia`) are stubbed in the spec,
  never by changing production code.
- Assert French copy; exact `UrlTree`, status or payload where it is the contract; no `.only`; no `any`.
- Never change production code to make a spec pass; report an untestable boundary.
