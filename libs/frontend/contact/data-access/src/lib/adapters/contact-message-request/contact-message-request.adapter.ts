import type { ContactMessageRequest } from '@vfortin/contact-contracts';
import type { ContactRequest } from '@internal/contact-web-data-access/lib/models/contact-request/contact-request.interface';

/**
 * Function toContactMessageRequest
 *
 * @description
 * Adapts the browser form model to the shared request contract, representing a blank company value
 * as `null` while preserving the honeypot field for server-side spam handling.
 *
 * @param {ContactRequest} request - Values collected by the contact form.
 *
 * @returns {ContactMessageRequest} Contract payload for the contact API.
 */
export function toContactMessageRequest(request: ContactRequest): ContactMessageRequest {
  return {
    name: request.name,
    company: request.company.trim() || null,
    email: request.email,
    subject: request.subject,
    message: request.message,
    locale: request.locale,
    website: request.website,
  };
}
