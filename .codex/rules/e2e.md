# Browser tests

- `npx nx e2e web-e2e` depends on the built website and serves it through
  `apps/web-e2e/support/preview/serve-site.mjs` with Nginx route/header parity (D25).
- Use an available dedicated `E2E_PORT` (default 4200; valid range 1–65535) and `CI=true` to prevent
  reuse. Do not stop or reuse an unrelated server. `BASE_URL` explicitly selects an existing endpoint.
- Projects: chromium, firefox, webkit, Mobile Chrome. Standalone acceptance has no services;
  `npx nx run web-e2e:e2e-stack` owns a disposable Compose project for authenticated UI workflows.
  Preserve the developer stack. See `apps/web-e2e/README.md` for isolation and cleanup contracts.
- Locate by role, accessible name, `id` or `data-testid`; never by Tailwind or mockup classes.
- French at `/`, English at `/en/`; retain Axe WCAG 2 A/AA checks on public and authenticated screens.
- Startup probes check actual readable prerendered content, transferred public state and independent
  administration startup. A removed marker alone does not prove a visible fallback.
- No committed `.only`, `page.pause()` or fixed waits. Any browser exclusion needs a demonstrated gap
  and explicit reason; do not copy historical exclusions.
- Durable captures go to a scratch directory, not `test-results/`. Never retain authentication bodies
  or credentials in traces, screenshots or logs.

Details: [e2e](../references/e2e.md).
