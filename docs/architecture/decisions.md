# Architecture decisions

Each decision states the need that justifies it. A decision that no longer has a need is removed.

## D1 — Three contexts, three services

`content` (projects, journey, skills, profile, media), `contact` (form, notification, retention) and `identity` (admin account, sessions, JWT) have distinct data, rules and deployment cycles. Each one owns its Postgres schema, its migrations and its container.

## D2 — No gateway

Nginx routes `/api/content`, `/api/contact` and `/api/auth`. No response composition is needed. A NestJS gateway would only be introduced if a response had to aggregate several services.

## D3 — No broker, no integration events

No business fact of one service is consumed by another. The two reliable side effects are internal to their service:

- `contact`: message and notification task written in the same transaction, then delivered by a worker (local outbox);
- `content`: publication and site rebuild request written in the same transaction, then forwarded to GitHub Actions by the same mechanism.

## D4 — No CQRS, event sourcing or saga

Low volume, a single editor, no distributed transaction.

## D5 — Shared Zod contracts rather than a generated OpenAPI client

In a monorepo, the frontend reads the contract schemas directly (`libs/contracts/<ctx>`). dentalstock generates an Orval client because its API lives in another repository.

## D6 — ESLint and Prettier rather than oxlint and oxfmt

`@nx/enforce-module-boundaries` and `nx format` rely on ESLint and Prettier. oxlint can be added later as a fast pre-lint.

## D7 — Prerendering from a content snapshot

The public site is prerendered from `apps/web/content-snapshot/{fr,en}.json`, downloaded before the build. The Nx cache therefore depends on the actual content, and prerendering calls no API live.

