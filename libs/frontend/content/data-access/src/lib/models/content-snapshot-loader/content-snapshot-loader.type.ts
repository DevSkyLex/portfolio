import type { SiteLocale } from '@vfortin/content-web-model';

/**
 * Type ContentSnapshotLoader
 * @type ContentSnapshotLoader
 *
 * @description
 * Asynchronous loader for the raw content snapshot of one locale.
 *
 * @type {(locale: SiteLocale) => Promise<unknown>}
 */
export type ContentSnapshotLoader = (locale: SiteLocale) => Promise<unknown>;
