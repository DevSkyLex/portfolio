import type { ContactFormFieldName } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-field-name.type';

/**
 * Constant CONTACT_FORM_FIELDS
 *
 * @description
 * Fields counted by the error summary and accepted from server errors, in focus order.
 *
 * @type {readonly ContactFormFieldName[]}
 */
export const CONTACT_FORM_FIELDS: readonly ContactFormFieldName[] = [
  'name',
  'company',
  'email',
  'subject',
  'message',
];