Development exception: the `development` build configuration replaces `apps/web/src/environments/content-snapshot.ts` with `content-snapshot.development.ts` (`fileReplacements`, as in Angular's environments guide), so `nx serve web` renders the content API's published snapshot and falls back on the committed one when the service is down. The snapshot still goes through the same validator, `TransferState` and hydration path. The production configuration never resolves that file, so neither its code nor its URL reaches a production bundle. `apps/web/scripts/local-refresh.mjs` rebuilds the Docker stack's `dist` from a local service without writing the committed files.

## D8 — Projects created on demand

An Nx project is only generated when it receives its first code. Ports exist for I/O and non-determinism (`Clock`, `IdGenerator`), not to wrap every class.

## D9 — NestJS 11 rather than 12

Nx 24 (`@nx/nest`) targets NestJS 11, and NestJS 12 is published as ESM only, which is incompatible with the services' CommonJS webpack build. Move to 12 once `@nx/nest` supports it.

## D10 — Contracts in `zod/mini`, validated at prerender time only

The contracts use `zod/mini` (functional API, lighter). On the web side, the snapshot is validated only during server rendering (`provideContentSnapshotValidation`, secondary entry point `@vfortin/content-web-data-access/server`): an invalid snapshot breaks the build, and the browser bundle does not contain Zod. Likewise, `@angular/ssr` is only provided by `@vfortin/web-shell/server`.

## D11 — `layer:ui` may read `layer:model`

A context's presentation components (`content/ui`) receive the context's models as `input()`. Copying them into local types would duplicate the model without isolating anything. `ui` still reads neither `data-access`, nor HTTP, nor a store.

## D12 — PGlite in development and tests

`CONTENT_DATABASE_URL=pglite:<directory>` (or `pglite:memory`) replaces Postgres without Docker for local development and integration tests; `postgres://…` in production. Same schema, same Drizzle migrations.

## D13 — Server-side `http` and `persistence` platform

The problem+json filter, the validation pipe and the Drizzle open/migrate logic (PGlite or Postgres) served the content context; the contact context needed them in turn. They live in `libs/backend/platform/{http,persistence}`. Each context provides its `PROBLEM_MAPPER` to translate its own errors (the filter knows no domain).

## D14 — Admin inbox deferred to step 5

Listing messages, marking them read or archiving them requires admin authentication (identity, `platform/auth`). These use cases and their screens arrive with it, so that no admin route is exposed without a guard. The `contact.messages` schema already carries `status` and `version`.

## D15 — Anti-spam without a captcha

Invisible honeypot field (`website`): when filled in, the request gets the same 202 response but nothing is stored. Rate limit in the database: 5 messages per hour per origin, the origin being an HMAC fingerprint of the IP address (never the plain IP), forgotten at the end of the window. No consent checkbox (absent from the mockup): a sentence under the button recalls the purpose and the retention period; the link to the privacy policy will come with step 6.

## D16 — Deferred contact section

The contact section (Signal Forms, HttpClient, NgRx Signals) is below the fold: `@defer (hydrate on viewport)` with `withIncrementalHydration()` (a regular `on viewport` trigger would replace the prerendered section with its placeholder). The HTML stays prerendered; the code is loaded as it approaches. Bundle figures: D31.

## D17 — Administrator authentication

A single account created from the command line (`identity-service`: `cli.js bootstrap-admin`), with no public sign-up. Password hashed with scrypt (Node, no native dependency; N = 2^15), 15-minute lockout after 5 failures. A locked account responds like bad credentials (401 `identity.invalid-credentials`) so as not to reveal that an address exists.

The one-time code (TOTP, RFC 6238, implemented with `node:crypto`, a code can only be used once) is optional and off at creation: the bootstrap creates a password-only account and prints no secret. The administrator enables it later from the admin "Sécurité" page, through bearer-authenticated routes (`@AdminOnly`, rate-limited like the login): `POST /api/auth/totp/setup` asks for the password again (a wrong one counts toward the lockout like a failed login) and returns a new pending secret with its `otpauth://` URI, the only answer that ever carries a secret; `POST /api/auth/totp/enable` activates it once a code generated from it is confirmed (same window and replay rules as the login); `POST /api/auth/totp/disable` needs the password and a current code (each mistake counts toward the lockout) and forgets every trusted device of the account; `GET /api/auth/totp` tells whether it is on. A wrong password or code answers 422 (`identity.password-mismatch`, `identity.totp-invalid`), a state conflict 409 (`identity.totp-state`), never 401, which would make the admin client drop its session; only a lock keeps the login's 401. Accepted risk: until the administrator enables it, the account is protected by its password alone (scrypt, lockout, per-address rate limit); existing accounts keep their secret and stay enabled.

Without the code, `POST /api/auth/login` opens the session as soon as the password is right (failures reset, same cookies and "remember me"). With it, login has two steps. `POST /api/auth/login` checks the password; on a browser trusted by that account (trusted-device cookie, 30 days from creation, not extended by use) the session opens at once, otherwise it returns an opaque single-use challenge (5 minutes, 5 wrong codes at most, stored hashed). `POST /api/auth/login/totp` (with the `x-csrf` header) exchanges the challenge and the code for a session, and can trust the browser. A right password alone does not reset the failure counter; every wrong code counts toward the lockout; an unusable challenge (including one opened before the code was turned off) answers 401 `identity.challenge-expired`.

5-minute EdDSA access JWT (`typ: at+jwt`, RFC 9068) carrying `sub`, `role`, `sid` (the session), `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`. Opaque, rotating refresh token stored hashed: "remember me" gives 30-day tokens sliding on each rotation and a persistent cookie, otherwise 12-hour tokens and a browser-session cookie; no session outlives 90 days from its login. A replayed refresh token revokes its whole family; logout revokes the family but keeps the trusted device. Over HTTPS the cookies are `__Host-portfolio_refresh` and `__Host-portfolio_device` (`HttpOnly; Secure; SameSite=Strict; Path=/`, no `Domain`); in HTTP development they keep their plain names on `Path=/api/auth`. The other services verify tokens with the JWKS (`platform/auth`, `@AdminOnly`), requiring the type, the claims above, an age under 6 minutes and at most 30 seconds of clock skew.

## D18 — Admin rendered client-side, localized like the site

The `/admin` screens (login, projects, messages) are not translated (a single user) and are not prerendered (`RenderMode.Client`, `noindex`). They are loaded on demand; the authentication interceptor is a secondary entry point (`@vfortin/identity-web-data-access/http`) that loads the session store on the first admin call, so that the public site ships neither the store nor NgRx. The public contact details, which the shell read from `@vfortin/contact-web-data-access/links` without the contact stores, are content since D44: that entry is gone.

Revision (2026-11-04, owner decision): the administration is bilingual like the public site. Its copy (login, security, OAuth consent and connected applications, sidebar, palette and shortcuts help, projects, experience and education, information, legal, inbox, the admin-facing store and service messages) is `$localize`d French source with explicit `@@admin.<area>.<key>` ids and English targets in `apps/web/src/locale/messages.en.xlf`, like the public copy: each locale build carries its administration, French at `/admin` and English at `/en/admin`, client-rendered and `noindex` in both. Content data stays bilingual as before (the owner types the FR and EN texts of projects, timeline, profile and legal documents; the inbox shows messages as sent), and the content-language controls keep naming the content locale. A « Langue » menu beside « Thème » in the sidebar (flags from `@ng-icons/flag-icons`, endonyms « Français » / « English ») loads the same admin address from the other build (`/admin/…` ↔ `/en/admin/…`), as the public layout switches language; the session survives the full load because the refresh cookie is not tied to the locale path. Dates, plurals and keyboard caps follow `LOCALE_ID`. Nginx and the e2e preview serve `/en/admin/*` from `en/index.csr.html` with the same `no-store` / `noindex` headers (they used to redirect to `/admin/`) and revalidate `/en/admin.css` like `/admin.css` (D31). The OAuth consent route keeps its French-build address `/admin/oauth/authorize`, which the authorization server metadata announces (D45); `/en/admin/oauth/authorize` works the same way.

## D19 — Admin scope

Delivered: projects (FR/EN editing, publication, optimistic lock `If-Match` → 412, site rebuild through the outbox and `workflow_dispatch`), the project article as a rich document with uploaded images and a cover (D40), inbox (read, archived, erasure) and the optional one-time code ("Sécurité", D17). Not delivered, to add if the need is confirmed: editing the journey, skills and profile, adding and reordering projects, a media library beyond the images of a project, password change (today: a new `bootstrap-admin` on an empty database).

## D20 — Strict CSP set by Nginx

Angular's `autoCsp` is incompatible with prerendering. Critical CSS inlining (Beasties, the only inline script) is disabled: no page contains an inline script, so the fixed CSP `script-src 'self'` is enough. `style-src` keeps `'unsafe-inline'` (component styles and `style` attributes of the prerendered pages).

## D21 — Self-hosted fonts

Geist (headings and text) and Geist Mono (details) come from `@fontsource-variable/*`, served by the site; they replaced the mockup's Unbounded, Host Grotesk and Martian Mono, judged hard to read: no request to a third-party service (no IP address transfer to Google Fonts).

Revision (2026-11-03): `apps/web/src/fonts.css` declares the latin and latin-ext faces only (the copy is French and English; the packages' cyrillic, vietnamese and box-drawing faces cost about 2 kB of initial CSS under the D31 budget). The build writes the font files to `/assets/` (`outputPath.media`), because `/media/` belongs to uploaded images (D40) and Nginx answers 404 for any other name there.

## D22 — Contact section hydrated as it approaches

`@defer (hydrate on viewport)` alone: the prerendered HTML stays in place and the code is loaded when the section becomes visible. Adding a client trigger (`on viewport`) replaced the prerendered section with the placeholder. Known limitation: input typed before hydration finishes may be ignored.

## D23 — Postgres: one migration role and one application role per service

Each service has its schema, owned by `<ctx>_migrator` (DDL, used only by migrations and the initial seed); the service runs as `<ctx>_app` (data reads and writes). The migration role also has `CREATE` on the database: the Drizzle migrator runs `CREATE SCHEMA IF NOT EXISTS`.

## D24 — Ansible for the server, Compose for the containers

Ansible prepares portfolio files and secrets supplied by the GitHub production environment on an existing shared VPS; host provisioning, SSH access and Docker are managed separately. Deployment steps stay in `docker/scripts/*.sh`, run by Ansible, so they can be run by hand. The existing shared Traefik owns TLS (D33). No Swarm or Kubernetes for a single server.

## D25 — E2E on the built site

The Playwright tests serve `dist/apps/web` with `apps/web-e2e/support/preview/serve-site.mjs`, which reproduces the application route contract: prerendered pages, `/admin` → `index.csr.html` and `/en/admin` → `en/index.csr.html` (D18 revision), admin `no-store` / `noindex` headers and real 404 responses. Node HTTP tests compare those cases at the server boundary. TLS, proxy trust, rate limiting and pre-compression remain Nginx/Compose concerns; the preview is not a complete edge simulator. The Nx SPA server returned the home page for any address and hid defects. Revision (D48): the standalone suite serves `dist/apps/web-e2e-site`, the production build with a placeholder GA4 measurement id (`web:e2e-site`).

## D26 — A full UI catalogue, tree-shaken

`@vfortin/ui` holds a generic catalogue modelled on the Spartan UI / shadcn list (about 55 entries, built in-house on `@angular/cdk`), whether the site uses each piece or not. Its `package.json` declares `"sideEffects": false`: without it, esbuild keeps every compiled Angular class of a workspace library (their static `ɵɵdefine…` members count as side effects) and the initial bundle went from 493 kB to 903 kB. The Tailwind classes of the whole catalogue remain in `styles.css` (+52 kB raw, about +6 kB compressed), since `@source` scans the source folders, not the import graph. Revision (D31, 2026-11-04): the public `styles.css` scans only the catalogue folders the public pages reach, checked against the import graph; the whole catalogue is in the admin's `admin.css`.

## D27 — Serialized logins and session families

Two parallel logins with the same TOTP code, or parallel wrong attempts, raced on the account row: a code could be accepted twice and failures were lost (no lockout). A login now runs in one transaction that locks the account row (`SELECT … FOR UPDATE`) during the attempt. Each login opens a row in `identity.refresh_token_families`; refresh, replay detection and logout lock that row, and revoking it refuses every token of the session, including a descendant issued concurrently. Replay is checked before expiry, so an old stolen token still revokes a live session. Families whose most recent token expired are deleted at the next login.

## D28 — Outbox leases with a token, one rebuild trigger at a time

A notification claimed by a worker carries a lease token (`notification_jobs.claim_token`); the outcome is only recorded with that token, so a worker whose lease expired cannot overwrite the work of the worker that took over. Delivery stays at least once (a send can be repeated after a crash), and SMTP timeouts are kept well below the lease. For the site rebuild, a claim locks the `content_revision` row and is refused while another request is being sent: rebuild triggers never overlap, even with several instances.

## D29 — Published content read from one snapshot

`GetPublishedContent` reads the revision and the content in one read-only `REPEATABLE READ` transaction, so a snapshot never mixes a revision with the content of another one. The result is kept in memory while the revision does not change (every change visible on the site increments it, D3).

## D30 — Postgres-only behaviour tested against a real Postgres

PGlite has a single connection: row locks, `SKIP LOCKED` and isolation cannot compete there. The concurrency specs of the adapters (`*-concurrency.spec.ts`, `drizzle-identity.repositories.spec.ts`) run on PGlite and, when `TEST_DATABASE_URL` is set, again on that Postgres (each drops and recreates its own schema, so use a throwaway database). See `docs/workspace/generators.md`.

## D31 — Initial bundle budget: 700 kB warning, 1 MB error

The 500 kB budget was set before the site reproduced the mockup. The initial bundle is now 640.75 kB raw, 158 kB transferred: about 420 kB of Angular (core, router, common, platform-browser), 146 kB of CSS (D26) and about 75 kB of application code (shell, public sections, `@vfortin/ui` pieces in use, icons). The canvas scenes are lazy chunks (`planet-renderer`, `parallel-scene`) and the project editor sits behind `@vfortin/content-web-data-access/admin`. The warning stays close above the current size so that growth is noticed; reducing further would mean dropping mockup effects or hand-maintaining the Tailwind source list.

Revision (2026-11-04): the initial total had reached 701 kB (the global stylesheet 164.7 kB raw, 22.2 kB transferred), because Tailwind scanned all of `libs/frontend` and the public pages loaded every class of the client-rendered administration and of the whole catalogue (D26). The global styles are now two entries. `apps/web/src/styles.css` (initial) disables automatic detection (`source(none)`) and lists only the presentation sources the public import graph reaches: the public features, `content/ui`, the shell without `src/lib/admin`, and the catalogue folders the public pages use, one `@source` each. `npx nx run architecture:test` (`stylesheets.spec.ts`) follows the public imports name by name through the barrels, stops at the lazy admin area, and fails when a reached file is not scanned, a listed folder is no longer reached, or an admin-only source is scanned; the list is therefore maintained, but checked. `apps/web/src/admin.css` is a non-injected bundle (`inject: false`, written as `admin.css`, unhashed): Tailwind's theme and utilities layers without preflight, the tokens imported by `reference` (styles.css defines them; a theme value it does not emit is written as the `var()` fallback), the admin document rule, and every frontend source. With both loaded the utilities are those of the former single stylesheet, identical and in the same order, so the cascade is unchanged on every page. `AdminStylesheetService` appends the link when the `admin` route is first loaded (`/admin/login` included), in parallel with the admin chunk, and the route resolves after the stylesheet's `load` event: no admin screen renders unstyled, a failed stylesheet fails the navigation like a failed chunk, a loaded sheet without any rule (an `ng serve` started before the entry existed answers its SPA `index.html`; restart it after a change of the build styles) is reported by a console error, and the link stays for the session. Prerendered pages never reference it (e2e `startup.spec.ts`). Nginx and the preview serve `/admin.css` with `no-cache` (revalidated, never stale after a publication); public pages cannot link to the admin, which always starts from a no-store `index.csr.html`. Measured on the same sources: initial 701.11 kB → 641.21 kB raw (169.3 → 162.6 kB transferred), `styles-*.css` 164.71 → 104.81 kB (22.2 → 15.6 kB), `admin.css` 150.44 kB (19.0 kB), loaded by the admin only. The 700 kB warning keeps the headroom it had when set.

## D32 — Progressive enhancement of the animated content

Prerendered content must stay readable when JavaScript fails or is blocked. The blocking `apps/web/public/theme.js` sets `data-js` on `<html>`; reveal states (`in-data-js:not-data-in:*`) only hide content while it is set. Public content routes explicitly await their locale snapshot. During prerendering the server validates that public data and serializes it in Angular `TransferState`; hydration consumes and removes the active locale entry before any dynamic import, avoiding a second network dependency. Administration, legal pages and error pages do not require the public snapshot. A CSR content load failure goes to the independently renderable 503 page; server validation failures still reject the build. Prerender route enumeration explicitly awaits readiness too.

The shell sets `data-app` only after successful navigation. Without that marker after 4 s, the theme script removes `data-js` and reveals the static page when the main application bundle is unavailable. A navigation error also removes the hiding markers. Browser tests assert actual readable text, rather than treating marker removal as sufficient proof: an earlier route-error design lost the prerendered DOM during hydration cleanup. The Parcours scene has a `scene-static` variant (reduced motion, no `data-js`, failed chunk or missing canvas context) that lays all steps out in a static two-column flow instead of the mockup's still frame showing only the active steps. A failed decorative planet chunk retains a stationary token-based fallback and never mutates a destroyed owner.

## D33 — Shared Traefik edge, private Nginx origin

The portfolio joins the existing `traefik_proxy` network used by Dentalstock and Fireguard. Traefik owns public HTTP/HTTPS ports, redirects and certificate renewal (`web`, `websecure`, `letsencrypt`); the portfolio no longer provisions Certbot or mounts certificates. Only Nginx joins this shared network. Nginx keeps the prerendered releases, cache policy, maintenance page, security headers and same-origin API routing (D2); services and Postgres stay on private networks.

Deployment uses the sibling applications' host, port, container, router, middleware, resource-limit and log variables. `TRUSTED_PROXIES` is an explicit reviewed Traefik address or narrow CIDR, never the entire shared application network: Nginx accepts only that peer and restores its forwarded client address before rate limiting and API forwarding. Three separately built service images retain `REGISTRY` and a common commit `TAG`. Local `compose.dev.yml` remains standalone and does not require the shared edge.

## D34 — Project-private source aliases

Each Nx project's source root has an `@internal/<project-name>/*` TypeScript alias for imports within that project. The web application alone also has `@internal/web-snapshot/*` for its generated content snapshots outside `src`. The `@vfortin/*` entry points remain the only public library imports; private aliases must not cross project boundaries, and a library must not import its own public barrel. The architecture tests resolve private aliases when checking boundaries and file cycles. Nx permits same-project aliases so those tests can enforce the narrower policy without relaxing the tag constraints.

## D35 — One scale for interactive states

The mockup's control borders (`--line`, 1.22:1 on the page) left outline buttons, selects and fields nearly invisible, and its hovers went different ways: the filled button dropped to `--star-muted`, ghost buttons and toggles darkened to `--void-sunk` (pure black in the dark theme), contact links dimmed while every other link brightened. `libs/frontend/design-tokens/src/theme.css` now derives every state from the ink and the strong line, so both themes follow: controls rest on `--line-field` (42 % of the strong line, about 1.5:1 dark and 1.7:1 light) and take `--line-hover` (68 %, about 2.2:1 and 2.4:1) under the pointer; transparent controls tint with the ink (`bg-star/5`, `/8` when pressed); raised surfaces take `--void-hover`; filled ink buttons soften to `--star-hover` (86 % ink, text stays above 13:1); links already in full ink show an underline instead of changing colour. Dividers, cards and panels keep `--line`. This deliberately departs from the mockup and from the Orbite design system artifact, which still holds the previous values.

## D36 — Admin screens in a dense product style

The administration (login, sidebar shell, project list and editor, inbox) follows a dense product-tool layout in the manner of Linear rather than the public site's editorial one: Geist at 12 to 14 px for the controls and lists, a 232 px sidebar with 32 px entries, a 48 px title bar per page, hairline rows grouped by status, a properties panel beside the project editor, a two-pane inbox, and keyboard use: Ctrl/Cmd+K opens a command palette (pages, projects, actions), Ctrl/Cmd+S saves a project, J/K and E move through and archive messages (a message shown for one second is marked read, 2026-11-04). Destructive actions confirm in an alert dialog rather than `window.confirm`, and the sidebar displays the inbox owner's unread summary, refreshed on navigation and invalidated by message mutations. It keeps the Orbite tokens and the D35 state scale; aurora violet marks the workspace mark, while selection takes the brand accent `accent` and statuses the D37 families (unread is info). The admin stays client-rendered and is localized like the site (D18 revision).

Admin audit 1 revision. Widths that carry content are in pixels, not in percent of the window: a
resizable panel takes `'<n>px'` sizes and bounds, converted with the group's length measured in the
browser (a `ResizeObserver`; before the first measure a pixel default is a fixed CSS basis), and keeps its
pixel width when the window changes. The sidebar opens at 232 px within 200 to 360 px, its width stored in
pixels (a percentage stored before falls back to 232 px), and drops the search key caps below 224 px; the
project properties panel stays within 300 to 480 px (default 320) and the inbox list within 320 to 560 px
(default 380). The sidebar's separator lies inside its `aside`, along its edge, so that every page passes
the axe `region` rule. Below 1024 px the sidebar is a single top bar (workspace link fitting its name,
search, sections, then the site and logout entries as same-sized icon buttons). A skip link leads to the
`main` landmark. Shortcut caps name the platform's modifier only (`ModifierKeyService`: « Ctrl K » on
Windows and Linux, « ⌘ K » on Apple platforms, `Ctrl` before the browser is known) in the sidebar, its
tooltips (`tooltipShortcut`) and the shortcuts help. The command palette is anchored 15vh below the top
(`placement: 'top'`), its list up to `min(32rem, 60dvh)`, so that filtering never moves the input. Data
table rows are no tab stops: keyboard users reach the row's link (Enter follows it) and its actions,
while a click anywhere still activates the row; an empty result keeps the column widths and offers one
reset, the toolbar's. `ConfirmDialogService` returns the focus to `restoreFocus`, else to the element
focused at opening, else to the trigger of the menu that held it, else to `opener`. Short form dialogs
show only the « Échap » hint; the palette and the shortcuts help keep their richer hints. The login
labels are 14 px and each field shows its own error, without a summary.

Admin audit 2 revision. The public site's `scrollbar-gutter: stable` made every `@container` 10 px
narrower than the viewport that `matchMedia` reads, so the inbox and the project editor switched their
CSS and JavaScript layouts 10 px apart (a hidden properties panel rendered next to its sheet, duplicate
ids), and the CDK overlay container was 10 px narrower than the viewport from which end-aligned menus are
placed. While mounted, the admin layout marks `<html>` with `data-admin`: the admin stylesheet
(`apps/web/src/admin.css`, D31) drops the stable gutter there and clips sideways overflow, the layout spans `100vw` (its container width equals
the `matchMedia` width whether or not the document scrolls) and its page group gives the measured
scrollbar width back as a right margin (`--admin-scrollbar`). The public site keeps its gutter. Below
1024 px the top bar is 48 px high (32 px entries), with the site and logout entries at the end of its
first row and, below 640 px, the sections on a second row; the security page drops its context bar there,
the top bar already naming the section. The skip link is fixed and moved off-screen until focused, so
that showing it never moves the page; the sidebar's retry buttons are ghost `xs` buttons; the unread
count is a 20 px badge with a real plural. The shortcuts help lists the article editor's shortcuts and
keeps only « Échap » in its footer; the palette names its project group « Ouvrir un projet » and hides its
key hints below 640 px. Shortcut caps and `aria-keyshortcuts` come from `ModifierKeyService.caps` and
`ariaKeys` (`Meta+…` on Apple platforms, `⌘ ⌥ ⇧` caps). The login drops its decorative glow and its
labels follow the dense field type, 13 px.

Admin audit 3 revision. The project table selects rows with catalogue checkboxes (the header one
selects the visible page, indeterminate when partly checked). The selection survives sorting and paging
but keeps only the rows the search and facets leave, in their latest loaded version, so that a bulk
action never reaches a hidden row or an old version. While a row is checked, `ui-selection-bar` rises at
the bottom centre of the list column (a named region, the count announced with a real plural, Escape and
a clear button empty it, the focus returns to where it came from): Publier, Dépublier, Mettre en avant,
Retirer de l'accueil, each disabled when no selected project is concerned. One confirmation precedes a
change of the public site (publication, unpublication in the danger tone, a feature change of a
published project); the requests run one after the other with `If-Match` on each project's latest
version, the feature through a revision of the project's own values (no new endpoint); one toast gives
the count, a partial failure as a warning that keeps the failed projects selected, and a conflict
reloads the list. The table's columns are resizable from a separator on each heading's end edge (drag,
arrows by 16 px, Home and End, double click to reset), under the fixed layout from the first render,
the widths kept per viewer in `localStorage`; the actions keep their 40 px. The page size is the
catalogue `ui-select`, not a native select.

Sidebar collapse revision (2026-11-04). From 1024 px up the sidebar collapses to a 56 px icon rail
rather than hiding, as in a product tool: the sections stay one click away and the unread count stays
visible. The rail keeps the workspace mark, the search, the section icons, the site and logout entries
(and the retry buttons as icons), each named by its visually hidden label and by a tooltip on its right
on hover or focus; the unread count becomes a 16 px solid info badge on the inbox icon's corner. The
56 px are the 12 px inset plus a 32 px entry, so the icons do not move. The state lives in the shell's
`AdminSidebarStateService`, kept per viewer in `localStorage` (`portfolio.admin.layout.sidebar-collapsed`,
only `true` collapses; a missing, invalid or unreadable value expands). Features may not import the
shell (`docs/architecture/boundaries.md`), so the toggle is the catalogue's `ui-sidebar-trigger`, which
reads `SIDEBAR_CONTROL`, a token `uiSidebarProvider` provides with `SidebarService` and the admin
layout with its service, on the layout element that routed pages inherit, in the manner of shadcn's
`SidebarProvider` and `SidebarTrigger`. Each page puts it first in its 48 px bar, an icon button named
« Réduire la barre latérale » or « Déployer la barre latérale », with `aria-expanded`, `aria-controls`
on the `aside` and a tooltip with its shortcut. The shortcut is `[` outside fields and dialogs (listed
in the shortcuts help): Ctrl/Cmd+B is the article editor's bold, and Ctrl/Cmd+\ needs AltGr on a
French keyboard, where AltGr itself reports Ctrl; `[` is matched on the character produced, so AltGr+5
works. Collapsed, an important `flex: 0 0 56px` overrides the panel's flex, the separator leaves (the
rail keeps its 1 px `border` hairline in the same place, drawn by a pseudo-element, so nothing shifts),
and the group keeps the stored width, which expanding restores. The flex transitions with `--dur-roll` and
`ease-orbit` only during a toggle (dragging and window resizes follow at once) and never under reduced
motion. Below 1024 px the top bar is unchanged and the trigger renders nothing; a collapsed state waits
for a wider window.

