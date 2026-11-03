import { InjectionToken } from '@angular/core';
import type { ContentSnapshot } from '@vfortin/content-contracts';

/**
 * Constant CONTENT_SNAPSHOT_VALIDATOR
 *
 * @description
 * Injection token for the validator used during server rendering so invalid prerender content fails before publication while the browser bundle stays free of Zod (D10).
 *
 * @type {InjectionToken<(value: unknown) => ContentSnapshot>}
 */
export const CONTENT_SNAPSHOT_VALIDATOR: InjectionToken<(value: unknown) => ContentSnapshot> =
  new InjectionToken<(value: unknown) => ContentSnapshot>('CONTENT_SNAPSHOT_VALIDATOR');
