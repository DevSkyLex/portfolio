/**
 * Export AdminContactController
 *
 * @description
 * Guarded HTTP endpoints for administrator inbox operations.
 */
export { AdminContactController } from '@internal/contact-adapters-in/lib/http/controllers/admin-contact/admin-contact.controller';

/**
 * Export contactProblemMapper
 *
 * @description
 * Maps contact application and domain failures to problem-details responses.
 */
export { contactProblemMapper } from '@internal/contact-adapters-in/lib/http/mappers/contact-problem/contact-problem.mapper';

/**
 * Export public contact endpoint
 *
 * @description
 * Public message submission controller, configuration token and options type.
 */
export {
  CONTACT_HTTP_OPTIONS,
  ContactController,
  type ContactHttpOptions,
} from '@internal/contact-adapters-in/lib/http/controllers/contact/contact.controller';

/**
 * Export ContactJobs
 *
 * @description
 * Scheduled notification delivery and retention maintenance provider.
 */
export { ContactJobs } from '@internal/contact-adapters-in/lib/jobs/contact/contact.jobs';
