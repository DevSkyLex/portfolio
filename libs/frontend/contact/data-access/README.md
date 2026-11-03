# Contact data access

## Purpose

`contact-web-data-access` owns contact submission and inbox transport, adapters, normalized state and
the unread-summary capability. It preserves privacy and observed-version contracts without making the
shell responsible for message queries.

## Public entry points

| Entry point                                | Consumers                                          |
| ------------------------------------------ | -------------------------------------------------- |
| `@vfortin/contact-web-data-access`         | `contact-web-feature`, `contact-web-feature-admin` |
| `@vfortin/contact-web-data-access/links`   | `web-shell`                                        |
| `@vfortin/contact-web-data-access/summary` | `web-shell`                                        |

The root exposes feature APIs, view models, adapters and stores. `/links` contains public contact
details without loading stores. `/summary` publishes `AdminInboxSummaryPort` and its owner provider,
rather than concrete inbox transport to the layout.

## Provider scope

The contact section provides `ContactFormStore` and the inbox page provides `AdminInboxStore`.
The protected administration capability shares owner unread-summary state across layout and mutations.
HTTP services remain stateless root services.

## Invariants

- Submission is adapted explicitly to same-origin `/api/contact` and preserves the unvalidated honeypot.
- Stores expose normalized call/field errors; raw transport failures do not reach templates.
- Inbox reads discard obsolete answers; writes retain `If-Match` and expose conflicts.
- Successful read/archive/delete invalidates the owner summary immediately.
- A failed count remains unknown/failed rather than becoming zero unread.
- Presentation models are independent of DTO declarations.
- Public `/links` never re-exports inbox/authentication/schema-validation implementations.

## Validation

Run `npx nx run-many -t lint typecheck test -p contact-web-data-access`, then
`npx nx run architecture:test`. Tests cover request mapping, HTTP versions, stale lists, failures,
pagination and summary invalidation. See [testing](../../../../docs/workspace/testing.md), decisions
D15, D18 and D28.
