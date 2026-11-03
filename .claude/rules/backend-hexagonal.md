---
paths:
  - 'libs/backend/**'
  - 'apps/*-service/**'
---

# Backend hexagonal layers

- Each context (`content`, `contact`, `identity`) has `domain`, `application`, `adapters-in`,
  `adapters-out` and `composition` under `libs/backend/<ctx>/`, its own Postgres schema, migrations and
  service (D1). No gateway (D2), no broker (D3), no CQRS or event sourcing (D4).
- `domain`: models and invariants; no NestJS, Angular, ORM, `pg`, `express`, `jose`, `nodemailer`, `rxjs`
  or Zod (lint and guard hook). Time and identifiers come in as arguments.
- `application`: use cases (`use-cases/<verb-noun>/<verb-noun>.use-case.ts`), ports in `ports/` for I/O
  and non-determinism only (D8), application errors with stable codes, in-memory fakes in `testing/`.
  Reliable side effects are outbox rows in the same unit of work (D3).
- `adapters-in`: controllers validated with `ZodValidationPipe` against the contracts, `@AdminOnly`,
  `If-Match`, scheduled jobs, the context problem mapper (D13). `adapters-out`: Drizzle repositories and
  other port implementations; never read contracts. `composition`: the `DynamicModule` that wires them.
- Service apps (`apps/<ctx>-service`) read configuration and import their composition module only.
- Schema changes are generated (`npx drizzle-kit generate --config apps/<ctx>-service/drizzle.config.ts`);
  `migrations/meta/` is never hand-edited; migrations run as `<ctx>_migrator`, the service as `<ctx>_app`
  (D23). PGlite in development and tests, Postgres in production (D12).
- A context reads another context only through its contracts; shared server capabilities live in
  `libs/backend/platform/{auth,config,http,observability,persistence}`.

Details: the `api-use-case-recipe` skill.
