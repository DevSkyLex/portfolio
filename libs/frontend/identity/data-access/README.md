# Identity data access

## Purpose

`identity-web-data-access` owns browser session authority, authentication transport and credentials/TOTP
flow state. Narrow HTTP and administration-session contracts keep shell composition independent of
the concrete store implementation.

## Public entry points

| Entry point                                 | Consumers              |
| ------------------------------------------- | ---------------------- |
| `@vfortin/identity-web-data-access`         | `identity-web-feature` |
| `@vfortin/identity-web-data-access/http`    | `web-shell`            |
| `@vfortin/identity-web-data-access/session` | `web-shell`            |

The root exposes `AuthApiService`, `SessionStore`, `LoginFlowStore` and feature-facing models.
`/http` exposes admin-request authentication without eagerly loading session implementation.
`/session` publishes `AdminSessionPort` and `provideAdminSession()` for protected shell composition.

## Provider scope

Session authority is root-scoped because it survives navigation. Named login/challenge call states
are route-scoped rather than permanent session state. The protected admin route binds the session
port to its owner; the layout does not create another session implementation.

## Invariants

- Access tokens remain in memory; refresh cookies never enter web storage, HTML or TransferState.
- Refreshes coalesce within a tab and use origin locking where available.
- The captured session generation must remain current before refresh, clear or retry affects authority.
- Late results cannot clear or populate a replacement session.
- Logout has deliberate local signed-out behavior and visible failure/retry; navigation is not proof
  of server-side revocation.
- Only the admin API boundary receives bearer authentication; other requests remain unmodified.
- Feature consumers receive normalized failures and named call states, not raw HTTP state.

## Validation

Run `npx nx run-many -t lint typecheck test -p identity-web-data-access`, then
`npx nx run architecture:test`. Tests cover interceptor/store generation races, refresh coalescing,
failed logout and login-flow state. Stack tests qualify real cookies/TOTP.
See [testing](../../../../docs/workspace/testing.md), decisions D17, D18 and D27.
