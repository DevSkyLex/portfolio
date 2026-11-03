import type { ContactSubjectOption } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-subject-option.interface';

/**
 * Constant CONTACT_SUBJECT_OPTIONS
 *
 * @description
 * Localized subject choices offered in the contact form.
 *
 * @type {readonly ContactSubjectOption[]}
 */
export const CONTACT_SUBJECT_OPTIONS: readonly ContactSubjectOption[] = [
  { value: 'project', label: $localize`:@@contact.subject.project:Un projet à construire` },
  { value: 'job', label: $localize`:@@contact.subject.job:Une offre de poste` },
  { value: 'other', label: $localize`:@@contact.subject.other:Autre chose` },
];
