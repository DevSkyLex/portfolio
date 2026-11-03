# Orbite design tokens

## Purpose

`design-tokens` owns the Orbite vocabulary: colours, typography, spacing, motion, surfaces and
interactive/status states. `src/theme.css` is the stylesheet source; the TypeScript entry supplies
typed token names and a browser token reader.

## Public entry points

| Entry point              | Consumers |
| ------------------------ | --------- |
| `@vfortin/design-tokens` | `web`     |

The application stylesheet includes the theme. The TypeScript entry is approved for application-level
token integration; it exposes no business presentation or mutable state.

## Provider scope

There are no Angular providers. CSS variables follow document theme scope. `readToken()` reads computed
browser styles and requires an available rendered element.

## Invariants

- Controls use token utilities rather than raw colours or Tailwind palettes.
- Both themes share one interaction scale (D35); status families are distinct from brand accent (D37).
- No feature, HTTP service or visual component is imported.
- Token meaning changes are reviewed across both themes and catalogue control states.

## Validation

Run `npx nx run-many -t lint typecheck test -p design-tokens` and `npx nx run architecture:test`.
Tests cover typed helpers; architecture design tests enforce frontend token/palette use. Visual
changes require browser checks in both themes.
See [decisions](../../../docs/architecture/decisions.md), D35 and D37.
