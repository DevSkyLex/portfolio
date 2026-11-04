# Identity data access

## Purpose

`identity-web-data-access` owns browser session authority, authentication transport, credentials/TOTP
flow state, the management of the optional second factor (status, enrollment, removal) and the
administrator side of the OAuth authorization server for MCP clients (D45): the consent review and
decision, and the connected applications with their revocation. Narrow
HTTP and administration-session contracts keep shell composition independent of the concrete store
implementation.

## Public entry points

| Entry point                                 | Consumers              |
| ------------------------------------------- | ---------------------- |
| `@vfortin/identity-web-data-access`         | `identity-web-feature` |
| `@vfortin/identity-web-data-access/http`    | `web-shell`            |
| `@vfortin/identity-web-data-access/session` | `web-shell`            |

The root exposes `AuthApiService`, `SessionStore`, `LoginFlowStore`, `TwoFactorApiService`,
`TwoFactorStore`, `OAuthConsentStore`, `ConnectedApplicationsStore` and feature-facing models.
`/http` exposes admin-request authentication without eagerly loading session implementation.
`/session` publishes `AdminSessionPort` and `provideAdminSession()` for protected shell composition.

## Provider scope

Session authority is root-scoped because it survives navigation. Named login/challenge call states
are route-scoped rather than permanent session state. `TwoFactorStore` is provided by the security page;
the pending secret of an enrollment is returned to that page and never enters a store.
`OAuthConsentStore` is provided by the consent page and `ConnectedApplicationsStore` by the « Applications
connectées » section; neither keeps a token, an authorization code only passes through the redirect
URL the consent store returns to its page. The protected admin route binds the session
port to its owner; the layout does not create another session implementation.

## Invariants

- Access tokens remain in memory; refresh cookies never enter web storage, HTML or TransferState.
- Refreshes coalesce within a tab and use origin locking where available.
- The captured session generation must remain current before refresh, clear or retry affects authority.
- Late results cannot clear or populate a replacement session.
- Logout has deliberate local signed-out behavior and visible failure/retry; navigation is not proof
  of server-side revocation.
- Only the admin API boundary (`/api/*/admin/*` and `/api/auth/totp*`) receives bearer
  authentication; login, the code step, refresh, logout and public requests remain unmodified. The
  OAuth consent and connected-application routes live under `/api/auth/admin/oauth/*` for that
  reason; the protocol endpoints called by MCP clients (`/api/auth/oauth/*`) are never called here.
- Second-factor refusals (422 wrong password or code, 409 state) keep the session; only a 401 after a
  failed refresh signs out.
- Feature consumers receive normalized failures and named call states, not raw HTTP state.

## Validation

Run `npx nx run-many -t lint typecheck test -p identity-web-data-access`, then
`npx nx run architecture:test`. Tests cover interceptor/store generation races, refresh coalescing,
failed logout and login-flow state; second-factor tests cover the `/api/auth/totp*` transport, the
call states and the problem-code messages; OAuth tests cover the `/api/auth/admin/oauth/*`
transport, the review and decision redirects and the revocation states. Stack tests qualify real
cookies/TOTP. See [testing](../../../../docs/workspace/testing.md), decisions D17, D18, D27 and D45.
