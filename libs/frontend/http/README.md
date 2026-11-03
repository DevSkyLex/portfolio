# Web HTTP infrastructure

## Purpose

`web-http` owns domain-agnostic browser HTTP infrastructure: the same-origin API prefix, request
identifiers, normalized problem/field failures and the common asynchronous call-state vocabulary.
Business shapes, session authority and view workflows remain with their contexts.

## Public entry points

| Entry point         | Consumers                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `@vfortin/web-http` | `contact-web-data-access`, `content-web-data-access`, `identity-web-data-access`, `web-shell` |

The root publishes `provideApiHttp`, `requestIdInterceptor`, `API_PREFIX`, call-state constructors and
normalized error helpers/types. It is not a shortcut to business services or stores.

## Provider scope

The shell calls `provideApiHttp()` once and supplies owner interceptors. Call-state/error adapters are
pure helpers used by scoped stores. This library owns no mutable application or feature state.

## Invariants

- Only same-origin API calls receive generated request IDs, and caller IDs survive.
- Context interceptors are supplied by their owners instead of imported by this platform library.
- Unknown failures are narrowed to normalized errors before entering store call state.
- Field-error conversion preserves useful paths without exposing raw transport failures in templates.
- No business feature, backend library or visual catalogue is imported.

## Validation

Run `npx nx run-many -t lint typecheck test -p web-http` and `npx nx run architecture:test`.
Tests cover request IDs, call states and defensive problem/field-error parsing.
See [boundaries](../../../docs/architecture/boundaries.md) and [testing](../../../docs/workspace/testing.md).
