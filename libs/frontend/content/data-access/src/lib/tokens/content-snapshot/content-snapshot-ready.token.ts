import { InjectionToken } from '@angular/core';

/**
 * Completes the active locale snapshot before a public route consumes its synchronous view model.
 * Already supplied snapshots require no asynchronous work.
 */
export const CONTENT_SNAPSHOT_READY: InjectionToken<() => Promise<void>> = new InjectionToken<
  () => Promise<void>
>('CONTENT_SNAPSHOT_READY', {
  providedIn: 'root',
  factory: (): (() => Promise<void>) => (): Promise<void> => Promise.resolve(),
});
