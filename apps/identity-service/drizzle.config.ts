import { defineConfig } from 'drizzle-kit';

/**
 * Configuration Identity service migrations
 *
 * @description
 * Restricts Drizzle generation to the identity schema and keeps its migration journal in that schema.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './libs/backend/identity/adapters-out/src/lib/persistence/schema/identity.schema.ts',
  out: './apps/identity-service/migrations',
  schemaFilter: ['identity'],
  migrations: { schema: 'identity', table: '__migrations' },
  dbCredentials: { url: process.env['IDENTITY_DATABASE_URL'] ?? '' },
});
