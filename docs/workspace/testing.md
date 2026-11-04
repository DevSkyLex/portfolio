# Testing

Each test proves the boundary its layer owns. Tests that only call methods, ignore annotations
(`/* v8 ignore */`) and coverage exclusions added to reach a threshold are not accepted.

## Test types per layer

| Layer                  | Unit | Component (TestBed, jsdom) | Integration                                    | Contract                 | Architecture | E2E (Playwright)            |
| ---------------------- | ---- | -------------------------- | ---------------------------------------------- | ------------------------ | ------------ | --------------------------- |
| `domain`               | yes  | —                          | —                                              | —                        | yes          | —                           |
| `application`          | yes  | —                          | use cases with in-memory fakes of the ports    | —                        | yes          | —                           |
| `adapter-in`           | yes  | —                          | HTTP through the Nest module (supertest)       | request/response schemas | yes          | stack journeys              |
| `adapter-out`          | yes  | —                          | Drizzle on PGlite (`pglite:memory`), mail JSON | —                        | yes          | —                           |
| `composition`          | —    | —                          | module boots, wiring, guards                   | —                        | yes          | —                           |
| `contracts`            | yes  | —                          | —                                              | fixtures parse (`zod`)   | yes          | —                           |
| `platform` (server)    | yes  | —                          | filters, pipes, JWT verification               | —                        | yes          | —                           |
| `model`                | yes  | —                          | —                                              | —                        | yes          | —                           |
| `data-access`          | yes  | stores (SignalStore)       | HTTP (`provideHttpClientTesting`)              | snapshot fixture         | yes          | —                           |
| `ui`                   | yes  | inputs, outputs, ARIA      | —                                              | —                        | yes          | a11y (axe), reduced motion  |
| `feature`              | —    | pages, forms, guards       | with real data access and a test HTTP backend  | —                        | yes          | journeys                    |
| `shell` / web app      | —    | layout, routes             | —                                              | —                        | yes          | navigation, theme, language |
| `platform` (web, HTTP) | yes  | interceptors               | —                                              | —                        | yes          | —                           |

- **Architecture**: `tools/architecture` (see [boundaries](../architecture/boundaries.md)).
- **Accessibility**: Angular template lint (`flat/angular-template` accessibility preset, `no-positive-tabindex`, `no-any`), ARIA assertions in component tests, axe (`@axe-core/playwright`, WCAG 2 A/AA, no serious or critical violation) and keyboard journeys in e2e.
- **Visual regression**: not adopted. The scenes are WebGL/canvas and animated, and the mockups are still moving; screenshot baselines would only record noise. Revisit with `toHaveScreenshot` on static sections (with `reducedMotion: 'reduce'`) once the design is frozen.

## Conventions

- A spec lives in a `testing/` folder next to its subject: `lib/<area>/testing/<subject>.spec.ts`; doubles (`*.fakes.ts`, `*.fixture.ts`, `*.fixture.json`) in the same folder. The architecture test enforces it without a legacy exception list.
- Production code never imports from `testing/` (architecture test).
- `domain` and `application` specs run without NestJS, Drizzle or Zod (architecture test and `bannedExternalImports`).
- Tests are deterministic: time and identifiers through the `Clock` / `IdGenerator` ports, no network.
- E2E: `apps/web-e2e/src/<area>.spec.ts`, helpers in `apps/web-e2e/src/support/`. Locators by role and accessible name (`getByRole`, `getByLabel`), never by CSS class or Tailwind utility. No fixed wait (`waitForTimeout`): wait on a state (`aria-expanded`, URL, attribute) or retry an action with `expect(…).toPass()`.

## Coverage

Every source file under `src/` counts, tested or not (`coverage.include: ['src/**/*.ts']`; excluded: `testing/`, specs, `test-setup.ts`, and for the web app its two bootstrap files). Lines and branches are enforced; statements and functions are reported.

| Family                                                              | Lines | Branches | Where                                                       |
| ------------------------------------------------------------------- | ----- | -------- | ----------------------------------------------------------- |
| `domain`, `application`                                             | 95 %  | 95 %     | backend `vitest.config.mts` (statements and functions too)  |
| Other backend libraries, contracts, `content-service` config        | 90 %  | 90 %     | backend `vitest.config.mts` (statements and functions too)  |
| Frontend libraries (`model`, `data-access`, `ui`, `feature`, shell) | 90 %  | 80 %     | `libs/frontend/**/vite.config.mts`                          |
| `content-web-ui` scenes (`*-renderer.ts`, `*-scene.ts`)             | 60 %  | 50 %     | project floor; all other files of the project keep 90 / 80  |
| Web application (`apps/web`)                                        | 90 %  | 80 %     | `apps/web/project.json` (`test.options.coverageThresholds`) |

The scene renderers drive WebGL/canvas frames that jsdom cannot execute; their maths live in tested modules (`planet-math.utils.ts`, `scene-maths.utils.ts`) and the frames are covered by e2e. A new renderer follows the same split.

