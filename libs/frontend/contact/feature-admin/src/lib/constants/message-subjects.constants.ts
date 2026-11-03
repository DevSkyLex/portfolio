import type { AdminMessage } from '@vfortin/contact-web-data-access';

/**
 * Constant MESSAGE_SUBJECTS
 *
 * @description
 * French labels displayed for each subject category returned in an administrator message.
 *
 * @type {Readonly<Record<AdminMessage['subject'], string>>}
 */
export const MESSAGE_SUBJECTS: Readonly<Record<AdminMessage['subject'], string>> = {
  project: 'Un projet à construire',
  job: 'Une offre de poste',
  other: 'Autre chose',
};
