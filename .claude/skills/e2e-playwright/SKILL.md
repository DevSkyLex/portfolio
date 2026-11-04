---
name: e2e-playwright
description: How the portfolio Playwright suites run — dedicated built-site preview, isolated authenticated Compose acceptance, browser projects, French and /en/ assertions, axe, TransferState startup probes, the Browser pane and durable evidence. Use before writing or running an e2e spec or browser verification.
---

# Playwright e2e

Codex counterpart: `.codex/references/e2e.md`; change one, change both. Rule: `e2e.md`.

## The suite

- Config `apps/web-e2e/playwright.config.mts` (`nxE2EPreset`, specs in `apps/web-e2e/src/`). Its
  `webServer` runs `node apps/web-e2e/support/preview/serve-site.mjs dist/apps/web-e2e-site/browser <port>`, which reproduces
  Nginx's prerendered paths, administration redirects/CSR and cache/indexing headers, real 404 and
  `/api/*` → 404 JSON (D25). The Nx target builds first. `E2E_PORT` defaults to 4200 and accepts integers
  1–65535; the command and both readiness/browser URLs use it consistently. Choose an available port,
  never stop or reuse an unknown user's server. `BASE_URL` disables preview startup for a deliberately
  selected existing endpoint.
- Projects: `chromium`, `firefox`, `webkit`, `Mobile Chrome`.

```bash
npx playwright install chromium firefox webkit   # once per machine
npx nx build web
npx nx e2e web-e2e                               # all projects
npx nx e2e web-e2e -- --project=chromium         # fastest
npx nx e2e web-e2e -- --project=chromium -g "legal pages"
```

CI runs the built-site suite on `main` and on affected pull requests (`.github/workflows/ci.yml`).

`npx nx run web-e2e:e2e-stack` builds/prunes/seeds real services in a fresh, randomly named Compose
project on localhost 18080/18025. It uses committed public examples rather than private local secret
files, creates an ephemeral administrator and passes generated credentials/TOTP only in memory.
Its lifecycle runner refuses existing resources and tears down only its own project/volumes.
The `@stack` UI journey exercises editor saves, visible revision conflicts/reload and publication,
contact submission/Mailpit, inbox read/archive and immediate sidebar counts, and logout failure/retry.
Trace recording is disabled for authentication bodies. See `apps/web-e2e/README.md`.

## Writing specs

Exemplar: `apps/web-e2e/src/public-site.spec.ts`.

- Locate by role and accessible name (`getByRole('heading', { level: 1 })`), then section ids
  (`#projects`, `#journey`, `#about`, `#contact`); never by class.
- French at `/`, English at `/en/` (check `html[lang]` and the title).
- Distinguish standalone public/client-validation checks from authenticated `@stack` acceptance; do
  not claim real API/cookie coverage from mocked or no-service tests.
- Keep `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])` with serious and critical violations failing.
- Hydration: wait for usable controls and retry an operation that can cross DOM replacement. Startup
  probes verify that public TransferState avoids a duplicate content fetch, admin needs no public
  snapshot and failed application scripts leave actual prerendered text readable (including opacity).
- Authenticated login/list/editor/inbox checks apply the same axe severity policy without exclusions.
- Do not add a browser skip to hide a product or harness defect. A platform exception needs a minimal
  reproduction and an explicit recorded rationale; there is no blanket Firefox exception.
- No committed `.only`, `page.pause()` or `waitForTimeout`; wait on observable state.

## Interactive browsers

- Browser pane with `.claude/launch.json`: `site` (built site on 4300, same script), `web` (dev server on
  4200, French only, proxy to the services), `content-service` (3101), `contact-service` (3102),
  `identity-service` (3103). Development services use PGlite (`npx nx run <service>:db-migrate` first;
  `npx nx run identity-service:generate-key` once). `preview_stop` when done.
- Playwright MCP (`.mcp.json`, server `playwright`) to work out locators; it knows nothing about
  `launch.json`: navigate to the port yourself.
- Light theme: set `data-theme="light"` on `<html>`; widths 1440 and 390.
- Durable captures and computed-value dumps go to a task scratch directory, never `test-results/`.