Column resizing revision (2026-11-04). The table fed the widths it measured back into its `colgroup`,
the title included, so no column took the free room: the browser spread it over every column, a drag
started from the rendered width but wrote a scaled one, and the edge left the pointer while every column
moved. The `colgroup` now holds the model only: the selection column (40 px framed, 52 px flush, its
24 px gutter included) and every column with a `width` are fixed in pixels (the stored width, else the
`width`), and the first column without one, the title, fills the room left without a handle, down to
its `minWidth` (200 px by default, 240 px for the projects); past that the table takes the sum as its
minimum width and the frame scrolls sideways, then also vertically within the viewport so that the
heading sticks to its top. Measured widths only serve the empty state of tables without resizable
columns. The fixed columns after the fill column are anchored to the table's end, so each is resized
from its start edge, the one facing the title: the dragged edge stays under the pointer, the title
absorbs the change and no other fixed column changes width (a column before the fill column keeps its
handle on its end edge). Pressing changes no width; the drag applies the pointer once per animation
frame, writes the `col` in the same frame, stops at the column's bounds and, in a frame that cannot
scroll, where the title would go below its minimum; a scrolling frame keeps its mode during the drag,
the table keeps the width it started with and the frame scrolls by the edge's drift, so the edge
follows there too, the table giving back the overflow it started with on release. During a drag the
document takes the `col-resize` cursor without text selection, a dashed `border-strong` line runs over
the table height at the edge, and Escape restores the width; the width is stored on release only. The
handle is a 12 px target centred on the edge; its bar is 16 px tall, a `border` hairline while the
heading row is hovered, 2 px `border-strong` under the pointer and 2 px `fg` while dragged or focused.
Double click or Enter fits the column to its widest heading or visible cell, Shift with either restores
the default `width`; arrows move the edge by 16 px (64 with Shift), Home and End go to the bounds,
Escape leaves the handle. Stored widths only apply to existing fixed resizable columns, within their
bounds; the projects table stores them under a new key, the earlier values having been written by the
old model. The actions keep 52 px (a 28 px button and the 24 px end gutter) without a handle.

