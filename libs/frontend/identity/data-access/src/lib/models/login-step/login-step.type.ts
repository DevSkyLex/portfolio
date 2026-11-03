import type { StoreError } from '@vfortin/web-http';

/**
 * Type LoginStep
 * @type LoginStep
 *
 * @description
 * Outcome of the first login step: the session is open (trusted device), the one-time code is
 * required with its challenge, or the credentials were refused.
 */
export type LoginStep =
  | { readonly kind: 'authenticated' }
  | { readonly kind: 'code'; readonly challenge: string }
  | { readonly kind: 'failed'; readonly error: StoreError };
