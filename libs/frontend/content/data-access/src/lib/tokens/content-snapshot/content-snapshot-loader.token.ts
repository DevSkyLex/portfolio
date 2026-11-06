import { InjectionToken } from '@angular/core';
import type { ContentSnapshotLoader } from '@internal/content-web-data-access/lib/models/content-snapshot-loader/content-snapshot-loader.type';

/** The loader is replaceable by server-only request providers without changing browser hydration. */
export const CONTENT_SNAPSHOT_LOADER: InjectionToken<ContentSnapshotLoader> =
  new InjectionToken<ContentSnapshotLoader>('CONTENT_SNAPSHOT_LOADER');
