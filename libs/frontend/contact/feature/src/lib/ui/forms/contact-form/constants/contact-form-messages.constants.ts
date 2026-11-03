import type { ContactFormFieldName } from '@internal/contact-web-feature/lib/ui/forms/contact-form/models/contact-form-field-name.type';

/**
 * Constant CONTACT_FORM_MESSAGES
 *
 * @description
 * Localized validation messages keyed by the field that owns each constraint; server field errors
 * reuse them, so the copy says what to fix whatever the API wording.
 *
 * @type {Readonly<Record<ContactFormFieldName, string>>}
 */
export const CONTACT_FORM_MESSAGES: Readonly<Record<ContactFormFieldName, string>> = {
  name: $localize`:@@contact.error.name:Indiquez votre nom.`,
  company: $localize`:@@contact.error.company:Le nom de l'entreprise est trop long.`,
  email: $localize`:@@contact.error.email:Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.`,
  subject: $localize`:@@contact.error.subject:Choisissez un objet.`,
  message: $localize`:@@contact.error.message:Écrivez entre 20 et 2000 caractères pour décrire votre demande.`,
};
