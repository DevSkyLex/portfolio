# Web shell and application composition

## Purpose

`web-shell` composes the public site and protected administration. It owns root routing, layouts,
theme/locale navigation, error pages and application-wide browser/server providers. Business
workflows remain with their features even when their results appear in layouts or palettes.

## Public entry points

| Entry point                 | Consumers |
| --------------------------- | --------- |
| `@vfortin/web-shell`        | `web`     |
| `@vfortin/web-shell/server` | `web`     |

The root publishes `provideWebShell` and its options. `/server` publishes `provideWebShellServer` with
rendering policy and prerender validation; the browser entry must not re-export it.

## Provider scope

The app installs root shell providers. Public routes prepare snapshots before content consumers
activate; admin startup is independent of that dependency. Protected admin routes bind identity
session, content navigation and inbox summary capabilities supplied by the owning contexts. Layouts
inject these ports rather than concrete business stores, services or DTOs.

## Invariants

- French `/` and English `/en/` serve public content; admin remains French, CSR and noindex.
- Root initialization is reserved for requirements shared by the whole application.
- Public content failure preserves prerendered readability and does not prevent login.
- Owner route trees/pages are lazy; login does not load protected workflows.
- Failed count/search is unknown/failed, never a successful empty result.
- Inbox changes invalidate owner summary without waiting for unrelated navigation.
- Theme, router and browser listeners are cleaned up with their owner.
- Server-only and heavy owner implementations remain outside narrow public entries.

## Validation

Run `npx nx run-many -t lint typecheck test -p web-shell`, `npx nx run architecture:test` and
`npx nx build web`. Tests cover provider composition, failed content loading, independent admin,
port-based layout behavior, routes and theme disposal. Built-site/stack browser tests qualify hydration,
routing, keyboard use and authenticated workflows.
See [boundaries](../../../docs/architecture/boundaries.md), [testing](../../../docs/workspace/testing.md)
and decisions D7, D10, D18, D25 and D32.
