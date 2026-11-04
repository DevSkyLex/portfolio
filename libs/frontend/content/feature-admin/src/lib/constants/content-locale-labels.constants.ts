import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';

/**
 * Constant CONTENT_LOCALE_LABELS
 *
 * @description
 * Names of the content languages on the per-field language toggles, each written in its own
 * language.
 *
 * @type {Readonly<Record<ContentLocale, string>>}
 */
export const CONTENT_LOCALE_LABELS: Readonly<Record<ContentLocale, string>> = {
  fr: 'Français',
  en: 'English',
};
