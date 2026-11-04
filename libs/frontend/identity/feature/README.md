# Identity feature

## Purpose

`identity-web-feature` owns the login workflow under `/admin/login`, the administration
admission guard, the security page under `/admin/security` and the consent page of the OAuth
authorization server for MCP clients under `/admin/oauth/authorize` (D45). The login presents credentials, then
the one-time code only when the account enabled it and the browser is not trusted; it coordinates
route-scoped flow state and performs validated post-login navigation. The security page enables the
optional second factor (password, QR code or key, code) and disables it (password and code), and
lists the connected MCP applications with their revocation. The consent page reviews an
authorization request and shows the client, its redirect host and the requested scopes in plain
words with « Refuser » and « Autoriser » ("Deny" and "Authorize" in English).

## Public entry points

| Entry point                     | Consumers   |
| ------------------------------- | ----------- |
| `@vfortin/identity-web-feature` | `web-shell` |

The root publishes `IDENTITY_LOGIN_ROUTES`, `IDENTITY_SECURITY_ROUTES`, `IDENTITY_OAUTH_ROUTES`,
`adminGuard` and `LOGIN_PATH`. Pages and forms are private; consumers mount the owner routes instead of exporting or
instantiating a page.

## Provider scope

The owner routes load their pages lazily; `uqr` (QR rendering) is imported only by the security page
chunk. Login-flow state, `TwoFactorStore` and `OAuthConsentStore` are page-scoped and reset when the
page ends; `ConnectedApplicationsStore` belongs to its security-page section; session
authority remains root-scoped in data access. The guard can refresh authority but does not own its
implementation.

## Invariants

- Forms own typed Signal Form values and emit intent; the page coordinates navigation and flow.
- Email syntax, required credentials and six-digit TOTP are validated locally.
- A password-only account enters the administration from the first step.
- The pending secret exists only in the security page while its dialog is open; it is never stored,
  logged, put in a URL or web storage. The QR code is an Angular SVG template, never `innerHTML`.
- Wrong passwords and codes stay on their field until edited; other failures are toasts.
- Failures remain visible without exposing whether an account exists.
- Returning from code to credentials cannot preserve obsolete pending/error state.
- Named call states prevent duplicate commands while pending.
- Post-login redirects stay within the allowed local administration destination.
- The consent page forwards only the authorization parameters, follows a returned redirect only when
  it is `https` or loopback HTTP (`location.assign`, never a form post), and never runs framed.
  It always asks: a previous consent never authorizes silently. Unverified (dynamically registered)
  clients and loopback redirects carry a warning; contact messages are stated out of reach.
- The workflow is client-rendered, localized (`@@admin.login.*`, `admin.security.*`, `admin.oauth.*`,
  `admin.apps.*`, `admin.identity.*`, D18), noindex and independent of public snapshot startup.

## Validation

Run `npx nx run-many -t lint typecheck test -p identity-web-feature`, then
`npx nx run architecture:test`. Tests prove both login steps, the password-only entry, validation,
pending/failure feedback, guarded navigation, the enable/disable dialogs, the consent review,
decisions and refused redirects, and the connected-application list and revocation. Real cookies and TOTP
belong to stack acceptance. See [testing](../../../../docs/workspace/testing.md), decisions D17,
D18 and D45.
