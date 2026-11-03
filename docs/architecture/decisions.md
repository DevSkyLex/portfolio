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

A single account created from the command line (`identity-service`: `cli.js bootstrap-admin`), with no public sign-up. Password hashed with scrypt (Node, no native dependency; N = 2^15), TOTP code (RFC 6238, implemented with `node:crypto`, a code can only be used once), 15-minute lockout after 5 failures. A locked account responds like bad credentials (401 `identity.invalid-credentials`) so as not to reveal that an address exists.

Login has two steps. `POST /api/auth/login` checks the password; on a browser trusted by that account (trusted-device cookie, 30 days from creation, not extended by use) the session opens at once, otherwise it returns an opaque single-use challenge (5 minutes, 5 wrong codes at most, stored hashed). `POST /api/auth/login/totp` (with the `x-csrf` header) exchanges the challenge and the code for a session, and can trust the browser. A right password alone does not reset the failure counter; every wrong code counts toward the lockout; an unusable challenge answers 401 `identity.challenge-expired`.

5-minute EdDSA access JWT (`typ: at+jwt`, RFC 9068) carrying `sub`, `role`, `sid` (the session), `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`. Opaque, rotating refresh token stored hashed: "remember me" gives 30-day tokens sliding on each rotation and a persistent cookie, otherwise 12-hour tokens and a browser-session cookie; no session outlives 90 days from its login. A replayed refresh token revokes its whole family; logout revokes the family but keeps the trusted device. Over HTTPS the cookies are `__Host-portfolio_refresh` and `__Host-portfolio_device` (`HttpOnly; Secure; SameSite=Strict; Path=/`, no `Domain`); in HTTP development they keep their plain names on `Path=/api/auth`. The other services verify tokens with the JWKS (`platform/auth`, `@AdminOnly`), requiring the type, the claims above, an age under 6 minutes and at most 30 seconds of clock skew.

## D18 — Admin in French, rendered client-side

The `/admin` screens (login, projects, messages) are not translated (a single user) and are not prerendered (`RenderMode.Client`, `noindex`). They are loaded on demand; the authentication interceptor is a secondary entry point (`@vfortin/identity-web-data-access/http`) that loads the session store on the first admin call, so that the public site ships neither the store nor NgRx. Likewise, the shell reads the public contact details from `@vfortin/contact-web-data-access/links`, without the contact stores.

## D19 — Admin scope

Delivered: projects (FR/EN editing, publication, optimistic lock `If-Match` → 412, site rebuild through the outbox and `workflow_dispatch`) and inbox (read, archived, erasure). Not delivered, to add if the need is confirmed: editing the journey, skills and profile, adding and reordering projects, media upload, password change (today: a new `bootstrap-admin` on an empty database).

## D20 — Strict CSP set by Nginx

Angular's `autoCsp` is incompatible with prerendering. Critical CSS inlining (Beasties, the only inline script) is disabled: no page contains an inline script, so the fixed CSP `script-src 'self'` is enough. `style-src` keeps `'unsafe-inline'` (component styles and `style` attributes of the prerendered pages).

## D21 — Self-hosted fonts

Unbounded, Host Grotesk and Martian Mono come from `@fontsource-variable/*`, served by the site: no request to a third-party service (no IP address transfer to Google Fonts).

## D22 — Contact section hydrated as it approaches

`@defer (hydrate on viewport)` alone: the prerendered HTML stays in place and the code is loaded when the section becomes visible. Adding a client trigger (`on viewport`) replaced the prerendered section with the placeholder. Known limitation: input typed before hydration finishes may be ignored.

## D23 — Postgres: one migration role and one application role per service

Each service has its schema, owned by `<ctx>_migrator` (DDL, used only by migrations and the initial seed); the service runs as `<ctx>_app` (data reads and writes). The migration role also has `CREATE` on the database: the Drizzle migrator runs `CREATE SCHEMA IF NOT EXISTS`.

## D24 — Ansible for the server, Compose for the containers

Ansible provisions the server (hardening and Docker) and puts the files and secrets in place (Ansible Vault); the deployment steps stay in `docker/scripts/*.sh`, run by Ansible, so they can be run by hand. The existing shared Traefik owns TLS (D33). No Swarm or Kubernetes for a single server.

## D25 — E2E on the built site

The Playwright tests serve `dist/apps/web` with `apps/web-e2e/support/preview/serve-site.mjs`, which reproduces the application route contract: prerendered pages, `/admin` → `index.csr.html`, French-only `/en/admin*` redirects, admin `no-store` / `noindex` headers and real 404 responses. Node HTTP tests compare those cases at the server boundary. TLS, proxy trust, rate limiting and pre-compression remain Nginx/Compose concerns; the preview is not a complete edge simulator. The Nx SPA server returned the home page for any address and hid defects.

