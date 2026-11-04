# Playwright e2e

The browser skill in the other client follows the same acceptance contracts.
Rule: [e2e](../rules/e2e.md). The authoritative runner contract is
[apps/web-e2e/README.md](../../apps/web-e2e/README.md).

## The suites

- `apps/web-e2e/playwright.config.mts` uses `nxE2EPreset`, with specs in `apps/web-e2e/src/`.
  Standalone acceptance serves `dist/apps/web-e2e-site/browser` (`web:e2e-site`, the production build with a placeholder GA4 id, D48) through `apps/web-e2e/support/preview/serve-site.mjs`.
  D25 covers static routing, localized 404 responses, admin redirects and cache/robots headers;
  it does not claim TLS, proxy, compression or rate-limit parity.
- `npx nx e2e web-e2e` builds web through its task dependency. Its projects are `chromium`, `firefox`,
  `webkit` and `Mobile Chrome`. No service runs in this suite: administration stays on login and
  contact validation is client-side.
- Set `E2E_PORT` to an available dedicated port (default 4200; integer 1–65535) and `CI=true` to
  reject server reuse. Never stop an unrelated developer server. `BASE_URL` explicitly selects an
  existing endpoint and disables the local preview server.
- `npx nx run web-e2e:e2e-stack` builds and runs a disposable Compose project, seeds content and
  creates an ephemeral administrator. It exercises credential/TOTP login, refresh, editor navigation,
  dirty drafts, UI saves/conflicts/publication, public contact delivery, inbox transitions and logout
  failure/retry. Its `finally` cleanup removes only its own containers and volumes. Do not use or
  reset the developer account, stack, data or service secrets.

```bash
npx playwright install chromium firefox webkit
npx nx e2e web-e2e
npx nx e2e web-e2e -- --project=chromium
npx nx run web-e2e:e2e-stack
```

CI runs both built-site and isolated-stack acceptance with the same Nx targets.

## Writing specs

- Locate by role and accessible name, then section ids (`#projects`, `#journey`, `#about`, `#contact`);
  never by class. Check French at `/`, English at `/en/`, document language and titles.
- Keep Axe WCAG 2 A/AA checks, failing serious/critical violations without excluding real controls.
- Interact with the contact section after it is visible and hydrated. Public startup probes block the
  snapshot chunk and verify transferred state avoids its browser request; blocking the main bundle
  must leave actual descendant text readable after the progressive fallback window.
- No `.only`, `page.pause()` or fixed waits. Wait on observable state and request responses. A browser
  exclusion needs a demonstrated gap and reason; historical exclusions are not current evidence.
- Stack tests disable trace recording to avoid storing authentication bodies. Do not persist
  credentials in screenshots, logs or test artifacts.

## Interactive browsers

Start local preview servers hidden, retain their process ids and stop only what the task started.
The built-site preview can use a dedicated free port, for example
`node apps/web-e2e/support/preview/serve-site.mjs dist/apps/web/browser 4300`. The development web server defaults to
4200 (French only), with APIs on 3101, 3102 and 3103; these are independent of disposable acceptance.

The optional `playwright` MCP server of `config.toml`, when connected, helps investigate locators.
Use light/dark themes and widths 1440 and 390 for relevant presentation checks. Durable captures and
computed-value dumps go to a task scratch directory, never `test-results/`.
