# Public content presentation

## Purpose

`content-web-ui` owns content-specific presentation shared by public sections and project pages:
project cards, the article document renderer (D40), technology tags, skill columns, timeline scenes, the
ASCII planet and reading effects.
It receives display models; pages own navigation and data access.

## Public entry points

| Entry point               | Consumers                                          |
| ------------------------- | -------------------------------------------------- |
| `@vfortin/content-web-ui` | `content-web-feature`, `content-web-feature-admin` |

The root exports supported content components and their presentation models/helpers;
`content-web-feature-admin` reads only `ARTICLE_TYPOGRAPHY`, so the editor shows the published look (D40). Renderer modules
and scene implementation details remain private and are loaded by their owning components.

## Provider scope

Components are standalone and OnPush with signal inputs/outputs. Render work follows component
lifetime. Generic scheduling and controls come from `@vfortin/ui`; this library has no HTTP service or
business store.

## Invariants

- Inputs use `content-web-model`, never service DTOs, stores or backend types.
- Browser-only canvas work starts after rendering and releases its resources on destruction.
- Reduced motion, failed imports and unavailable contexts retain readable static presentation.
- Geometry and timing calculations remain separate from canvas/WebGL effects.
- Literal Tailwind classes use Orbite tokens; domain-agnostic controls belong to `ui`.

## Validation

Run `npx nx run-many -t lint typecheck test -p content-web-ui`, then
`npx nx run architecture:test`. Unit tests cover scene mathematics and component lifecycle; browser
tests qualify actual canvas, reduced motion and hydration. Renderer coverage exceptions are explicit
in [testing](../../../../docs/workspace/testing.md). See decisions D26 and D32.
