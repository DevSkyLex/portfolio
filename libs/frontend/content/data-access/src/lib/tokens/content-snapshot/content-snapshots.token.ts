import { InjectionToken } from '@angular/core';
import type { ContentSnapshots } from '@internal/content-web-data-access/lib/models/content-snapshots/content-snapshots.type';

/**
 * Constant CONTENT_SNAPSHOTS
 *
 * @description
 * Injection token for raw locale snapshots loaded before prerendering or supplied by a test provider.
 *
 * @type {InjectionToken<ContentSnapshots>}
 */
export const CONTENT_SNAPSHOTS: InjectionToken<ContentSnapshots> =
  new InjectionToken<ContentSnapshots>('CONTENT_SNAPSHOTS');