Settings page revision (2026-11-04). The « Sécurité » page left a ~640 px block against the sidebar and
a wide empty area on the right from 1440 px up. Its header stays the standard full-width
`ui-page-header` (default gutters); the content below sits in the project editor's centred 920 px
column (`mx-auto max-w-[920px]`, 24 px gutters, 16 px below 640 px), so the margins belong to the
content, not to the header. Each setting topic is its own section, a grid on the column's named
container: title, description and, where useful, a short factual note (the compatible applications)
in a 14rem column beside its rows from 48rem of column width, stacked below; every section uses the
same grid, so titles and rows line up across sections, and a full-width hairline with 40 px on each
side (32 px below 640 px) divides them. The rows are flat on the page background, framed and divided
by hairlines (no card, no side padding; stacked, the divider closes a section's rows instead of a
second line): a 36 px tile on the field radius (`md`, raised surface), a 14 px title with a neutral
outlined status badge (D37 dot), a 13 px description of at most 65ch and a 36 px action on the tile's
line at the end, on its own line below 640 px; a destructive action is a ghost in the danger ink. A
section title starts on its first row's line, or on the alert's when a failed read replaces the rows.

Empty state revision (2026-11-04). Empty states had grown one by one: the table's empty cell
(« Aucune donnée. », a 96 px row), list blocks with ad-hoc paddings (`py-10`, `py-16`), a round
mark from the public mockup, display-size titles overridden in each consumer, a one-line palette
message and a dashed cover box. They are now one catalogue composition, `uiEmpty` (shadcn « Empty »):
an optional 36 px icon tile (`uiEmptyMedia variant="icon"`, the settings rows' tile: `md`, raised
surface, a 16 px lucide icon of the section), a 14 px medium title, a 13 px muted description of at
most 60ch and a row of actions (the primary one first, `xs` buttons), left-aligned like every text of
the admin (D37). Its height follows its position, through `layout`:

- `fill`: nothing follows it in its page column (the list pages without rows, the inbox tab without
  messages). It takes the remaining height (`flex-1`, at least 18rem) with the page gutters, and its
  content rests on the top third of the free room (spacers 1:2, the top one capped at 6rem) instead of
  its middle, which left it floating far below the header on a tall window.
- `inline` (the default): something follows it (pagination, another section, more options in the
  command palette). 32 px of block padding, no stretching.
- `panel`: it is the only content of a bounded pane, sheet or frame (the 16:9 cover frame of the
  project editor). It fills the box with a 16 px inset, on the box's top third, without making it
  scroll.

`ui-data-table` takes the rule through `emptyLayout`: its empty and no-result states move from a
spanning cell to below the heading row (a cell cannot grow into the column), a `fill` table grows
into its flex column, and a projected `ng-template[uiDataTableEmpty]` receives the layout as its
context. The no-result state gains a description and « Réinitialiser les filtres » as its action,
beside the filter bar's own reset (the earlier rule kept only the toolbar's), and is announced
politely. Every empty state says what is empty and what to do: « Nouvelle expérience » / « Nouvelle
formation » on an empty timeline, « Voir tous les messages » on an empty inbox status tab (a failed
load shows its alert alone), the accepted formats in the empty cover frame. The security page's
trusted-device row stays a settings row: it describes a setting's state, not an empty collection.

Empty state centring (2026-11-04). The owner asked for centred empty states (« J'aimerais centrer les
empty states »), an explicit exception to the left-aligned text of D37. `uiEmpty` centres its icon
tile, title, description (still 60ch at most, `mx-auto`) and actions horizontally in every layout;
`fill` and `panel` also centre the content vertically (`justify-center`) instead of the top-third
spacers, `fill` keeping its 18rem minimum, while `inline` stays compact. Only the catalogue's
empty-state files may centre text (`design.spec.ts` allow-list); consumers inherit the alignment and
never set it themselves.

Timeline selection revision (2026-11-04). The « Expériences » and « Formations » tables select rows
like the projects (catalogue checkboxes, `ui-selection-bar` with a real feminine plural, Escape and
the clear button empty it). Its one action is « Supprimer », after one danger confirmation, deleting
the entries one after the other with each entry's version in `If-Match` (every deletion answers the
remaining list and its new version). One toast gives the count (« 2 expériences supprimées »), a
partial failure as a warning that keeps the failed entries selected; a conflict reloads the list.

The public timeline places the entries on its year axis by their dates, so a manual order barely
showed (« Je ne vois pas l'intérêt de monter et descendre »): the admin no longer offers one. The row
menu keeps « Modifier » and « Supprimer » (no « Monter » / « Descendre », no Alt+↑ / Alt+↓, no « Monter
en tête » / « Descendre en fin », no page-header sentence about the order), and `AdminTimelineStore`
keeps the list most recent first: by start month, then, on the same start, an ongoing entry first and
the later end first, entries of the same period in the API order. The reorder endpoint
(`PUT :kind/order`) and the stored positions stay as they are, without a migration; the browser no
longer calls the endpoint. The snapshot follows the dates too: `TimelineEntry.compare` orders each
kind by period (start, then end, an ongoing entry last, then identifier) instead of position, so that
two entries of the same start year keep their chronological order on the public tracks.

Site texts revision (2026-11-04). Two pages join the sidebar after « Formations »: « Informations »
(`/admin/information`, lucide `info`) and « Légal » (`/admin/legal`, lucide `scale`), both in the
« Sécurité » layout (the 48 px bar naming the section, hidden below 1024 px; the page header; the centred
920 px column). « Informations » keeps the FR/EN tabs in its header: their panels hold « Présentation »
(home introduction, « À propos » statement and lead, with counters) and « Repères » (up to 8
label/value facts, added, moved and removed by row buttons), and « Liens » follows the panels, common
to both languages (up to 8 rows: a kind select, the address, an optional label, move and remove; an
e-mail is typed without `mailto:`). « Légal » puts the document tabs (« Mentions légales »,
« Confidentialité ») in its header, with the shown document's « Dernière mise à jour » (Paris time) and
version as meta; each panel stacks the French and English documents in the article editor without
image, both panels staying mounted so that switching keeps the edits. Each form has the floating save
bar (Ctrl/Cmd+S saves the shown one, « Abandonner » confirms), server field errors stay on their field
until it changes, a 412 is an inline alert reloading that document only, and leaving with changes asks
first. Every text is required in both languages, since these pages are public as soon as they are saved.

## D37 — Status colours, left alignment and feature folders

The palette had no status colours: `--danger` was orange, success borrowed the cyan `--signal`, unread items the aurora violet, and `--void-sunk`, the scrim and the float shadow were neutral black against a violet-tinted night. `theme.css` now defines four status families, each with a fill, an `-ink` for text (at least 4.5:1 on void, raised and an 8 % tint of itself) and an `on-` colour: **success** green (`--success`: published, saved, read, confirmed), **warning** amber (`--warning`: to complete, pending, needs attention), **danger** red (`--danger`: errors, refusals, deletions), **info** the aurora blue (`--info`: information, unread). `--signal` stays the brand accent (focus, selection, the planet lens) and is never a status; the aurora hues stay decorative. The night is tinted everywhere (`--void-sunk` `#020207`) and the ink slightly softened (`#eeedfb` dark, `#121222` light) to take the glare off 18:1 text.

Statuses go through the catalogue rather than hand-made markup: `uiAlert` (`info`, `success`, `warning`, `danger`), `uiBadge` (same variants, `dot` for a status dot), `uiBtn variant="danger"` for a destructive confirmation, the toaster's `success` / `warning` / `info` / `error`, and `ConfirmDialogService` instead of `window.confirm`. Icons take the ink of their meaning (a check in success, a trash in danger); a destructive toolbar action keeps neutral text with a danger icon. A disabled filled button rests on the control surface (`line-field`, `star-faint` text) instead of half-transparent ink, which read as a neutral grey; a single-choice filter is a `uiToggleGroup` with `required`, which never releases its pressed option. `tools/architecture/src/design.spec.ts` enforces the rules on every frontend source: colour utilities name tokens only (no Tailwind palette, neutral greys included), no raw colour in a class or a stylesheet, and `text-center` only in the calendar, the data-table column alignment and the catalogue empty state (D36 empty state centring). ng-icons styles its host in `@layer ng-icon`, declared first in `apps/web/src/styles.css` so that `text-*` utilities colour icons.

Text reads left-aligned: headings, forms and dialogs start on the left; centring is kept for single figures (the error page code), the mockup's centred compositions of the public site and, by the owner's decision, the empty states (`uiEmpty`, D36 empty state centring).

Frontend features follow the dentalstock folder template (`ARCHITECTURE.md` §8.3, §9.2, §10): pages orchestrate stores and navigation; forms live in `ui/forms/<name>-form/` with their local values in `models/`, own their Signal Form and emit `submitted`; lists and cards use `ui/dataviews/<name>/`, other compositions use `ui/components/<name>/`, and home sections use `ui/sections/<name>-section/`. Each component keeps its template and optional `components/<child>/`, `models/`, `constants/`, `options/`, `utils/<helper>/` and `testing/` beneath its unit folder. Feature-level models group related declarations in `models/<concept>/`; constants and options stay flat within their owner. Services and stores have named concern/slice folders, as do HTTP units and utilities. Production role-suffixed units are checked by `unitFolderViolations`; matching catalogue entry roots and route/bootstrap/composition/public entries remain valid. This is a source layout convention within existing Nx owners, not a new project split. One declaration per file remains the feature rule, with no interface or constant beside a component class. The portfolio keeps its own `Component` class suffix and `<prefix>-` selectors (rule `components.md`).

Badge revision (admin audit 3). Tinted status badges coloured their whole label, which made dense lists
loud. A status badge is now neutral by default (`appearance="outline"`): no fill, the `border`
hairline and the `fg-muted` label (7.2:1 or more on every surface in both themes), with only the dot or
the leading icon in the status ink (4:1 or more in the light theme, 7.9:1 in the dark one, above the
3:1 of WCAG 1.4.11). A leading dot or icon takes a 6 px start padding against the 8 px after the label,
which balances the glyph's own inset. `uiBadge` also offers `ghost` (no hairline), `soft` (the former
look, an 8 % tint with ink text, 4.8:1 or more) and `solid` (the fill with `on-fill` text, 4.7:1 or
more), an `accent` family (its text on its tint stays under 4.5:1 in the light theme, so a soft accent
badge keeps the `fg` label), a `pill` shape and an `md` 24 px size. Count badges (unread messages,
fields to complete) carry a dot, and every status shown with an icon in the admin (completeness, the
save status) goes through `uiBadge`.

