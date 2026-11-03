---
name: pf-drizzle-postgres
description: 'Change Drizzle ORM persistence, PostgreSQL/PGlite queries, transactions, optimistic versions, outbox claims or generated migrations. Use for backend persistence adapters and their database integration tests, not domain models or production database operations.'
---

# Drizzle, PostgreSQL and PGlite

Start with the owner's README and the [persistence decisions](../../../docs/architecture/decisions.md).
Read installed Drizzle ORM, Drizzle Kit and PGlite versions before taking syntax from current docs;
the repository currently uses the 0.45 ORM family, while upstream documentation also describes newer APIs.

## Preserve the unit of work

- Keep tables, row mapping and queries in the context's `adapters-out`. Implement application ports;
  do not export Drizzle rows, transactions or SQL expressions into use cases or HTTP contracts.
- A unit of work must construct its repositories from the transaction handle supplied to its callback.
  Reaching a root connection inside that callback can commit part of an intended atomic operation.
- Save aggregates and their reliable side-effect requests in the same transaction. Deliver mail or
  rebuild requests through the existing outbox worker after commit, with the owner's claim/lease and
  retry rules. Preserve failure rollback and stale-worker behavior.
- Update an aggregate using both its identifier and expected version in the database predicate, and
  increment the version atomically. An empty update result becomes the existing application version
  error; an earlier read followed by an unconditional write does not provide optimistic locking.
- Keep pagination order stable and validate filter/sort inputs at the boundary. Use typed Drizzle
  expressions and parameterized SQL; do not interpolate untrusted SQL identifiers or fragments.

The [content repositories](../../../libs/backend/content/adapters-out/src/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories.ts)
show transaction-bound wiring, versions and rebuild claims. The
[contact repositories](../../../libs/backend/contact/adapters-out/src/lib/persistence/repositories/contact/drizzle-contact.repositories.ts)
show message persistence and notification work. Preserve their context schema and ownership.

## Change and verify the schema

Generate schema migrations with the context's existing Drizzle Kit configuration; review the generated
SQL rather than editing migration metadata. Apply them only to an authorized disposable local database
through the existing service task. Keep runtime application roles separate from migration roles and
consider compatibility with the previous service version before changing a column or constraint.

Use migrated `pglite:memory` fixtures for repository behavior, version conflicts and rollback tests.
Close every database handle in teardown. PGlite results alone do not establish independent-connection
PostgreSQL locking behavior. The
[content concurrency spec](../../../libs/backend/content/adapters-out/src/lib/persistence/testing/content-concurrency.spec.ts)
adds a real PostgreSQL target when `TEST_DATABASE_URL` is supplied; that target resets its context
schema, so supply only an explicitly disposable test database, never an ambient service database.
For real PostgreSQL verification, use `--skip-nx-cache`: `TEST_DATABASE_URL` is not a hashed task input,
so Nx could replay a PGlite-only result; see the [database test commands](../../../docs/workspace/generators.md).

Run the owner's resolved Nx checks and the relevant adapter/concurrency tests. Report which engine ran.
Consult [official transaction documentation](https://orm.drizzle.team/docs/transactions) for version-
appropriate APIs and the [test contract](../../../docs/workspace/testing.md) for maintained thresholds.