Backend snippet (same block as the frontend configs):

```ts
coverage: {
  reportsDirectory: '…',
  provider: 'v8' as const,
  include: ['src/**/*.ts'],
  exclude: ['src/**/testing/**', 'src/**/*.spec.ts'],
  reporter: ['text', 'html', 'lcov', 'json-summary'],
  thresholds: { lines: 95, branches: 90 }, // domain, application; 90 / 80 elsewhere
},
```

```bash
npx nx run-many -t test --coverage            # every project, fails below a threshold
npx nx run content-web-ui:test --coverage     # one project; report in coverage/libs/frontend/content/ui
node .github/scripts/coverage-summary.mjs       # Markdown table of the json-summary reports
```

## Commands

```bash
npx nx affected -t lint typecheck test build      # before pushing
npx nx run-many -t test typecheck lint -p architecture
npx nx run ui:typecheck-spec                     # semantic checking of specs and test fixtures
npx nx e2e web-e2e                                # builds web first (dependsOn), then four browsers
npx nx e2e web-e2e -- --project=chromium --grep "theme"
npx nx run web-e2e:e2e-stack                      # isolated real-service acceptance, Chromium
```

## E2E scope

`web-e2e` serves `dist/apps/web-e2e-site/browser` (`web:e2e-site`: the production build with the placeholder GA4 measurement id of `audience-measurement.e2e.ts`, D48) with `apps/web-e2e/support/preview/serve-site.mjs` (Nginx routing: prerendered pages, `/admin/*` → `index.csr.html`, administration locale redirects/cache/indexing headers, real 404, `/api/*` → 404). Its dedicated preview port is `E2E_PORT` (default 4200, validated integer 1–65535), shared by the server command, readiness and browser URLs. Choose an available port; never stop or reuse an unknown user's server. `BASE_URL` deliberately selects an existing endpoint and disables preview startup.

Without services, it covers home/project pages, English/legal pages, FR/EN 404s, contact client validation, unauthenticated admin/keyboard/axe, theme persistence/system, language switching, mobile menu/focus, skip link and reduced motion. Startup probes prove that public hydration consumes TransferState without a duplicate snapshot fetch, administration does not load public snapshots, and failed application scripts leave prerendered text readable, including descendant opacity.

### Semantic checking of project tests

Every project with a `tsconfig.spec.json` exposes `typecheck-spec`, which compiles that configuration,
including setup files, hosts and local fixtures. This covers backend libraries, shared contracts,
frontend libraries and applications. The existing `typecheck` target depends on this gate, so CI's
normal typecheck command covers production and test semantics. Projects without a separate spec
configuration retain their existing compiler coverage and do not add empty targets.

The architecture gate checks the exact spec compiler command and its dependency from normal
`typecheck`. Vitest execution alone is not treated as TypeScript assignability checking. Angular's test
plugin explicitly uses the spec tsconfig; backend spec configurations use ES modules to preserve
`import.meta` fixture and migration URLs while retaining the owning production project's strict flags.

### Multi-service e2e

`npx nx run web-e2e:e2e-stack` runs authenticated acceptance through
`apps/web-e2e/support/stack/run-stack-e2e.mjs`. It builds/prunes the service images and builds the website, then
combines `docker/compose.dev.yml` with `docker/compose.e2e.yml` under a randomly generated
`portfolio-e2e-<id>` project. The application is served on `http://localhost:18080` and Mailpit on
`http://localhost:18025`. These ports must be free. The existing `portfolio-dev` stack on 8080/8025 and
its volumes are not used by this workflow.

The overlay mounts only committed public development examples. It does not prepare or read local
service secrets. The runner creates fresh project-scoped database/key volumes, seeds content and
bootstraps an ephemeral, password-only account. Its random password is passed to the test process in
memory, not checked into files or printed to the command log; the journey enrolls the one-time code
through `/api/auth/totp/setup` and `/api/auth/totp/enable` and keeps the secret in memory too. The runner removes its
own project, volumes and three image tags after success or a handled failure; project-name validation
rejects shared or manually supplied project names. Jobs reuse the three service images, and inherited
Compose project/env-file/profile settings cannot redirect their ownership.

The `@stack` specs under `apps/web-e2e/src/stack/` exercise the password-only login, the TOTP enrollment
and removal routes, the credentials/TOTP UI, real refresh cookie,
project identity switching and draft navigation protection, real form saves, visible revision conflicts
and reload, UI validation/publication, public contact submission and Mailpit delivery, inbox read/archive
and immediate sidebar counts, and failed logout followed by successful retry. Authenticated login,
list/editor and inbox screens reject serious/critical axe WCAG A/AA violations without exclusions.
They run against real local services and Postgres; authentication traces are disabled. The ordinary
built-site suite remains responsible for public navigation, preferences, rendering and browser differences.

CI's `e2e-stack` job runs the same Nx target on a fresh runner; enabling a repository variable is not
required. Runner lifecycle unit tests prove disposable-project validation and cleanup on failure.
