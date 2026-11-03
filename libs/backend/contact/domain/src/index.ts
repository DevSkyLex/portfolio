/**
 * Export domain errors
 *
 * @description
 * Public contact-domain failures and value validation errors.
 */
export { DomainError, InvalidValueError } from '@internal/contact-domain/lib/errors/domain-error';

/**
 * Export contact messages
 *
 * @description
 * Contact message model, immutable status transitions, accepted subject values and field limits.
 */
export {
  BODY_MAX_LENGTH,
  BODY_MIN_LENGTH,
  COMPANY_MAX_LENGTH,
  CONTACT_SUBJECTS,
  ContactMessage,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  RETENTION_YEARS,
  type ContactLocale,
  type ContactMessageProps,
  type ContactMessageStatus,
  type ContactSubject,
  type ReceiveContactMessage,
} from '@internal/contact-domain/lib/message/contact-message';

/**
 * Export notification jobs
 *
 * @description
 * Notification outbox model, retry delay and persisted delivery state.
 */
export {
  MAX_ATTEMPTS,
  NotificationJob,
  retryDelay,
  type NotificationJobProps,
  type NotificationJobStatus,
} from '@internal/contact-domain/lib/notification/notification-job';
