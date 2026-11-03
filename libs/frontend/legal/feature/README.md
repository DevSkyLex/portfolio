# Legal content feature

## Purpose

`legal-web-feature` owns the public legal notice and privacy policy, with a shared article component.
Its `/legal-notice` and `/privacy` routes are localized by the French and English site builds.

## Public entry points

| Entry point                  | Consumers   |
| ---------------------------- | ----------- |
| `@vfortin/legal-web-feature` | `web-shell` |

The root publishes `LEGAL_ROUTES`. Pages and article presentation stay private; the shell mounts the
owner routes within its public layout.

## Provider scope

Pages are lazy standalone OnPush components with no mutable business store or data-access service.
They participate in public prerendering and the shell's localized route policy.

## Invariants

- Legal copy has explicit localization IDs and English targets.
- Titles/headings identify the page purpose, and legal routes never require authentication.
- Shared visual controls come from `@vfortin/ui`; legal content is not infrastructure for other contexts.
- No user data, session authority or backend transport is serialized by the feature.

## Validation

Run `npx nx run-many -t lint typecheck test -p legal-web-feature`, then
`npx nx run architecture:test` and `npx nx build web`. Component tests cover semantics/metadata;
built-site browser tests cover localized navigation and accessibility.
See [testing](../../../../docs/workspace/testing.md), decisions D7 and D18.
