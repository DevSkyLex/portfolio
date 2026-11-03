import type { Provider } from '@angular/core';
import type { SiteLocale } from '@vfortin/content-web-model';
import { CONTENT_SNAPSHOTS } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshots.token';

/**
 * Function provideContentSnapshots
 *
 * @description
 * Registers already available locale snapshots for prerendering or tests that do not need asynchronous loading.
 *
 * @param {Readonly<Record<SiteLocale, unknown>>} snapshots - Raw snapshots keyed by supported locale.
 *
 * @returns {Provider} Provider for the content snapshot token.
 */
export function provideContentSnapshots(
  snapshots: Readonly<Record<SiteLocale, unknown>>,
): Provider {
  return { provide: CONTENT_SNAPSHOTS, useValue: snapshots };
}