## D38 — Owner contracts and administration ports

Every frontend library's README owns its purpose, public entry points and approved Nx consumers,
provider lifetime, invariants and validation. Only the exact `Public entry points` table grants access;
prose and fenced examples do not. Architecture tests require these sections, validate grants against
configured aliases and real projects, and reject imports from consumers the target owner did not
authorize. This supplements the layer/tag constraints rather than widening them.

Administration layouts consume narrow owner-provided capabilities: identity's
`@vfortin/identity-web-data-access/session`, content's
`@vfortin/content-web-data-access/navigation` and contact's
`@vfortin/contact-web-data-access/summary`. Their providers bind concrete stores/services behind port
contracts; the shell does not query APIs or inject business stores. The inbox owner invalidates its
summary after mutations, and summary/query failure remains explicit instead of appearing as zero
results. Layout import fixtures enforce this boundary.

The deliberately light content data-access root, contact links and identity HTTP entries are also
checked for eager runtime reachability. Static re-exports cannot pull in Zod, NgRx, Angular SSR or
their explicitly separated admin/state implementation files. Type-only references and dynamic imports
remain distinct. This source gate does not replace emitted-bundle measurement, nor does it model
Angular's template-level deferred component rewriting.

## D39 — Semantic compilation of frontend test fixtures

Each frontend library with a `tsconfig.spec.json` has a `typecheck-spec` command that compiles that
configuration with TypeScript and `--noEmit`; its normal `typecheck` depends on this command. The
existing production check remains separate. Architecture fixtures reject missing, detached or
production-only substitutes, so Vitest's successful runtime transpilation cannot stand in for semantic
checking of test hosts, fixtures and setup files. Type-only libraries without a spec configuration do
not receive an empty test target.

## D40 — Rich article documents and uploaded media

A project article was seven fixed sections of aligned FR/EN paragraphs, with tinted placeholders instead of
figures and covers. It is now one document per language (`article: { fr, en? }`, French required), the
ProseMirror JSON produced by a TipTap 3 editor (`@tiptap/*` pinned to `3.32.0`). TipTap is imported only by
`content-web-feature-admin`, so the public bundle never contains ProseMirror; the editor is its own preview,
styled by the same `ARTICLE_TYPOGRAPHY` classes as the public page.

The contract `article-document.contract.ts` (`zod/mini`, D10) accepts a closed subset: paragraphs, headings
of level 2 and 3, bullet and ordered lists (three levels), blockquotes, code blocks, horizontal rules and
top-level figures `{ media, alt, caption }`; inline text with bold, italic, code and links restricted to
`https://` and `mailto:`, plus hard breaks. Unknown attributes are stripped and a root check bounds size,
node count, depth and figures. The public snapshot carries the same document with figures resolved to
`{ src, small, width, height, alt, caption }`. Angular templates render it node by node (a recursive
`@switch`), never through `innerHTML` or `bypassSecurityTrust*`; the level-2 headings form the table of
contents and the scroll-spy sections. Completeness: an empty document, a figure without alt text or a cover
without alt text in a locale is reported in `missing` and blocks publication.

Images are uploaded by the administrator only (`POST /api/content/admin/media`, multipart, 10 MiB; JPEG, PNG,
WebP, AVIF or GIF, SVG refused). sharp decodes them with a pixel limit, applies the EXIF orientation, strips
metadata and re-encodes to WebP at most 2400 px wide, plus a 960 px rendition (`-960`, only for wider
images) for cards and small screens.
Files take a random uuid name in the media directory (`CONTENT_MEDIA_DIR`, written then renamed) and are
served by Nginx at `/media/<uuid>.webp` from that fixed pattern, immutable, with `nosniff`; content-service
serves them itself only without Nginx (`CONTENT_MEDIA_SERVE`, development and acceptance). Same origin, so
the CSP stays `img-src 'self' data:` (D20). A project may have a cover `{ media, alt }`, shown at the top of
the article and on the home cards; the tinted placeholder remains without one. Revising a project checks
that referenced media exist, marks the images it no longer references as unlinked and clears that mark on
the ones referenced again; a scheduled purge removes images unlinked for more than 7 days and referenced
nowhere. The media directory is backed up with the database dump (same encryption and retention).

Existing rows are converted by a SQL migration: each old section becomes a level-2 heading followed by its
paragraphs, the work list becomes a bullet list, captions are dropped, and a partial English draft is
completed from the French text. The seed is written in the new format.

Code block revision (2026-11-04). A code block keeps its language in `codeBlock.attrs.language`: a key of
the closed `CODE_BLOCK_LANGUAGES` list of the contract (TypeScript, JavaScript, HTML, XML, CSS, SCSS, JSON,
Bash, Python, PHP, SQL, YAML, Markdown, Java, C#, Go, Rust, Dockerfile, Nginx), each with its highlight.js
grammar, or `null` for plain text; the domain mirrors the list (`CODE_LANGUAGES`) and refuses any other
value. The administrator schema normalizes rather than refuses: a highlight.js alias or a VS Code mode id
(`ts`, `shellscript`, `yml`) gives its language, any other name gives plain text, so a block pasted with
an unlisted language never fails a whole revision; a missing attribute, and a block stored before the
language existed, read as plain text. Highlighting happens when the snapshot is built: content-service
tokenizes each code block with `lowlight` (only the listed grammars registered) into flat runs
`{ text, kind }`, the highlight.js scopes folded into fourteen kinds (`CODE_TOKEN_KINDS`), the innermost
scope deciding and an interpolation resetting to plain text. The public block carries `attrs.language`,
its text nodes and `tokens`, all optional so an older snapshot still parses; the contract checks that the
runs spell the text. The page renders the runs as `<span>`s coloured with text tokens of 4.5:1 or more
(`ARTICLE_TYPOGRAPHY.codeTokens`), without `innerHTML`, under a header holding the language name, a polite
status and a copy button that writes the text with the Clipboard API, in the browser only. The browser
loads no highlighter.

## D41 — Semantic colour roles

The colour tokens had grown by accretion: surfaces, text and borders kept the mockup's metaphors (`void`,
`star`, `line`, `signal`) while the states mixed three mechanisms (a faint ink `bg-star/5` written in 22
places, `--void-hover`, then a violet `--tint-*` for the admin), seven `on-*` tokens repeated the old page
colour, the scrim, shadow and glow repeated literal values, and `--focus`, `--signal-ink` and `--on-signal`
were unused. Moving the surfaces to near-neutral values left the lavender text out of step.

The tokens are now named by role in `libs/frontend/design-tokens/src/theme.css`: `surface`,
`surface-raised`, `surface-sunk`, `surface-glass`; `fg`, `fg-muted`, `fg-faint`; `border`, `border-strong`,
`border-field`, `border-hover`; `fill`, `fill-hover` and one `on-fill` for the text on any fill (ink, aurora
or status); the aurora palette and `accent` (the aurora cyan, focus and selection); the status families of
D37. Surfaces and text are near-neutral; the aurora is the only hue besides the statuses. Every hover,
pressed and current state uses `surface-hover` or `surface-selected`, translucent ink that reads the same on
any surface; `design.spec.ts` refuses a faint ink background (`bg-fg/12` or less), palette and raw colours.
The scrim, shadows and glow derive from the roles. This replaces the "transparent controls tint with the
ink" rule of D35 and the "no neutral grey" rule of D37: surfaces are deliberately near-neutral, while text
keeps 4.5:1 or more on every surface in both themes.

Admin audit 2 revision: checkboxes, radios, switches and the active OTP slot showed focus as a 1 px
accent border plus a faint halo, hard to see on a 16 px box; they now take the 2 px `outline-accent/55`
ring of links and sidebar entries, an invalid control keeping its danger border under it. Input groups
rest on `surface-raised` like `uiInput`, so that a toolbar's fields read alike.

Admin audit 1 revision: a dimmer ink under the pointer read as a disabled button, so `fill-hover` moves
away from the disabled look (white in the dark theme, a single step lighter than the ink in the light
one), and a disabled filled button rests on `fill-disabled` (the field border in the dark theme, a pale
control surface in the light one, where the field border read as a strong grey). Buttons keep weight
500 whatever text size a caller sets. Unchecked checkboxes and radios take `border-strong`, 3:1 or more
on every surface (WCAG 1.4.11), and `fg-faint` under the pointer.

Light fields revision: in the light theme a field rested on the grey `surface-raised` with a dark grey
rim and read heavy; text fields now rest on `surface-field` (raised in the dark theme, white in the light
one) and `border-field` drops to a 32 % mix of `border-strong` in the light theme, which every control at
rest shares (buttons, toggles, OTP slots). Floating bars, menus, listboxes, popovers, pickers and
tooltips rest on `surface-float`, white in the light theme too (menus and the command list had a local
`light:bg-surface`). The field rim is decoration beside its label, not the only cue (WCAG 1.4.11);
checkboxes and radios keep `border-strong`.

Admin audit 3 revision: status badges become neutral (no fill, `border` hairline, `fg-muted` label),
the status hue moving to their dot or icon (D37 badge revision); text keeps 4.5:1 and the coloured glyph
3:1 or more on every surface in both themes.

## D42 — Project SEO

Public pages carried a title and one site-wide description only. Each case study now writes its own
search and sharing metadata, from the snapshot alone (D7), so the prerendered HTML is what crawlers read.

- **Texts**: the administrator may write a search title (70 characters at most) and description (170) per
  language (`ProjectSeoDto`); the snapshot carries them in its locale as `seo: { title, description }`,
  `null` when empty, an empty English text never borrowing the French one. The page then falls back on
  `<project title> — Valentin Fortin` and on the summary cut at a word boundary near 160 characters with an
  ellipsis; custom texts are written verbatim.
- **Tags**: `PageSeoService` (`@vfortin/content-web-data-access`) writes them through `Title`, `Meta`,
  `DOCUMENT` and a `Renderer2`, with no browser API, so prerendering and client navigation behave alike:
  meta description, `link rel=canonical` in the page locale, `rel=alternate` `fr` / `en` / `x-default`
  (French), Open Graph (`og:type` `article` or `website`, title, description, url, site name,
  `og:locale` `fr_FR` / `en_GB` with the other as `og:locale:alternate`, the absolute cover with its size
  and alternative text), the Twitter card (`summary_large_image` with a cover, `summary` otherwise) and a
  schema.org `CreativeWork` (headline, description, url, `inLanguage`, image, author). The snapshot has no
  dates, so no `datePublished` is written. The JSON-LD is a `script type="application/ld+json"` data block
  filled through a text node with every `<` written `<`; it is never executed, so the CSP
  `script-src 'self'` (D20) is unchanged. Links and the data block carry `data-page-seo` and are replaced on
  every page, prerendered copies included; leaving a case study removes them and restores the site
  description. The home page writes its canonical, alternates and `website` Open Graph tags the same way.
