import { defineConfig } from 'drizzle-kit';

/**
 * Configuration Content service migrations
 *
 * @description
 * Restricts Drizzle generation to the content schema and keeps its migration journal in that schema.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './libs/backend/content/adapters-out/src/lib/persistence/schema/content.schema.ts',
  out: './apps/content-service/migrations',
  schemaFilter: ['content'],
  migrations: { schema: 'content', table: '__migrations' },
  dbCredentials: { url: process.env['CONTENT_DATABASE_URL'] ?? '' },
});
