# Public content models

## Purpose

`content-web-model` owns the framework-independent display vocabulary of the public portfolio:
localized profile, project summaries/articles, skills and timeline entries. These models describe what
the site renders, not the content service's persistence or transport representation.

## Public entry points

| Entry point                  | Consumers                                   |
| ---------------------------- | ------------------------------------------- |
| `@vfortin/content-web-model` | `content-web-data-access`, `content-web-ui` |

The root publishes types only. Data-access adapters construct the models; content presentation
components consume them. Administration request shapes do not belong here merely because they also
concern projects.

## Provider scope

There are no Angular providers or mutable stores. Models can be consumed during prerendering and in
the browser without starting Angular or performing I/O.

## Invariants

- No framework, HTTP client, schema validator or backend implementation is imported.
- Null, empty and ordering meanings remain explicit in the types and their owning adapters.
- Changes to public display meaning are reviewed with both adapter and presentation consumers.
- External consumers use the declared public entry; private aliases stay inside this project.

## Validation

Run `npx nx typecheck content-web-model` and `npx nx run architecture:test`. This type-only library
has no separate runtime test target; adapter and component tests prove constructed/rendered values.
See [boundaries](../../../../docs/architecture/boundaries.md) and decisions D5, D7 and D10.