- **Keywords**: the administrator may also write up to 10 keywords per language (2 to 40 characters
  each once trimmed, unique regardless of case; `seo.keywords: { fr: string[], en?: string[] }`, stored
  in their own `seo_keywords` column, migration `0005_project_seo_keywords`). The snapshot carries the
  locale's list as `seo.keywords`, empty when none was written, again without borrowing the French one.
  The page writes them, comma-joined, to `<meta name="keywords">` and to the JSON-LD `keywords`; with an
  empty list it writes the project's technology keys instead (`flutter, supabase`), and neither tag when
  the project has no technology either. Every other tag is derived (Open Graph, Twitter, canonical,
  alternates), so it is not editable.
- **Editor**: the « Référencement » section of each language tab edits the keywords with
  `ui-tags-input` (« Reprendre les technos » appends the technology keys), and shows the search result,
  a neutral link card (cover at 1.91:1 or a placeholder, domain, title, description) and a collapsible
  « Balises générées » list. They are computed by the public functions themselves (`projectPageSeo`,
  `pageSeoMetaTags`, exported by the `admin` entry of `@vfortin/content-web-data-access`), fed with the
  form values, so the editor shows exactly what the public page will emit.
- **Origin**: one `SITE_ORIGIN` token, provided by the web shell through `provideSiteOrigin()`, default
  `https://valentin-fortin.pro`.
- **Generated files**: `npx nx run web:seo-files` runs after `web:build` and writes `sitemap.xml` (home,
  legal pages and every project, one `<url>` per language with `xhtml:link` alternates and `x-default`; no
  `lastmod`) and `robots.txt` (everything allowed except `/admin`, `/en/admin` and `/api/`, sitemap announced)
  into `dist/apps/web/browser`, from the same snapshot (`apps/web/scripts/generate-seo-files.mjs`, origin
  `SITE_ORIGIN`, same default). The `Site build` workflow and `web-e2e:e2e` run it; Nginx and the preview
  server already serve `.xml` and `.txt` as short-cached static files.

## D43 — Radius scale and page headers

