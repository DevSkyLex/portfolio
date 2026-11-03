import {
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  type PgSchema,
  type PgTimestampBuilderInitial,
} from 'drizzle-orm/pg-core';

/**
 * Constant contactSchema
 * @readonly
 *
 * @description
 * Postgres schema owned exclusively by the contact service (D1).
 *
 * @type {ReturnType<typeof pgSchema>}
 */
export const contactSchema: PgSchema<'contact'> = pgSchema('contact');

/**
 * Function at
 *
 * @description
 * Defines a timezone-aware Postgres timestamp column mapped to JavaScript `Date` values.
 * @param {string} name - Database column name.
 * @returns {ReturnType<typeof timestamp>} Timestamp column builder.
 */
const at = (name: string): PgTimestampBuilderInitial<string> =>
  timestamp(name, { withTimezone: true, mode: 'date' });

/**
 * Constant messages
 * @readonly
 *
 * @description
 * Contact inbox table with retention and stable ordering indexes.
 */
export const messages = contactSchema.table(
  'messages',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    company: text('company'),
    email: text('email').notNull(),
    subject: text('subject', { enum: ['project', 'job', 'other'] }).notNull(),
    body: text('body').notNull(),
    locale: text('locale', { enum: ['fr', 'en'] }).notNull(),
    status: text('status', { enum: ['received', 'read', 'archived'] }).notNull(),
    receivedAt: at('received_at').notNull(),
    purgeAt: at('purge_at').notNull(),
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('messages_purge_at_idx').on(table.purgeAt),
    // Inbox order (newest first, id to break ties: read backwards), with and without the status filter.
    index('messages_received_idx').on(table.receivedAt, table.id),
    index('messages_status_received_idx').on(table.status, table.receivedAt, table.id),
  ],
);

/**
 * Constant notificationJobs
 * @readonly
 *
 * @description
 * Transactional notification outbox; message deletion cascades to the corresponding job (D3).
 */
export const notificationJobs = contactSchema.table(
  'notification_jobs',
  {
    id: text('id').primaryKey(),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: at('next_attempt_at').notNull(),
    /** A worker's lease: while it runs, no other worker picks up the notification. */
    claimedUntil: at('claimed_until'),
    /** Token of the current lease: only the worker holding it may record the outcome. */
    claimToken: text('claim_token'),
    lastError: text('last_error'),
    sentAt: at('sent_at'),
  },
  (table) => [
    index('notification_jobs_due_idx').on(table.status, table.nextAttemptAt),
    // Cascade of a message deletion (purge, erasure).
    index('notification_jobs_message_idx').on(table.messageId),
  ],
);

/**
 * Constant rateLimits
 * @readonly
 *
 * @description
 * Fixed-window counters keyed by an origin fingerprint rather than a plain IP address (D15).
 */
export const rateLimits = contactSchema.table(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    expiresAt: at('expires_at').notNull(),
  },
  (table) => [index('rate_limits_expires_at_idx').on(table.expiresAt)],
);

/**
 * Constant contactTables
 * @readonly
 *
 * @description
 * Tables registered with the shared contact database handle.
 */
export const contactTables: {
  readonly messages: typeof messages;
  readonly notificationJobs: typeof notificationJobs;
  readonly rateLimits: typeof rateLimits;
} = { messages, notificationJobs, rateLimits };
