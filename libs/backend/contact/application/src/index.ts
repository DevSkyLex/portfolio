/**
 * Export application errors
 *
 * @description
 * Stable application failures exposed to HTTP adapters for problem mapping.
 */
export {
  ApplicationError,
  NotFoundError,
  RateLimitedError,
  VersionMismatchError,
} from '@internal/contact-application/lib/errors/application-error';

/**
 * Export contact application ports
 *
 * @description
 * Persistence, mail, rate-limit, time and identifier interfaces required by contact use cases.
 */
export type {
  ClaimedNotification,
  Clock,
  ContactMessageRepository,
  ContactNotificationMail,
  ContactRepositories,
  ContactUnitOfWork,
  IdGenerator,
  MailSender,
  MessagePage,
  MessageQuery,
  NotificationJobRepository,
  RateLimit,
  RateLimiter,
} from '@internal/contact-application/lib/ports/contact/contact.ports';

/**
 * Export notification delivery use case
 *
 * @description
 * Outbox worker, mail rendering function, delivery settings and report contract.
 */
export {
  DELIVERY_BATCH,
  DELIVERY_LEASE_MS,
  DeliverPendingNotifications,
  notificationMail,
  type DeliveryReport,
} from '@internal/contact-application/lib/use-cases/deliver-pending-notifications/deliver-pending-notifications.use-case';

/**
 * Export PurgeExpiredMessages
 *
 * @description
 * Use case that removes expired messages and completed rate-limit windows.
 */
export { PurgeExpiredMessages } from '@internal/contact-application/lib/use-cases/purge-expired-messages/purge-expired-messages.use-case';

/**
 * Export contact submission use case
 *
 * @description
 * Rate-limited message acceptance command and use-case entry point.
 */
export {
  SUBMIT_RATE_LIMIT,
  SubmitContactMessage,
  type SubmitContactMessageCommand,
} from '@internal/contact-application/lib/use-cases/submit-contact-message/submit-contact-message.use-case';

/**
 * Export ArchiveContactMessage
 *
 * @description
 * Version-checked inbox archive operation.
 */
export { ArchiveContactMessage } from '@internal/contact-application/lib/use-cases/archive-contact-message/archive-contact-message.use-case';

/**
 * Export DeleteContactMessage
 *
 * @description
 * Administrator message erasure operation.
 */
export { DeleteContactMessage } from '@internal/contact-application/lib/use-cases/delete-contact-message/delete-contact-message.use-case';

/**
 * Export ListContactMessages
 *
 * @description
 * Bounded administrator inbox page query and maximum page-size constant.
 */
export {
  ListContactMessages,
  MAX_PAGE_SIZE,
} from '@internal/contact-application/lib/use-cases/list-contact-messages/list-contact-messages.use-case';

/**
 * Export MarkContactMessageRead
 *
 * @description
 * Version-checked inbox read operation.
 */
export { MarkContactMessageRead } from '@internal/contact-application/lib/use-cases/mark-contact-message-read/mark-contact-message-read.use-case';
