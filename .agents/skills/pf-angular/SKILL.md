---
name: pf-angular
description: 'Build and review Angular 22 features in this Nx portfolio: Signal Forms, typed DI, NgRx SignalStore ownership, Tailwind token styling, Vitest tests and public prerender/hydration. Use for frontend implementation and Angular API questions; use Nx skills for project discovery, generation and task execution.'
---

# Angular in the portfolio

Read the owner README and [boundaries](../../../docs/architecture/boundaries.md) before editing.
[Decisions](../../../docs/architecture/decisions.md), the
[UI catalogue](../../../libs/frontend/ui/README.md) and [testing](../../../docs/workspace/testing.md)
define the project contract. Inspect installed versions rather than upgrading dependencies as part of
an ordinary feature. The current families are Angular 22, NgRx 22, Tailwind 4 and Vitest 5.

## Research and commands

For framework APIs, load the relevant part of the official
[Angular skill](../angular-developer/SKILL.md). Its generic Angular CLI commands and architecture
examples are adapted here: discovery, generators, builds and tests use the Nx skills and local `npx nx`
targets. Do not add `angular.json`, run `ng new` or introduce a parallel CLI workspace.

The `angular` MCP exposes documentation tools in read-only mode. Use `get_best_practices` without a
workspace argument in this Nx checkout, and pass the installed Angular major (currently `22`) to
`search_documentation`. Angular's `list_projects` reads `angular.json`; it does not replace Nx discovery.
The server pin and smoke-check scope are documented in [technology tooling](../../../docs/workspace/technology-tooling.md).
If the MCP is unavailable, use Context7 or the official versioned Angular documentation and report the
connection limit. Configuration alone is not proof that this session loaded a server.

## Implementation decisions

- Keep owner-published ports and adapters at cross-project boundaries. `@vfortin/*` is public;
  `@internal/<project>/*` is private to its Nx project, including internal imports.
- Use standalone components, explicit OnPush, signal `input()`/`output()` and typed DI, including
  `inject<Service>(Service)`. Keep explicit public returns/member types without casts that conceal an
  unsafe boundary. Follow the existing English docblocks/regions and spacing.
- Pages orchestrate owner workflows; presentational controls render values, validate and emit events.
  The shell composes owner ports. Do not replace `@vfortin/ui` or introduce generic feature widgets,
  NgModules, a second design system, or `@angular/aria` as part of unrelated component work.
- Signal Forms own browser form values and limits; map typed server field paths until the corresponding
  submitted value changes. See the actual
  [editor form](../../../libs/frontend/content/feature-admin/src/lib/ui/forms/project-form/project-form.component.ts).
- NgRx SignalStore owns workflow state with named `CallState` fields and a deliberate page/route/root
  provider lifetime. Fence obsolete reads and request-origin authentication side effects; await accepted
  writes rather than resetting them through reads. See the
  [project store](../../../libs/frontend/content/data-access/src/lib/admin/state/admin-projects/admin-projects.store.ts) and
  [session authority](../../../libs/frontend/identity/data-access/src/lib/services/session-authority/session-authority.service.ts).
- Use literal Tailwind v4 classes backed by Orbite tokens; generic variants belong in the catalogue.
  Public UI remains French source with explicit message ids and English targets; admin copy is French.
- Public routes prerender from a validated snapshot; hydration consumes active-locale `TransferState`.
  Admin is CSR and must start without public content. Keep browser globals and mutable IDs scoped to
  the render/injector, release listeners, and preserve static fallbacks for failed decorative imports.
  Route-bound inputs can change without recreating the page; dirty/pending navigation is an owner contract.

## Prove the changed boundary

Use the owner lint and typecheck targets (the latter includes spec semantic checking), plus meaningful
Vitest/Analog tests. Prefer real router transitions for route reuse and deferred responses for races;
HTTP tests own transport, stores own state transitions. Do not replace such assertions with private
method or implementation-shape checks. Public template/routing changes also need `npx nx build web`.
Use the maintained Playwright targets for browser/hydration or real-stack integration behavior;
[acceptance scope](../../../apps/web-e2e/README.md) explains isolation and dedicated ports.
