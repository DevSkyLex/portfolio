import type { Pool as PostgresPool } from 'pg';
import type { PGlite as PGliteClient } from '@electric-sql/pglite';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

/**
 * Type Database
 * @type Database
 *
 * @description
 * Drizzle PostgreSQL query API parameterized by the service's schema table map.
 *
 * @template TTables - Schema tables exposed by the service database.
 */
export type Database<TTables extends Record<string, unknown>> = PgDatabase<
  PgQueryResultHKT,
  TTables
>;

/**
 * Interface DatabaseHandle
 * @interface DatabaseHandle
 *
 * @description
 * Couples a schema-typed Drizzle API with the cleanup operation for its underlying database connection.
 *
 * @template TTables - Schema table map used to type database queries.
 */
export interface DatabaseHandle<TTables extends Record<string, unknown>> {
  // #region Properties
  /**
   * Property db
   * @readonly
   *
   * @description
   * Typed Drizzle database instance for queries against this service schema.
   *
   * @type {Database<TTables>}
   */
  readonly db: Database<TTables>;
  // #endregion

  // #region Methods
  /**
   * Method close
   * @method close
   *
   * @description
   * Closes the underlying PGlite client or PostgreSQL pool and releases its resources.
   *
   * @returns {Promise<void>} Completion after the connection resource has closed.
   */
  close(): Promise<void>;
  // #endregion
}

/**
 * Function openDatabase
 *
 * @description
 * Opens an in-process PGlite database for `pglite:memory` or `pglite:<directory>` URLs, otherwise a lazy node-postgres pool.
 * Persistent PGlite directories are created before opening; callers own and must close the returned handle.
 *
 * @template TTables - Drizzle schema table map used to type queries.
 * @param {string} url - PGlite selector or PostgreSQL connection URL.
 * @param {TTables} tables - Service schema used by the Drizzle adapter.
 * @returns {Promise<DatabaseHandle<TTables>>} Database API and resource cleanup operation.
 */
export async function openDatabase<TTables extends Record<string, unknown>>(
  url: string,
  tables: TTables,
): Promise<DatabaseHandle<TTables>> {
  if (url.startsWith('pglite:')) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const location: string = url.slice('pglite:'.length);
    if (location !== 'memory') {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(location, { recursive: true });
    }
    const client: PGliteClient = location === 'memory' ? new PGlite() : new PGlite(location);
    const db: PgliteDatabase<TTables> & { $client: PGliteClient } = drizzle(client, {
      schema: tables,
    });
    return { db, close: (): Promise<void> => client.close() };
  }
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pool: PostgresPool = new Pool({ connectionString: url, max: 5 });
  const db: NodePgDatabase<TTables> & { $client: PostgresPool } = drizzle(pool, { schema: tables });
  return { db, close: (): Promise<void> => pool.end() };
}

/**
 * Function migrateDatabase
 *
 * @description
 * Applies the configured migration folder through the matching PGlite or PostgreSQL Drizzle migrator.
 * The supplied schema and dedicated journal table isolate migration history per service.
 *
 * @template TTables - Schema table map associated with the open handle.
 * @param {DatabaseHandle<TTables>} handle - Open database to migrate.
 * @param {string} migrationsFolder - Directory containing Drizzle SQL migrations and metadata.
 * @param {string} schema - Postgres schema name for the migration journal.
 * @returns {Promise<void>} Completion after pending migrations are applied; migration errors reject the promise.
 */
export async function migrateDatabase<TTables extends Record<string, unknown>>(
  handle: DatabaseHandle<TTables>,
  migrationsFolder: string,
  schema: string,
): Promise<void> {
  const options: { migrationsFolder: string; migrationsSchema: string; migrationsTable: string } = {
    migrationsFolder,
    migrationsSchema: schema,
    migrationsTable: '__migrations',
  };
  if ('$client' in handle.db && isPglite(handle.db.$client)) {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(handle.db as Parameters<typeof migrate>[0], options);
    return;
  }
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  await migrate(handle.db as Parameters<typeof migrate>[0], options);
}

/**
 * Function isPglite
 *
 * @description
 * Identifies the PGlite client by its data-directory capability before selecting the PGlite migrator.
 *
 * @param {unknown} client - Drizzle client's underlying driver value.
 * @returns {boolean} Whether the client exposes PGlite's `dumpDataDir` member.
 */
function isPglite(client: unknown): boolean {
  return typeof client === 'object' && client !== null && 'dumpDataDir' in client;
}

/**
 * Function databaseReadinessCheck
 *
 * @description
 * Builds an observability probe that executes a lightweight SQL statement against the service database.
 * Query failures reject the check so the readiness endpoint reports the dependency as down.
 *
 * @template TTables - Schema table map associated with the database handle.
 * @param {DatabaseHandle<TTables>} handle - Open service database to probe.
 * @returns {{ readonly name: string; check(): Promise<void> }} Named readiness check consumed by the observability platform.
 */
export function databaseReadinessCheck<TTables extends Record<string, unknown>>(
  handle: DatabaseHandle<TTables>,
): { readonly name: string; check(): Promise<void> } {
  return {
    name: 'database',
    check: async (): Promise<void> => {
      await handle.db.execute(sql`select 1`);
    },
  };
}
