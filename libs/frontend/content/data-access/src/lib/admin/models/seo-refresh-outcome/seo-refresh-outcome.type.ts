import type { StoreError } from '@vfortin/web-http';

/**
 * Type SeoRefreshOutcome
 *
 * @description
 * Result of a refresh request: started in the background, refused because the previous one started
 * less than 10 minutes ago (`retryAt`, an ISO time, when the API gave it), or failed.
 */
export type SeoRefreshOutcome =
  | { readonly status: 'started' }
  | { readonly status: 'too-soon'; readonly retryAt: string | null }
  | { readonly status: 'failed'; readonly error: StoreError };
