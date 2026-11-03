import { LOCALES, type Locale } from '@vfortin/content-domain';

/**
 * Constant PUBLISHED_LOCALES
 *
 * @description
 * Locales required for project publication; the domain rejects publishing when any required
 * translation is incomplete.
 */
export const PUBLISHED_LOCALES: readonly Locale[] = LOCALES;
