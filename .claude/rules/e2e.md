---
paths:
  - 'apps/web-e2e/**'
---

# Browser tests

- `apps/web-e2e/playwright.config.mts` serves the **built** site (`dist/apps/web-e2e-site/browser`, the
  production build with a placeholder GA4 id, `web:e2e-site`, D48) with
  `apps/web-e2e/support/preview/serve-site.mjs`, like Nginx (D25). `npx nx e2e web-e2e` builds first. The dedicated
  server defaults to 4200; `E2E_PORT` accepts integers 1–65535 and configures its command, readiness
  URL and browser URL together. Choose an available port; never stop or reuse an unknown user's server.
- Projects: chromium, firefox, webkit, Mobile Chrome. The standalone suite has no API services: it
  checks public flows and unauthenticated administration, including TransferState startup isolation
  and readable prerendered fallback when the application bundle fails.
- `npx nx run web-e2e:e2e-stack` owns an isolated Compose project on 18080/18025, with seeded real
  services, UI saves/conflicts/publication, contact delivery, inbox transitions and logout/retry. It
  never uses the developer's stack or volumes. See `apps/web-e2e/README.md` for the lifecycle contract.
- Locate by role, accessible name, `id` or `data-testid`; never by Tailwind or mockup classes.
- French at `/`, English at `/en/`; axe (`wcag2a`, `wcag2aa`) rejects serious/critical findings on public
  pages and authenticated login/list/editor/inbox screens, without excluding failing controls.
- No committed `.only`, `page.pause()` or fixed waits. Do not add a browser skip to mask a product or
  harness defect; document and reproduce a genuine platform limitation before proposing an exception.
- Durable captures go to a scratch directory, not `test-results/`.

Details: the `e2e-playwright` skill.