The radii had grown by accretion: three tokens (`--radius-field` 10 px, `--radius-option` 6 px,
`--radius-card` 16 px) plus a `--radius-sm` 4 px, Tailwind's default steps and a dozen ad-hoc values
(`rounded-[6px]`, `[8px]`, `[10px]`, `[12px]`, `[999px]`). Every control took 10 px whatever its height,
cards 16 px, and nested elements ignored their container (menu options sat 5 px inside a 10 px panel, the
article toolbar's 10 px buttons inside 6 px of padding).

`libs/frontend/design-tokens/src/theme.css` now clears Tailwind's radii (`--radius-*: initial`) and defines
one scale by element size: `2xs` 2 px (hairline details, an item nested in an `xs` chip), `xs` 4 px (kbd,
badges, checkboxes, chips, inline code), `sm` 6 px (h-7/h-8 controls, menu options, sidebar entries, tab
triggers), `md` 8 px (fields and buttons from h-9 to h-11, select triggers, input groups), `lg` 10 px (menus,
select lists, popovers, toolbars, the save bar, h-14 controls) and `xl` 12 px (cards, dialogs, toasts,
alerts, large previews and the public project cards). Edge-attached sheets stay square. Buttons gain an
`xs` size (h-7, `rounded-sm`); a caller shrinking a control to h-8 adds `rounded-sm`.

Nesting rule: an element hugging a rounded container with a gap of 8 px or less, measured edge to edge with
the border, takes the container radius minus that gap. Menu panels, select lists, the command list, the
menubar, the article toolbar and the save bar pad 3 px inside a 1 px border, so `lg` (10) = `sm` (6) + 4;
an input group's h-8 button keeps 6 px in an h-9 group, its h-7 button 4 px; the sidebar workspace entry
(`md`, 4 px inset) holds a 28 px `xs` mark. With a generous padding (dialogs, popovers, cards: 16 px or
more) the size scale wins and each element keeps its own step. Dialog header and footer bars stay flush:
the panel's `overflow-y-auto` clips them to its corners.

Menus share one compact density: options are 32 px high with 8 px of side padding and 13 px text (labels
12 px), whether in a dropdown, context or column menu, a facet filter or the command palette; selects and
comboboxes keep the size of their trigger. A static `class` on an overlay `ng-template` never reached its
`class` input (Angular forwards static classes on elements only), which left the facet filter at the 16 px
popover padding: such templates bind `[class]`.

The 48 px bar of each admin page now carries only the navigation context (the section, or "Tous les
projets › <projet>"); the `h1`, its meta line, the page actions and the page tabs live in a `ui-page-header`
band below it (`uiPageHeaderTitle`, `uiPageHeaderMeta`, `uiPageHeaderActions`, `uiPageHeaderTabs`), on the
page surface behind a hairline, in the manner of fireguard-web's dashboard page header. Each page renders
its own header, since features cannot import the shell: the project editor's FR/EN tabs and the inbox
status filter are tab sets whose triggers sit in the header and whose panels hold the form or the list.
This departs from the mockup's 16 px cards and from the Orbite design system artifact.

Admin audit 1 revision: menu group labels (dropdown and column-menu labels, select labels, command group
headings) are Geist sans at 12 px, the mono staying for shortcut hints. A dialog or alert-dialog footer
bar sticks at `-bottom-(--dialog-inset)`: browsers resolve a sticky offset against the scroll container's
padding edge, so `bottom-0` stopped the bar one inset above the panel edge, over the last lines of the
body.

Admin audit 2 revision: buttons gain square icon sizes on the small-control step (`icon-xs` 28 px,
`icon-sm` 32 px, `rounded-sm`), and the confirm dialog's h-8 buttons and the data table's h-8 page-size
select take `rounded-sm`. Dialog widths drifted (420, 448, 512 px): dialogs and alert dialogs now take a
`size` option, `sm` 420 px (the alert-dialog and confirm default) or `md` 512 px (the dialog default).
Badges have one 20 px size. `ui-field size="sm"` sets 13 px labels and 12 px hints and errors, and the
field marks its projected controls `aria-invalid` while it shows an error, so that their danger border
appears without a binding in each form. A page header meta line led by an icon keeps one row, its text
wrapping beside the icon. The data table freezes its column widths in a `colgroup` when a search leaves
no row, shows a checked facet value once (the toolbar chip, its remove button widened to a 24 px target),
and hides the column menu below 640 px.

## D44 — Profile links and legal documents as content

The public links (e-mail, GitHub, LinkedIn) were constants of the contact data access, read by the
contact section and the footer, and the legal notice and the privacy policy were static templates with
35 `@@legal.*` messages. Both are now content of the content context, edited in the administration
(D36 site texts revision) and published in the snapshot (D7).

- **Links**: `profile.links` (a jsonb column of the singleton profile row, migration 0008, which also
  gives the row the `version` its `If-Match` quotes) lists up to 8 `{ kind, url, label }`. The kind is
  a closed set — `email`, `github`, `linkedin`, `malt`, `website` — so that each has an icon from the
  ng-icons packs already used by the site (`website` covers any other page, named by its label). An
  e-mail targets `mailto:`, every other kind `https://`; addresses are at most 300 characters, labels 40,
  and a kind other than `website` appears once. The snapshot field defaults to an empty list, so a
  snapshot written before it still builds. Migration 0009 writes the former constants into an existing
  row.
- **Legal documents**: `content.legal_documents` holds one row per kind (`notice`, `privacy`): an
  article document per language (D40, the same contract with figures refused, so the media purge never
  reads it), the time of the last save and a version. A save requires both languages and dates the
  document; the snapshot carries `legal.{notice,privacy}` as `{ updatedOn, document }`, the date in
  Paris time. This field is required: a site build from a service older than it fails at prerender and
  leaves the previous release online, rather than publishing an empty legal page. Migration 0009 creates
  both documents from the static pages' text (dated 2 November 2026, the host's definition list becoming
  bold-labelled paragraphs and the internal privacy link an absolute address) and queues one site rebuild
  on a database that already has content, so the site follows the deployment.
- **Boundaries**: the contact and legal contexts read no content library (`scope:legal` reads only
  itself and the platform). The shell composes them, as for the D38 ports: it passes the snapshot links
  to the contact section as an input, binds the legal feature's `LEGAL_DOCUMENTS` port to
  `SiteContentService` on the guarded public routes (the legal pages now wait for the snapshot), and the
  site layout reads the links from `SiteLinksService` (content data access), which `SiteContentService`
  fills once it has read the snapshot, so an error page rendered without the snapshot shows no link
  instead of loading it. The legal feature renders its view model with its own node-by-node renderer
  (never `innerHTML`), structurally the content article model without figures. No dependency
  constraint changed; `@vfortin/contact-web-data-access/links` is removed.

## D45 — MCP access: OAuth 2.1 authorization server

The owner wants AI clients (Claude, ChatGPT, Cursor…) to act on the content administration through a
remote MCP server, after an explicit consent, rather than through personal tokens. The MCP endpoint
is `https://<host>/api/content/mcp` in content-service (D49); identity-service is its OAuth 2.1
authorization server, following the MCP authorization specification of 2026-07-28 (the draft is
identical on these points). WebMCP comes later.

- **Discovery**: the issuer is `IDENTITY_ISSUER` (`https://valentin-fortin.pro/api/auth`, the issuer
  of the administrator tokens). identity-service serves its RFC 8414 metadata at
  `/api/auth/.well-known/oauth-authorization-server`; Nginx maps the path-insertion URL MCP clients try
  first, `/.well-known/oauth-authorization-server/api/auth`, onto it. It is not an OpenID provider: the
  `openid-configuration` URLs answer 404. The document names the consent page as authorization
  endpoint (`/admin/oauth/authorize`), the token, registration and revocation endpoints under
  `/api/auth/oauth/`, the identity JWKS, `code_challenge_methods_supported: ["S256"]`,
  `token_endpoint_auth_methods_supported: ["none"]`, `authorization_response_iss_parameter_supported`
  and `client_id_metadata_document_supported`. The resource's RFC 9728 document is served by
  content-service at `/api/content/mcp/.well-known/oauth-protected-resource`, behind the Nginx route of
  `/.well-known/oauth-protected-resource/api/content/mcp`, built with `protectedResourceMetadata`.
- **Clients**: public clients only, authenticated by PKCE. A Client ID Metadata Document client uses an
  `https` URL as `client_id` (canonical form, a path, no fragment or credentials, port 443, 512
  characters at most). Its document is fetched only when a signed-in administrator reviews a request,
  through `HttpsClientMetadataFetcher`: `https` on 443, every resolved address outside the RFC 6890
  special-purpose ranges, checked in the socket's own lookup so that DNS rebinding cannot swap it, IP
  literals checked the same way, no redirect, 5 kB and 5 seconds at most. The document's `client_id`
  must equal its URL; it needs `client_name` and one to ten redirect URIs and may hold no secret. The
  copy is reused per its `Cache-Control`, within one minute and one day (an hour without header). The
  logo is fetched once per validated copy, kept only when its magic bytes say PNG, JPEG, GIF or WebP
  (64 kB at most), and stored as a `data:` URL, which the admin CSP already allows. Dynamic
  registration (RFC 7591, deprecated by MCP, kept for older clients) is unauthenticated: the same
  metadata rules, 20 registrations per hour for all addresses plus the Nginx login budget per address,
  and registrations never consented to are deleted after a day; the consent screen and the list flag
  them « Non vérifiée ». Redirect URIs are `https` or HTTP to the loopback interface, nothing else
  (private-use schemes such as `cursor://` are refused), compared exactly except the port of a
  loopback URI (RFC 8252 §7.3).
- **Authorization endpoint**: `/admin/oauth/authorize` is a client-rendered admin page outside the
  layout, behind `adminGuard`, so the normal login applies (password, one-time code, trusted devices).
  It forwards its query to `POST /api/auth/admin/oauth/authorizations` (bearer). Without a single
  `client_id`, for an unknown client or a missing or unregistered redirect URI, it answers a 400
  problem that the page explains, never a redirect. Every later failure goes back to the client with
  `state` and `iss` (RFC 9207): repeated parameters, `response_type` other than `code`, PKCE missing or
  not `S256`, `resource` missing or another one (`invalid_target`, RFC 8707), an unknown scope. A valid
  request waits ten minutes for the decision, bound to the account and the session (`sid`) that
  reviewed it, and is always shown: an earlier consent never authorizes silently. « Autoriser » and
  « Refuser » post to `…/:id/approve` and `…/:id/deny`, whose JSON redirect the page follows with
  `location.assign` once it checked it is `https` or loopback (no form post, so `form-action 'self'`
  stays). The code is 32 random bytes stored as a SHA-256 hash, valid 60 seconds, single use, bound to
  the client, the redirect URI, the challenge, the scopes, the resource and the grant. The page is never
  framed (`frame-ancestors 'none'` and `X-Frame-Options: DENY` on `/admin/`); the decision routes are
  bearer-authenticated, hence not forgeable cross-site, and session-bound.
- **Tokens**: the token endpoint takes form fields; the code grant needs `code`, `code_verifier` (43 to
  128 characters), `client_id` and the same `redirect_uri`, and checks `resource` when sent; the refresh
  grant may narrow `scope` and cannot change the resource. A failed check does not consume the code; a
  second redemption is refused and revokes the family the first one opened. The access token is an
  EdDSA `at+jwt` signed with the identity keys (same JWKS and rotation, D17): `iss`, `sub`, `aud` the
  resource, `client_id`, `scope`, `iat`, `nbf`, `exp` five minutes later, `jti`, and neither `role` nor
  `sid`. Refresh tokens are 32 random bytes stored hashed, in the D27 family design on their own tables
  (`oauth_token_families`, `oauth_refresh_tokens`): rotation under the family lock, 30 days sliding
  within 90, and a replayed token, even expired, revokes its family. `offline_access` is accepted and
  ignored, since every exchange returns a refresh token. Revocation (RFC 7009) revokes the family of a
  refresh token and answers 200 for any unknown token, access tokens included. Token answers are
  `no-store`; the protocol endpoints set no cookie and read none, so they answer any origin
  (`Access-Control-Allow-Origin: *`, with a preflight) and fail in the RFC 6749 JSON format.
- **Scopes**: `content:read`, `content:write`, `content:publish` and `content:delete`, a separate scope
  because deletion cannot be undone; the three last imply reading. No scope reaches the contact
  messages and an unknown scope is refused. A request without scope gets `content:read`. A grant keeps
  the union of the scopes approved for its client; the consent screen marks the new ones.
- **Separation**: `AdminGuard` requires the `portfolio-admin` audience and now also refuses any token
  carrying `client_id` or `scope`; `McpTokenGuard` requires the resource as the only audience, the
  issuer, the type, the RFC 9068 claims, an age under six minutes within 30 seconds of skew and known
  scopes, and refuses `sid` and `role`. Tests prove both directions. The MCP server never forwards the
  token it receives.
- **Resource-server library** (`@vfortin/backend-auth`): `McpAuthModule.forRoot({ issuer, resource,
jwksUrl })`, `@McpScope(...)` and `mcpPrincipalOf(request)`, `hasScopes` with the hierarchy,
  `protectedResourceMetadata`, `protectedResourceMetadataUrl` and `bearerChallenge`. Without a usable
  token the guard answers 401 with `WWW-Authenticate: Bearer scope="…", resource_metadata="…"` (and
  `error="invalid_token"` when one was sent); a missing scope answers 403 `insufficient_scope` naming
  every scope the operation needs.
- **Management**: Sécurité › « Applications connectées » lists the active grants (logo, name, host,
  scopes, consent and last use); « Révoquer », confirmed in an alert dialog, revokes the grant and its
  families, and an access token already issued expires within five minutes. Locks follow one order: a
  request or a code, then its grant, then the grant's families; a refresh holds its family and reads the
  grant without a lock, and the last use is stored on the families, so a refresh never waits on a
  revocation.
- **Persistence and edge**: identity migration `0004_oauth_authorization_server` adds the clients,
  grants (one active grant per account and client, a partial unique index), pending requests, codes,
  families and refresh tokens, with their audit instants and revocation reasons. Nginx limits the
  token and revocation endpoints to 30 requests per minute per address (`oauth` zone), registration to
  the login budget, the metadata to the API budget, and protocol bodies to 8 kB.
- **Accepted limits**: clients authenticated by `private_key_jwt` and private-use redirect schemes are
  refused; the consent is all or nothing (the client may ask for fewer scopes); access tokens are not
  introspected, so a revocation takes up to five minutes to reach the resource; a dynamically
  registered client's name is unverified, hence the warning.

## D46 — Structured project period

A project's period was a free text per language (`periodLabel`), typed twice and free to drift between
French and English. The owner chose « Période structurée »: one value, from which the service writes
both labels.

- **Value**: `period: { start: { year, month }, end: { year, month } | null }` in the admin contract,
  required. Years run from 1990 to 2100, as for the timeline; `month` is 1 to 12 or `null` for the
  whole year, and the two bounds may differ in precision; `end: null` means ongoing. The end may not
  precede the start: by year, then by month when both bounds have one. The domain value is
  `ProjectPeriod` (`values/project-period`), distinct from the timeline `Period`, which requires
  months. A period has no text, so `missingFor` no longer reports it and it never blocks a publication.
- **Label**: the snapshot keeps `periodLabel` (one text per locale), so the public site and the
  snapshot contract do not change. The content presenter writes it with `projectPeriodLabel`
  (adapters-in, presentation): « 2023 — 2026 » or « 2023 » for whole years, « Mars — avril 2023 » /
  « March — April 2023 » for months of one year, « Septembre 2023 — juin 2026 » across years,
  « Mars 2023 » for one month, « Depuis juillet 2026 » / « Since July 2026 » and « Depuis 2023 » while
  ongoing; an em dash between spaces, the first letter capitalized, French months in lower case. In
  one year, a whole-year bound beside a month reads as January or December. The seed's labels come
  out byte-identical, and so does the committed snapshot.
- **Migration**: 0010 adds a nullable `period` jsonb column, 0011 (custom) writes it from the French
  label, 0012 makes it required and drops `period_label`. The conversion reads the label case- and
  accent-insensitively, splits it on a dash, and takes from each side its first four-digit year and
  French month name; a start without a year borrows the end's (the year before when its month comes
  later), a label without an end is a single month or year, « Depuis » or an end reading
  « aujourd'hui », « présent » or « en cours » makes it ongoing, years are clamped to the range and
  reversed bounds swapped. A label without any year becomes ongoing from the current year, its month
  kept: its public label then changes, so such a project needs a look after the migration. 0011 only
  writes rows without a period and does nothing once the label column is gone, so it can be replayed.
  It queues no site rebuild: the labels it can parse come out unchanged, and the next content change
  rebuilds the site.
- **Editor**: « Période » leaves the localized fields for the properties panel's « Réglages », a
  required `ui-period-picker` with `precision="flexible"` (months or years), bounded from January 1990
  to December five years ahead; the API's `period.*` errors show under the picker.

## D47 — SEO dashboard

The owner wants one administration page to follow the site's search presence: Google Search Console,
Google Analytics 4, the Core Web Vitals and an internal audit of the content. This decision covers the
API, which the page will consume.

- **Endpoint**: `GET /api/content/admin/seo/dashboard?range=7d|28d|90d` (`@AdminOnly`, `no-store`,
  `28d` by default, `SeoDashboardDtoSchema`) answers the range, the refresh state and four sections. Each
  Google section has a `status`: `not-configured` with the environment variables still to set
  (`missing`), `pending` before its first refresh, `ok` with `fetchedAt` and its report, or `error` with
  the failure of the last attempt (`attemptedAt`, a stable `code` and an English message that never
  carries a token or a key) and the report fetched before it, if any. A read never calls Google.
