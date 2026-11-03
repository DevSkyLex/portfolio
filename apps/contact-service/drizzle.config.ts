import { defineConfig } from 'drizzle-kit';

/**
 * Configuration Contact service migrations
 *
 * @description
 * Restricts Drizzle generation to the contact schema and keeps its migration journal in that schema.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './libs/backend/contact/adapters-out/src/lib/persistence/schema/contact.schema.ts',
  out: './apps/contact-service/migrations',
  schemaFilter: ['contact'],
  migrations: { schema: 'contact', table: '__migrations' },
  dbCredentials: { url: process.env['CONTACT_DATABASE_URL'] ?? '' },
});
