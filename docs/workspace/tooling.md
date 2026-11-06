# Workspace tooling

## Nx

- **Named inputs**: `production` excludes specs, `testing/` folders, test configs (`vite.config.*`, `vitest.config.*`, `tsconfig.spec.json`, `test-setup.ts`), ESLint configs and Markdown, so a test-only change does not invalidate builds. `sharedGlobals`: `tsconfig.base.json`, the lockfile, the Node version.
- **`web:build`** builds code for the request-time SSR runtime. Public content is fetched at render time and does not require a rebuild.
- **Target defaults**: `build`, `lint`, `test`, `typecheck` are cached; type-aware lint reads dependencies, hence `^production` in its inputs. `serve`, `serve-ssr`, `e2e`, `db-migrate`, `db-seed`, `generate-key` are never cached (side effects or external state).
- **Plugins**: `@nx/vitest` infers `test` (`vitest run`, coverage directory as output), `@nx/eslint` infers `lint`, `@nx/playwright` infers `e2e`, `@nx/webpack` the services' `build`/`serve`. No test atomization (`ciTargetName`): without distributed execution it only multiplies targets.
- **Pipeline**: `build` depends on `^build`; `web-e2e:e2e` depends on `web:build`.
- **Affected**: `defaultBase: main`; CI uses `nrwl/nx-set-shas` (last successful run on `main`, or the pull request base).
- **Release**: none. The packages are private and nothing is published; the site and the services are released by the workflows below.

## CI (`.github/workflows`)

| Workflow     | Trigger                      | Jobs                                                                                                                                                                                                    |
| ------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`     | pull request, push on `main` | `quality` (format check, architecture, affected lint/typecheck/build), `tests` (coverage, summary, report artefact), `e2e` (built site, four browsers; affected on pull requests), `e2e-stack` (opt-in) |
| `deploy.yml` | CI success on `main`, manual | API and SSR images deployed only if the commit is still the head of `main`; manual run takes an explicit `ref` (rollback)                                                                               |

## Lint

Root `eslint.config.mjs` (every project config spreads it):

- `@nx/enforce-module-boundaries` with the tag constraints of [boundaries](../architecture/boundaries.md)
  and project-cycle detection. `import-x/no-duplicates` uses the plugin's native resolver configured
  with TypeScript extensions and `tsconfig.base.json`. File-cycle checking stays in the architecture
  gate because the installed import-x version treats erased type re-exports as runtime edges.
- TypeScript (dentalstock-web reference): `no-explicit-any`, `no-non-null-assertion`, `ban-ts-comment` (`@ts-expect-error` with a description only); type-aware: `no-floating-promises`, `no-misused-promises`, `await-thenable`, `only-throw-error`, `switch-exhaustiveness-check`.
- Explicit types apply to authored application, library and test TypeScript: class members, named
  function parameters, function return contracts and named variables. Variables use an annotation,
  a checked `satisfies` shape or a literal `as const`; an assertion to an arbitrary type does not replace
  a declaration contract. Angular dependency injection requires `inject<T>()`, including aliases.
  The local rules in `tools/eslint/explicit-types.mjs` avoid the deprecated blanket `typedef` rule.
  Contextual callbacks, destructured values and `for…of` bindings keep the type of their typed API or
  iterable. NgRx store, Drizzle table/relation, Zod schema and CVA variant factories retain their exact
  generated output types instead of widening them to general framework interfaces. Their state,
  inputs, consuming boundaries and methods remain explicitly typed. No `any` or assertion is added to
  conceal an incompatible result. Rule fixtures run with `architecture:test-tooling`, and rule sources
  are part of the Nx lint and architecture cache inputs. Test-only rule changes invalidate their test
  target rather than every project lint. Member and parameter checks use ESLint's native
  `no-restricted-syntax`; binding lookup uses typescript-eslint's `ASTUtils.findVariable`.
- Angular: `prefer-on-push-component-change-detection`, `prefer-signals`, `prefer-output-readonly`, `no-async-lifecycle-method` (they only match Angular decorators and hooks, so they are inert on NestJS code); templates: the accessibility preset of `flat/angular-template` plus `no-positive-tabindex` and `no-any`.
- `no-console` except `warn`/`error`; allowed in the services' `cli.ts` and workspace scripts.

Frontend production additionally enforces explicit member accessibility, consistent type imports and
type-aware unsafe-value checks. The root configuration defines the exact scopes; do not maintain
unmeasured violation counts in documentation.

## Script ownership

`tools/` contains recurring workspace-wide checks only; see its [inventory](../../tools/README.md).
The owning Nx projects run their own helpers:

| Owner            | Command                                                  | Purpose                                                          |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `web-e2e`        | `npx nx run web-e2e:test-tooling`                        | Verify preview routing and disposable Compose lifecycle          |
| CI               | `node .github/scripts/coverage-summary.mjs`              | Present native coverage summaries in GitHub Actions              |
| Claude and Codex | `node .agents/scripts/comment-diff.mjs <before> <after>` | Check syntax and protected directives during comment maintenance |

E2E helpers are inside the E2E project, so Nx affected selection sees their changes. Both browser
targets depend on their tooling tests. CI quality also runs the owner tooling tests independently
of a live API or Docker stack. Runtime sitemap and robots behavior is tested at the SSR boundary.

## Format

Prettier (`.prettierrc`: single quotes, 100 columns, `prettier-plugin-tailwindcss` sorting classes against `apps/web/src/styles.css`). `npx nx format:check` in CI; locally `npx nx format:write --files <files>`. `.gitattributes` forces LF so Windows checkouts match Prettier.

## Generated and local files

Ignored (`.gitignore`, `.prettierignore`): `dist`, `tmp`, `out-tsc`, `coverage`, `test-output`, `test-results`, `playwright-report`, `blob-report`, `.nx`, `.angular`, `.vitest`, `.data` (PGlite databases, development keys and admin credentials), `apps/*/.env` (only `.env.example` is versioned), `docker/dev/secrets/` (`docker/.gitignore`), `ansible/.collections` and `ansible/.vault-pass` (`ansible/.gitignore`). Scratch scripts, logs and screenshots never live in the repository.
