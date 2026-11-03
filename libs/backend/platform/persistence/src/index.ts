/**
 * Public persistence exports
 *
 * @description
 * Exposes typed database handles, open and close lifecycle operations, migration support and readiness probes.
 */
export {
  databaseReadinessCheck,
  migrateDatabase,
  openDatabase,
  type Database,
  type DatabaseHandle,
} from '@internal/backend-persistence/lib/database/database';
