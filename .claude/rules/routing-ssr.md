---
paths:
  - 'libs/frontend/**/*.routes.ts'
  - 'libs/frontend/**/*.routes.server.ts'
  - 'libs/frontend/shell/**'
  - 'libs/frontend/**/guards/**'
  - 'libs/frontend/**/interceptors/**'
  - 'apps/web/src/**'
---

# Routing, prerendering and hydration

- `APP_ROUTES` (`libs/frontend/shell/src/lib/app.routes.ts`) mounts the lazy admin area, the site layout,
  the feature route trees, `error/:code` and the `**` fallback. A feature exports one constant route tree.
- `SERVER_ROUTES` (`libs/frontend/shell/src/lib/app.routes.server.ts`): public routes are prerendered,
  parameterized ones with `getPrerenderParams` from the snapshot; the admin area is `RenderMode.Client`
  and `noindex` (D18). The build is static and localized: French at `/`, English at `/en/`.
- Prerendering calls no API (D7): browser APIs run in `afterNextRender` or behind `isPlatformBrowser`;
  `@angular/ssr` is provided only by `@vfortin/web-shell/server` (D10).
- Deferred sections use `@defer (hydrate on viewport)` with incremental hydration (D16, D22); no client
  trigger that would replace the prerendered markup.
- Admin access goes through `adminGuard` and the lazy identity interceptor; tokens never reach
  `TransferState`, the HTML or web storage.
- The `admin` route of `APP_ROUTES` resolves after `AdminStylesheetService` has loaded `admin.css` (D31):
  admin styles never reach a prerendered page and no admin screen renders unstyled. `admin.css` is
  unhashed and served with `no-cache` by Nginx and the preview.
- Keep parity with the Nginx routing (`docker/nginx/snippets/site.conf`) and its e2e copy
  `apps/web-e2e/support/preview/serve-site.mjs` (D25).

Details: the `pf-web-routing-ssr-builder` agent.
