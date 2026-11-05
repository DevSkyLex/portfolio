# Web runtime

The localized Angular application uses the official `AngularNodeAppEngine` and generated Express
bootstrap pattern. Public routes render on each request; administration routes remain client-rendered.
The same server handles French `/fr/` and English `/en/` builds. Legacy unprefixed public/admin URLs
redirect to French, and the root redirects to `/fr/`.

Build with `npx nx build web`, then run `npx nx run web:serve-ssr`. The executable entry is
`dist/apps/web/server/server.mjs`; both the `server` and `browser` output trees must be deployed.
`HOST` defaults to `0.0.0.0` and `PORT` to `4000`. `CONTENT_API_URL` is the fixed content-service origin
(default `http://localhost:3101`); `SITE_ORIGIN` is the public origin used for canonical addresses and
the engine's allowed hostname (default `https://valentin-fortin.pro`). Forwarded host headers are not
trusted. Only public content is fetched; authentication credentials are never forwarded upstream.

`/health/live` checks the Node process. Public content errors answer 503 without a stale snapshot,
while unmatched URLs and unknown projects answer 404. The sitemap is generated from a coherent pair
of current content revisions; robots rules exclude administration and APIs. Content updates require
no code build or deployment. Browser assets remain versioned by the code build, and hydration reads
the request's validated public data from TransferState.

Run `npx nx run-many -t lint typecheck test -p web web-shell content-web-data-access content-web-feature`
and `npx nx build web`. The `web-e2e` owner verifies the built runtime, fresh content without rebuild,
locale isolation, hydration and response codes against an isolated public-content fixture API.

Browser-unit coverage excludes the three executable bootstraps (`main.ts`, `main.server.ts`,
`server.ts`) and the acceptance-only audience-measurement configuration. The Node bootstrap is
qualified by built-runtime HTTP, browser and standalone-image checks rather than browser-unit
instrumentation. Custom redirect decisions remain in a separately unit-tested helper, and the public
content reader, request providers and sitemap remain covered by their data-access owner.
