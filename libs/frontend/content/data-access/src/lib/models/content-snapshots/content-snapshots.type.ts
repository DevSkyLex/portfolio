import type { SiteLocale } from '@vfortin/content-web-model';

/**
 * Type ContentSnapshots
 * @type ContentSnapshots
 *
 * @description
 * Raw, not yet validated content snapshots keyed by locale; a locale is absent until it is loaded.
 *
 * @type {Readonly<Partial<Record<SiteLocale, unknown>>>}
 */
export type ContentSnapshots = Readonly<Partial<Record<SiteLocale, unknown>>>;
