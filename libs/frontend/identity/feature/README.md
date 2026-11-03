# Identity feature

## Purpose

`identity-web-feature` owns the French login workflow under `/admin/login` and the administration
admission guard. It presents credentials followed by TOTP, coordinates route-scoped flow state and
performs validated post-login navigation.

## Public entry points

| Entry point                     | Consumers   |
| ------------------------------- | ----------- |
| `@vfortin/identity-web-feature` | `web-shell` |

The root publishes `IDENTITY_LOGIN_ROUTES`, `adminGuard` and `LOGIN_PATH`. Login pages/forms are private;
consumers mount the owner route instead of exporting or instantiating the page.

## Provider scope

The owner route loads its page lazily. Login-flow state is page/route-scoped and resets when the
workflow ends; session authority remains root-scoped in data access. The guard can refresh authority
but does not own its implementation.

## Invariants

- Forms own typed Signal Form values and emit intent; the page coordinates navigation and flow.
- Email syntax, required credentials and six-digit TOTP are validated locally.
- Failures remain visible without exposing whether an account exists.
- Returning from code to credentials cannot preserve obsolete pending/error state.
- Named call states prevent duplicate commands while pending.
- Post-login redirects stay within the allowed local administration destination.
- The workflow is client-rendered, French only, noindex and independent of public snapshot startup.

## Validation

Run `npx nx run-many -t lint typecheck test -p identity-web-feature`, then
`npx nx run architecture:test`. Tests prove both steps, validation, pending/failure feedback and guarded
navigation. Real cookies and TOTP belong to stack acceptance.
See [testing](../../../../docs/workspace/testing.md), decisions D17 and D18.
