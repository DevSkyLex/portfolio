---
name: pf-nestjs
description: 'Build or review NestJS 11 controllers, jobs, providers and composition modules in this Nx workspace. Use for transport validation, dependency wiring, lifecycle or HTTP integration; domain and application behavior remain framework-free.'
---

# NestJS adapters and composition

Read the owner's README and the [layer contract](../../../docs/architecture/boundaries.md) before choosing
where a change belongs. Check the installed NestJS version before using current documentation; framework
examples do not override this repository's hexagonal direction.

## Place the behavior

- Controllers and scheduled jobs belong to `adapters-in`; transport validation, authentication,
  conditional headers and problem responses are their responsibility. Translate a validated request
  into the use-case input, then present the result. Do not return persistence rows as HTTP contracts.
- Domain invariants and application orchestration stay in ordinary TypeScript classes. Time,
  identifiers and external effects enter through application ports; these classes need no Nest
  decorators or container to run.
- Bind port implementations and construct use cases in `composition`, using explicit tokens and typed
  factories. Keep the service app focused on configuration and importing its composition module.
  Do not repair a dependency cycle with a broader Nx constraint or a framework service locator.
- Make ownership of opened databases and background work explicit. Use the module's lifecycle cleanup
  for handles it creates, and give integration tests a way to disable workers or replace outbound I/O.

## Follow the existing boundaries

The [admin content controller](../../../libs/backend/content/adapters-in/src/lib/http/controllers/admin-content/admin-content.controller.ts)
shows `@AdminOnly`, contract validation, `If-Match` and presentation. The
[content module](../../../libs/backend/content/composition/src/lib/content.module.ts) wires ordinary use
cases to adapters, owns its database lifecycle and accepts deterministic test overrides. The
[contact problem mapper](../../../libs/backend/contact/adapters-in/src/lib/http/mappers/contact-problem/contact-problem.mapper.ts)
translates stable application/domain failures into public fields and HTTP statuses.

Keep explicit parameter/return types, type-only imports, private owner aliases and public cross-project
entries consistent with the surrounding code. Nest-specific configuration stays outside the domain
and application libraries.

## Prove the changed boundary

Run the owner's resolved Nx lint, typecheck and test targets. Exercise domain/application changes with
in-memory ports, controller behavior through HTTP, and wiring/lifecycle changes through a real test
module that closes its handles. See the [test ownership matrix](../../../docs/workspace/testing.md) and
[content composition tests](../../../libs/backend/content/composition/src/lib/testing/content.module.spec.ts).
Use [official Nest custom-provider documentation](https://docs.nestjs.com/fundamentals/custom-providers)
for framework APIs; do not introduce a second dependency-injection pattern.
