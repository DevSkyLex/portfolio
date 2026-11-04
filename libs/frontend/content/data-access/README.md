# Content data access

## Purpose

`content-web-data-access` owns the frontend content boundary. It adapts the active locale's build
snapshot into public display models and encapsulates administration HTTP, optimistic concurrency and
request state. Server validation and administration capabilities have narrow entries.

## Public entry points

| Entry point                                   | Consumers                          |
| --------------------------------------------- | ---------------------------------- |
| `@vfortin/content-web-data-access`            | `content-web-feature`, `web-shell` |
| `@vfortin/content-web-data-access/server`     | `web-shell`                        |
| `@vfortin/content-web-data-access/admin`      | `content-web-feature-admin`        |
| `@vfortin/content-web-data-access/navigation` | `web-shell`                        |

The root exposes public snapshot loading/provision, `loadSiteContent()`, `SiteContentService` (with the
legal documents, D44) and `SiteLinksService` (the public links for the site layout, filled once the
snapshot is read). `/server` supplies the
prerender contract validator. `/admin` exposes administration view models, editor adapters, the
article-document helpers (D40), the project and media API services and `AdminProjectsStore`, and the
timeline administration (`AdminTimelineEntry`, `TimelineEntryDraft` conversion, `AdminTimelineApiService`,
`AdminTimelineStore`, which keeps the entries most recent first), and the « Informations » and « Légal »
administration (`AdminSiteTextsApiService`, `AdminProfileStore`, `AdminLegalStore`, draft conversion), and the « Tableau de bord » SEO dashboard (D47: type-only aliases of the dashboard contract, `SEO_RANGES`, `AdminSeoDashboardApiService`, `AdminSeoDashboardStore`, which polls a running refresh every 3 s and stops with the page). `/navigation` publishes only `AdminProjectNavigationPort`, its small item
model and provider for shell composition; the shell does not import administration DTOs/query services.

## Provider scope

`SiteContentService` is application-scoped; public routes await `loadSiteContent()` before its consumers
activate. Readiness is lazy and shared per locale, and prerender parameter discovery awaits it explicitly.
Administration pages provide their own stores. The protected administration route binds the navigation
capability. HTTP services own transport, not view state.

## Invariants

- Public snapshots are read-only for a build and adapted to `content-web-model` for the active locale.
- Missing public content must not prevent administration startup or defeat prerendered readability.
- Runtime schema validation stays behind `/server` and outside browser entries (D10).
- Replaceable reads discard obsolete responses; writes retain observed `If-Match` versions.
- A 412 remains a visible conflict, never an automatic overwrite.
- Timeline entry writes send the entry version; a move sends the list version of its kind, so a
  creation, deletion or move made elsewhere fails it with 412 while a text edit does not.
- Services preserve failures; stores normalize them into named load/write call states.
- The SEO dashboard store keeps the previous dashboard while another window loads, ignores obsolete
  reads and polls, and returns the API's retry time on a 429 `content.seo-refresh-too-soon`.
- Form values and rules belong to the feature; data-access adapters perform request conversion.

## Validation

Run `npx nx run-many -t lint typecheck test -p content-web-data-access`, then
`npx nx run architecture:test`. HTTP/store tests cover request mapping, stale reads, conflicts and
normalized failures; server snapshot tests reject invalid content. See
[testing](../../../../docs/workspace/testing.md) and decisions D5, D7, D10, D18 and D29.
