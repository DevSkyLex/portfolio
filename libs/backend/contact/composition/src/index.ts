/**
 * Export contact composition
 *
 * @description
 * Nest dynamic module, its database injection token and runtime options.
 */
export {
  CONTACT_DATABASE,
  ContactModule,
  type ContactModuleOptions,
} from '@internal/contact-composition/lib/contact.module';

/**
 * Export migrateContact
 *
 * @description
 * Explicit contact database migration command used by service operations.
 */
export { migrateContact } from '@internal/contact-composition/lib/tasks/contact-database/contact-database.tasks';
