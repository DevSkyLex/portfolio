import type { AdminMessage } from '@vfortin/contact-web-data-access';

/**
 * Constant MESSAGE_SUBJECTS
 *
 * @description
 * Localized labels displayed for each subject category returned in an administrator message, worded
 * as the public contact form offers them.
 *
 * @type {Readonly<Record<AdminMessage['subject'], string>>}
 */
export const MESSAGE_SUBJECTS: Readonly<Record<AdminMessage['subject'], string>> = {
  project: $localize`:@@admin.inbox.subject.project:Un projet à construire`,
  job: $localize`:@@admin.inbox.subject.job:Une offre de poste`,
  other: $localize`:@@admin.inbox.subject.other:Autre chose`,
};
