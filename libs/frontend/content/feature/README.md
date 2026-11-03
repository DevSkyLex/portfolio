# Public content feature

## Purpose

`content-web-feature` owns public hero, projects, journey, skills and about composition, plus the
`/projects/:slug` detail workflow. It connects the public content projection to presentation and owns
project navigation, metadata and route validity.

## Public entry points

| Entry point                    | Consumers   |
| ------------------------------ | ----------- |
| `@vfortin/content-web-feature` | `web-shell` |

The root publishes `CONTENT_ROUTES`, `HeroSectionComponent` and `ContentSectionsComponent` for shell
composition. Individual pages, local sections and helpers remain private.

## Provider scope

The shell mounts the owner routes beneath its public route. The project page is lazy and reads the
prepared application-scoped public projection. Section composition does not create administration
stores or issue live content API queries.

## Invariants

- An unknown project has an explicit not-found outcome and coherent metadata, not an empty detail view.
- Pages orchestrate route inputs, metadata and navigation; children receive display models.
- French source copy has explicit localization IDs and English translations.
- Public content and administration retain separate entries even when both concern projects.
- Browser subscriptions and listeners are disposed with their owning component.

## Validation

Run `npx nx run-many -t lint typecheck test -p content-web-feature`, then
`npx nx run architecture:test` and `npx nx build web`. Route/component tests cover identity, missing
projects and section composition. Built-site tests cover localized navigation and direct requests.
See [boundaries](../../../../docs/architecture/boundaries.md), decisions D7, D10 and D32.
