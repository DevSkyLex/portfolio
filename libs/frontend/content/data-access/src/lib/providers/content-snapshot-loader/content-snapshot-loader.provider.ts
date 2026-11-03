import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import {
  type EnvironmentProviders,
  LOCALE_ID,
  PLATFORM_ID,
  TransferState,
  inject,
  makeEnvironmentProviders,
  type StateKey,
} from '@angular/core';
import type { ContentSnapshot } from '@vfortin/content-contracts';
import type { SiteLocale } from '@vfortin/content-web-model';
import type { ContentSnapshotLoader } from '@internal/content-web-data-access/lib/models/content-snapshot-loader/content-snapshot-loader.type';
import { CONTENT_SNAPSHOTS } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshots.token';
import { CONTENT_SNAPSHOT_READY } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-ready.token';
import { contentSnapshotStateKey } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-state-key';
import { CONTENT_SNAPSHOT_VALIDATOR } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-validator.token';
import { localeOf } from '@internal/content-web-data-access/lib/utils/site-locale/site-locale.utils';

/**
 * Function provideContentSnapshotLoader
 *
 * @description
 * Public routes await a locale snapshot. Prerendering validates and transfers that public data so
 * hydration has no duplicate chunk dependency; CSR administration never requests it (D10, D18).
 *
 * @param {ContentSnapshotLoader} load - Loader that retrieves the snapshot selected by locale.
 *
 * @returns {EnvironmentProviders} Providers for raw snapshots and their shared readiness operation.
 */
export function provideContentSnapshotLoader(load: ContentSnapshotLoader): EnvironmentProviders {
  const snapshots: Partial<Record<SiteLocale, unknown>> = {};
  return makeEnvironmentProviders([
    { provide: CONTENT_SNAPSHOTS, useValue: snapshots },
    {
      provide: CONTENT_SNAPSHOT_READY,
      useFactory: (): (() => Promise<void>) => {
        const locale: SiteLocale = localeOf(inject<string>(LOCALE_ID));
        const platform: object = inject<object>(PLATFORM_ID);
        const transfer: TransferState = inject<TransferState>(TransferState);
        const key: StateKey<unknown> = contentSnapshotStateKey(locale);
        const validate: ((value: unknown) => ContentSnapshot) | null = inject<
          (value: unknown) => ContentSnapshot
        >(CONTENT_SNAPSHOT_VALIDATOR, {
          optional: true,
        });
        const remember: (snapshot: unknown) => void = (snapshot: unknown): void => {
          const checked: unknown = validate ? validate(snapshot) : snapshot;
          snapshots[locale] = checked;
          if (isPlatformServer(platform)) transfer.set(key, checked);
        };
        let pending: Promise<void> | null = null;
        return (): Promise<void> => {
          if (isPlatformBrowser(platform) && transfer.hasKey(key)) {
            remember(transfer.get(key, undefined));
            transfer.remove(key);
          }
          if (Object.hasOwn(snapshots, locale)) {
            // Each prerender application needs its own transfer entry, even with a cached raw chunk.
            remember(snapshots[locale]);
            return Promise.resolve();
          }
          pending ??= load(locale)
            .then(remember)
            .finally((): void => {
              pending = null;
            });
          return pending;
        };
      },
    },
  ]);
}
