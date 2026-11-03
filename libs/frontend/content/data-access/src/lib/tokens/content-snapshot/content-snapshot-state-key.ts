import { makeStateKey, type StateKey } from '@angular/core';
import type { SiteLocale } from '@vfortin/content-web-model';

/** Public, validated content only; authentication state is never serialized through this key. */
export function contentSnapshotStateKey(locale: SiteLocale): StateKey<unknown> {
  return makeStateKey<unknown>(`portfolio.public-content.${locale}`);
}