## D26 — A full UI catalogue, tree-shaken

`@vfortin/ui` holds a generic catalogue modelled on the Spartan UI / shadcn list (about 55 entries, built in-house on `@angular/cdk`), whether the site uses each piece or not. Its `package.json` declares `"sideEffects": false`: without it, esbuild keeps every compiled Angular class of a workspace library (their static `ɵɵdefine…` members count as side effects) and the initial bundle went from 493 kB to 903 kB. The Tailwind classes of the whole catalogue remain in `styles.css` (+52 kB raw, about +6 kB compressed), since `@source` scans the source folders, not the import graph.

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

The administration (login, sidebar shell, project list and editor, inbox) follows a dense product-tool layout in the manner of Linear rather than the public site's editorial one: Host Grotesk at 12 to 14 px instead of the display face, a 232 px sidebar with 32 px entries, a 48 px title bar per page, hairline rows grouped by status, a properties panel beside the project editor, a two-pane inbox, and keyboard use: Ctrl/Cmd+K opens a command palette (pages, projects, actions), Ctrl/Cmd+S saves a project, J/K, R and E move through, mark as read and archive messages. Destructive actions confirm in an alert dialog rather than `window.confirm`, and the sidebar displays the inbox owner's unread summary, refreshed on navigation and invalidated by message mutations. It keeps the Orbite tokens and the D35 state scale; aurora violet marks the workspace mark, while selection takes the brand accent `signal` and statuses the D37 families (unread is info). The admin stays French only and client-rendered (D18).

## D37 — Status colours, left alignment and feature folders

The palette had no status colours: `--danger` was orange, success borrowed the cyan `--signal`, unread items the aurora violet, and `--void-sunk`, the scrim and the float shadow were neutral black against a violet-tinted night. `theme.css` now defines four status families, each with a fill, an `-ink` for text (at least 4.5:1 on void, raised and an 8 % tint of itself) and an `on-` colour: **success** green (`--success`: published, saved, read, confirmed), **warning** amber (`--warning`: to complete, pending, needs attention), **danger** red (`--danger`: errors, refusals, deletions), **info** the aurora blue (`--info`: information, unread). `--signal` stays the brand accent (focus, selection, the planet lens) and is never a status; the aurora hues stay decorative. The night is tinted everywhere (`--void-sunk` `#020207`) and the ink slightly softened (`#eeedfb` dark, `#121222` light) to take the glare off 18:1 text.

Statuses go through the catalogue rather than hand-made markup: `uiAlert` (`info`, `success`, `warning`, `danger`), `uiBadge` (same variants, `dot` for a status dot), `uiBtn variant="danger"` for a destructive confirmation, the toaster's `success` / `warning` / `info` / `error`, and `ConfirmDialogService` instead of `window.confirm`. Icons take the ink of their meaning (a check in success, a trash in danger); a destructive toolbar action keeps neutral text with a danger icon. A disabled filled button rests on the control surface (`line-field`, `star-faint` text) instead of half-transparent ink, which read as a neutral grey; a single-choice filter is a `uiToggleGroup` with `required`, which never releases its pressed option. `tools/architecture/src/design.spec.ts` enforces the rules on every frontend source: colour utilities name tokens only (no Tailwind palette, neutral greys included), no raw colour in a class or a stylesheet, and `text-center` only in the calendar and the data-table column alignment. ng-icons styles its host in `@layer ng-icon`, declared first in `apps/web/src/styles.css` so that `text-*` utilities colour icons.

Text reads left-aligned: headings, empty states (`uiEmpty`), forms and dialogs start on the left; centring is kept for single figures (the error page code) and the mockup's centred compositions of the public site.

Frontend features follow the dentalstock folder template (`ARCHITECTURE.md` §8.3, §9.2, §10): pages orchestrate stores and navigation; forms live in `ui/forms/<name>-form/` with their local values in `models/`, own their Signal Form and emit `submitted`; lists and cards use `ui/dataviews/<name>/`, other compositions use `ui/components/<name>/`, and home sections use `ui/sections/<name>-section/`. Each component keeps its template and optional `components/<child>/`, `models/`, `constants/`, `options/`, `utils/<helper>/` and `testing/` beneath its unit folder. Feature-level models group related declarations in `models/<concept>/`; constants and options stay flat within their owner. Services and stores have named concern/slice folders, as do HTTP units and utilities. Production role-suffixed units are checked by `unitFolderViolations`; matching catalogue entry roots and route/bootstrap/composition/public entries remain valid. This is a source layout convention within existing Nx owners, not a new project split. One declaration per file remains the feature rule, with no interface or constant beside a component class. The portfolio keeps its own `Component` class suffix and `<prefix>-` selectors (rule `components.md`).

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
