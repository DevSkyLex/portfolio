import type { ContactFormValues } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-values.model';

/**
 * Constant EMPTY_CONTACT_FORM
 *
 * @description
 * Blank contact form values with the default subject.
 *
 * @type {ContactFormValues}
 */
export const EMPTY_CONTACT_FORM: ContactFormValues = {
  name: '',
  company: '',
  email: '',
  subject: 'project',
  message: '',
  website: '',
};
