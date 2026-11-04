/**
 * Export contact form model
 *
 * @description
 * Request values, subject category, and browser-side limits kept aligned with the shared contract.
 */
export { CONTACT_FORM_LIMITS } from '@internal/contact-web-data-access/lib/constants/contact-form-limits.constants';
export type { ContactRequest } from '@internal/contact-web-data-access/lib/models/contact-request/contact-request.interface';
export type { ContactSubject } from '@internal/contact-web-data-access/lib/models/contact-request/contact-subject.type';

/**
 * Export contact API client
 *
 * @description
 * API client and adapter that converts form values to the shared contact request contract.
 */
export { toContactMessageRequest } from '@internal/contact-web-data-access/lib/adapters/contact-message-request/contact-message-request.adapter';
export { ContactApiService } from '@internal/contact-web-data-access/lib/services/contact-api/contact-api.service';

/**
 * Export ContactFormStore
 *
 * @description
 * Component-scoped state for contact submission and server field errors.
 */
export {
  ContactFormStore,
  type ContactFormStoreType,
} from '@internal/contact-web-data-access/lib/state/contact-form/contact-form.store';

/**
 * Export contact store error types
 *
 * @description
 * Normalized error shapes used by contact stores to present API failures.
 */
export type { ServerFieldError, StoreError } from '@vfortin/web-http';

/**
 * Export admin inbox API and store
 *
 * @description
 * Protected inbox operations, state, pagination size, and message models for the admin feature.
 */
export { INBOX_PAGE_SIZE } from '@internal/contact-web-data-access/lib/constants/admin-messages.constants';
export type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
export type { AdminMessageStatus } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message-status.type';
export { AdminMessagesApiService } from '@internal/contact-web-data-access/lib/services/admin-messages/admin-messages.service';
export {
  AdminInboxStore,
  type AdminInboxStoreType,
} from '@internal/contact-web-data-access/lib/state/admin-inbox/admin-inbox.store';
