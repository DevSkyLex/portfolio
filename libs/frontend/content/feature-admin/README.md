# Project administration feature

## Purpose

`content-web-feature-admin` owns the project list and bilingual editor under `/admin/projects`. Pages
coordinate page-scoped stores, routing and confirmations; dataviews render collections, and forms own
validated editor values and emit submission intent.

## Public entry points

| Entry point                          | Consumers   |
| ------------------------------------ | ----------- |
| `@vfortin/content-web-feature-admin` | `web-shell` |

The root publishes `ADMIN_CONTENT_ROUTES` only. Pages, forms, dataviews, search/grouping helpers and
editor models stay internal. The shell palette consumes the content owner's navigation port.

## Provider scope

The authenticated shell mounts the owner routes lazily. Each page provides `AdminProjectsStore`.
The editor reacts to its bound route ID and invalidates obsolete reads; page scope alone does not
make a reused route input static.

## Invariants

- Navigation from A to B clears A's projection and cannot apply an obsolete answer to B.
- Dirty and pending edits have an explicit leave decision for route changes and browser exit.
- Signal Form rules represent browser-safe contract bounds and map typed server errors to fields.
- Form values, labels and rules are feature-owned; data access converts them to requests.
- Writes retain the observed version; conflicts offer deliberate reload instead of silent overwrite.
- Publication changes are deliberate and destructive actions use accessible catalogue confirmation.
- Administration is French only and client-rendered (D18).

## Validation

Run `npx nx run-many -t lint typecheck test -p content-web-feature-admin`, then
`npx nx run architecture:test`. Tests cover reused route IDs, out-of-order reads, accepted/declined leave
decisions, bounds, server field errors and conflicts. Authenticated stack tests qualify HTTP/cookies.
See [testing](../../../../docs/workspace/testing.md), decisions D18, D19, D36 and D37.
