/**
 * Export NodemailerMailSender
 *
 * @description
 * SMTP or development JSON mail adapter and its configuration type.
 */
export {
  NodemailerMailSender,
  type MailSenderOptions,
} from '@internal/contact-adapters-out/lib/mail/nodemailer-mail/nodemailer-mail.sender';

/**
 * Export contact database access
 *
 * @description
 * Contact database handle types and functions for opening and migrating the schema.
 */
export {
  migrateContactDatabase,
  openContactDatabase,
  type ContactDatabase,
  type ContactDatabaseHandle,
} from '@internal/contact-adapters-out/lib/persistence/database/contact-database';

/**
 * Export contact persistence adapters
 *
 * @description
 * Drizzle repositories, transaction boundary and Postgres rate limiter implementations.
 */
export {
  DrizzleContactMessageRepository,
  DrizzleContactUnitOfWork,
  DrizzleNotificationJobRepository,
  PostgresRateLimiter,
} from '@internal/contact-adapters-out/lib/persistence/repositories/contact/drizzle-contact.repositories';

/**
 * Export system adapters
 *
 * @description
 * System clock and cryptographic UUID generator implementations.
 */
export {
  RandomIdGenerator,
  SystemClock,
} from '@internal/contact-adapters-out/lib/system/system.adapters';