- **Sources**: ports in the content application, adapters in `adapters-out/src/lib/seo`. Search Console
  `searchAnalytics.query` (web search, final data): totals of the window and of the period before, a
  daily series with zeros for days without data, the top 20 queries and pages by clicks and the figures
  per device. GA4 Data API `runReport`: active users, sessions, views, engagement rate and engagement
  time per active user for both periods, a daily series, the top 20 pages, sessions by default channel
  group and the top 10 countries. PageSpeed Insights v5 `runPagespeed` (performance category) for each
  key URL on mobile and desktop: CrUX field LCP, INP and CLS (75th percentile and category, `url` or
  `origin` scope, `null` without data) and the Lighthouse score with lab LCP, CLS and TBT. Windows end
  three days back for Search Console (its final figures arrive two to three days late) and one day back
  for GA4. The adapters use plain `fetch` (30 s per request, 90 s per PageSpeed run);
  `google-auth-library` (pinned 11.3.1) only signs the service account assertion and caches the access
  token (`webmasters.readonly`, `analytics.readonly`); the large `googleapis` package is not used. A
  reader sends the six requests of a window concurrently and the ranges one after the other, within
  GA4's ten concurrent requests per property.
- **Configuration** (content-service, every source optional): `SEO_GOOGLE_CREDENTIALS_PATH`, a Docker
  secret file read by the token adapter on the first refresh only, never at startup, so a missing or
  empty file only fails the Google sections; `SEO_SEARCH_CONSOLE_PROPERTY` (`sc-domain:…` or a URL
  prefix); `SEO_GA4_PROPERTY_ID` (numeric); `SEO_PAGESPEED_API_KEY` (from the secret
  `SEO_PAGESPEED_API_KEY_FILE`); `SEO_WEB_VITALS_URLS` (comma-separated `https` URLs, by default the
  French and English home pages and the first published project, featured ones first) and
  `SEO_SITE_ORIGIN`.
- **Cache**: migration `0013_seo_dashboard` adds `content.seo_reports`, one row per source and range
  (`all` for the Web Vitals) with the last report as jsonb, its time, the last failure and the time of
  the last attempt, and the singleton `content.seo_refresh` (start and end of the last refresh). A
  failure keeps the report fetched before it. A refresh is claimed by one conditional upsert that only
  succeeds when no refresh started in the last 10 minutes, which serializes the daily job and the manual
  requests, several instances included.
- **Refresh**: `SeoDashboardJobs` runs daily at 05:30 server time. `POST
/api/content/admin/seo/dashboard/refresh` (`@AdminOnly`) answers 202 `{ startedAt, nextAllowedAt }`
  and runs in the background, since Google takes longer than the edge's 30-second proxy timeout; the
  page polls the dashboard until `refresh.running` is false. Within 10 minutes of the previous start it
  answers 429 `content.seo-refresh-too-soon` with `Retry-After` (an HTTP date) and the same time in
  `details[0]`. A failed source is stored, logged by code only, and never stops the others.
- **Audit** (domain `auditProjectSeo`, computed on every read): for each published project and locale,
  the search title and description the page emits (custom, or the D42 fallbacks) measured against 30 to
  70 and 70 to 170 characters (`search-title-*`, `search-description-*`: `missing` is info, `too-short`
  and `too-long` warnings), the keywords (`keywords-missing`: info when the technologies stand in, a
  warning without any), the cover (`cover-missing` warning, `cover-alt-missing` error), figures without
  alternative text (`image-alt-missing` error, with their count) and untranslated English fields
  (`translation-missing` error); then the sitemap the next build writes (static pages and published
  projects, one `<url>` per locale, as `generate-seo-files.mjs`) and the totals per severity.
- **Edge and privacy**: nothing public changes in Nginx (the API is under `/api/content/admin/`);
  content-service reaches Google over HTTPS through the `proxy` network. The cache holds aggregated
  reports only, no personal data.

## D48 — Audience measurement and consent

GA4 now measures the public site, so the site asks for consent first (GDPR, CNIL guidelines and
recommendation of September 2020).

- **Setting**: the measurement id is a public build-time value,
  `apps/web/src/environments/audience-measurement.ts`, passed to `provideWebShell`. Empty or not a
  `G-…` id, the site shows no banner and no « Gérer les cookies », and no Google code runs.
- **Placement**: the consent service, the GA4 loader and the banner live in the web shell
  (`src/lib/consent`, `src/lib/google-analytics`, `layout/site-layout/components/consent-banner`): like
  the theme, they are site-wide chrome and browser infrastructure that belong to no context and are
  mounted by the public layout; a new library would need its own scope for a single purpose. The legal
  feature, which renders the privacy policy, declares a `COOKIE_PREFERENCES` port that the shell binds to
  the consent service on the legal routes (the D44 pattern): the privacy page offers « Gérer les
  cookies » without reading the shell.
- **Choice**: the first-party `localStorage` key `cookie-consent` holds `{ version: 1, analytics,
decidedAt }` and is never sent to a server. A record six calendar months old (or of another version) is
  removed and asked again, and the `_ga*` cookies an expired acceptance left are deleted. It is read
  after hydration only, so every visitor gets the same prerendered HTML. Without a choice nothing is
  measured, and the banner stays.
- **Banner**: an `@defer (when consent.active())` block of the site layout, without placeholder and
  placed first after the skip link: it renders nothing on the server and is only loaded (a lazy chunk of
  about 8 kB, plus the catalogue dialog and switch) when a choice is needed or « Gérer les cookies » is
  used. A fixed, non-modal region labelled « Cookies » (no layout shift): a short text, the privacy policy
  link, « Tout refuser » and « Tout accepter » with the same variant and size, and « Personnaliser »,
  which opens a modal `ui` dialog (focus trapped, then restored) with one purpose, « Mesure d'audience
  (Google Analytics) », off unless accepted. When a choice removes the control that had focus, focus
  moves to `main#content` (`tabindex="-1"`). Withdrawal: « Gérer les cookies » in the footer, in the
  error pages' band and on the privacy page.
- **GA4**: nothing of Google exists before consent. On acceptance the bundle queues the Consent Mode v2
  defaults (`ad_storage`, `ad_user_data`, `ad_personalization` and `analytics_storage` denied), grants
  `analytics_storage` alone, configures the property (`send_page_view: false`, `cookie_expires` 13 months
  of 30 days, `cookie_update: false` so that visits do not extend it, no Google signals or ad
  personalization) and appends `https://www.googletagmanager.com/gtag/js?id=…` as a script element: no
  inline script. Page views follow router navigations, after the render that writes the title, with the
  browser location (the `/en` prefix included), once per path and query (an anchor is not a view), never
  under `/admin`. On withdrawal: `analytics_storage` denied, `ga-disable-<id>` set, `_ga*` cookies expired
  on the host and its parent domains. The web stream's enhanced measurement « Page changes based on
  browser history events » must be off, or SPA views count twice.
- **CSP** (both Nginx copies, D20): `script-src` gains `https://www.googletagmanager.com`; `img-src` and
  `connect-src` gain `https://*.google-analytics.com https://*.analytics.google.com
https://*.googletagmanager.com`. Nothing else, and still no `'unsafe-inline'` script.
- **Privacy policy**: the seed's policy has a « Cookies et mesure d'audience » section (purpose,
  consent, 13-month cookies, 14-month retention, transfer to Google LLC under the EU–US Data Privacy
  Framework, withdrawal). The live document is owner content, updated from the « Légal » page: no data
  migration overrides it.
- **Browser tests** (D25 revision): the standalone suite runs on `web:build:e2e` (target
  `web:e2e-site`, written to `dist/apps/web-e2e-site`), the production configuration with
  `audience-measurement.e2e.ts` (placeholder id `G-E2ETEST000`), so the banner and the loader are
  exercised whatever the committed id; Playwright answers every Google host itself. Every spec starts
  with a stored refusal (`storageState`, `playwright.config.mts`); `consent.spec.ts` starts empty. The
  production build is still built and budget-checked by `web:build`.
- **Budget** (D31): with the consent service and the loader in the initial bundle and the banner lazy,
  the initial total measured on 2026-11-04 is 670.99 kB raw (169.19 kB transferred), under the 700 kB
  warning.

## D49 — Content MCP resource

content-service serves `/api/content/mcp` through the official TypeScript MCP SDK v1 Streamable HTTP
transport in stateless JSON response mode. Each request has its own server and transport; there is no
shared authenticated session, SSE stream, background subscription or token forwarding. The optional
`ContentModule.register({ mcp })` configuration installs the resource, and the service app supplies its
issuer and JWKS from `AUTH_ISSUER` and `AUTH_JWKS_URL`. Its resource is that issuer's origin followed by
`/api/content/mcp`, matching identity-service's default resource (D45).

- **Discovery and authorization**: the public RFC 9728 document names that resource and the D45
  authorization server. Every transport request verifies a resource token. Initial authentication
  requires `content:read`; write, publish and delete scopes imply reading. Each tool call checks its
  own required scopes before execution, with HTTP 403 and the OAuth `insufficient_scope` challenge
  for a missing permission. Invalid origins are refused against the configured resource origin.
- **Tools**: `list_projects`, `get_project`, `revise_project`, `publish_project`, `unpublish_project`,
  `list_timeline`, `get_timeline_entry`, `create_timeline_entry`, `revise_timeline_entry`,
  `reorder_timeline`, `delete_timeline_entry`, `get_profile`, `revise_profile`, `get_legal_document`
  and `revise_legal_document`. Queries need reading; project revisions need writing and, when the
  project is already published, publishing as well: revisions preserve its publication state and
  queue a rebuild. Project publication and unpublication need publishing. Timeline, profile and legal
  edits need both writing and publishing, since those existing use cases immediately change public content. Timeline deletion
  needs both deleting and publishing. No contact inbox, upload, SEO provider or arbitrary network/file
  access is exposed.
- **Consistency**: tool inputs reuse the existing content contracts, presenters and application use
  cases. Revisions, publication, unpublication, deletion and reordering require `expectedVersion`;
  stale versions fail without overwriting newer changes. Existing transactional outbox behavior stays
  responsible for site rebuild requests. Draft-only write permission is bound to the exact version
  observed during authorization, so guessing a future version cannot bypass publication consent during
  a concurrent publication. Tool descriptions identify immediately public mutations.
- **Errors and edge**: protocol errors remain JSON-RPC; known application failures become safe tool
  errors and unexpected failures are redacted. Nginx gives the exact MCP endpoint the same 1100 kB
  ceiling as rich project/legal administration, above the service's 1 MB JSON ceiling. Stateless JSON
  responses use the ordinary proxy configuration.
- **Client access**: clients register and obtain consent through D45. The owner can revoke them from
  Security / Connected applications; refreshes stop immediately and issued access tokens expire in
  five minutes. MCP availability does not grant permission for an assistant to publish content.
