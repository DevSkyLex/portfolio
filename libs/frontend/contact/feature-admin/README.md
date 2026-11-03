# Inbox administration feature

## Purpose

`contact-web-feature-admin` owns the French inbox under `/admin/messages`: filtering, pagination,
selection, read/archive transitions, erasure confirmations and keyboard actions. The page coordinates
an owner store; dataviews and detail components render values and emit intent.

## Public entry points

| Entry point                          | Consumers   |
| ------------------------------------ | ----------- |
| `@vfortin/contact-web-feature-admin` | `web-shell` |

The root publishes `ADMIN_CONTACT_ROUTES` only. The inbox page, status presentation and component
details remain private; the layout consumes the data owner's separate summary port.

## Provider scope

The authenticated shell mounts the owner route tree lazily. The inbox page provides `AdminInboxStore`.
Successful mutations invalidate shared owner summary state without making the page or layout perform
duplicate unread-count queries.

## Invariants

- Filter/query changes discard obsolete answers and maintain a valid page after mutations.
- Writes preserve observed versions and make conflicts visible.
- Destructive erasure uses accessible confirmation and respects pending state.
- Message bodies render as text, never trusted HTML; transport details stay in data access.
- Keyboard actions operate on active selection and do not intercept typing in form controls.
- Pages are French only, client-rendered and excluded from the public initial feature graph.

## Validation

Run `npx nx run-many -t lint typecheck test -p contact-web-feature-admin`, then
`npx nx run architecture:test`. Component tests cover filtering, selection, keyboard intent and
confirmations. Store tests belong to data access; authenticated stack tests qualify real transitions.
See [testing](../../../../docs/workspace/testing.md), decisions D18, D19 and D36.
