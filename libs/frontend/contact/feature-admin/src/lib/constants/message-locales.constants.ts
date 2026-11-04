import type { AdminMessage } from '@vfortin/contact-web-data-access';

/**
 * Constant MESSAGE_LOCALES
 *
 * @description
 * Names of the site language the sender wrote from, in the admin's language, shown as the language
 * property of the reading pane (a property value, unlike the editor tabs that name each language in
 * itself).
 *
 * @type {Readonly<Record<AdminMessage['locale'], string>>}
 */
export const MESSAGE_LOCALES: Readonly<Record<AdminMessage['locale'], string>> = {
  fr: $localize`:@@admin.inbox.locale.fr:Français`,
  en: $localize`:@@admin.inbox.locale.en:Anglais`,
};
