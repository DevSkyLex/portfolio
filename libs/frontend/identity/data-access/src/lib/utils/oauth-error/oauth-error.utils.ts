import { type StoreError, toStoreError } from '@vfortin/web-http';
import { TWO_FACTOR_SESSION_EXPIRED } from '@internal/identity-web-data-access/lib/constants/two-factor-messages.constants';
import { OAUTH_ERROR_MESSAGES } from '@internal/identity-web-data-access/lib/constants/oauth-messages.constants';

/**
 * Function toOAuthError
 *
 * @description
 * Normalizes a failure of the administrator OAuth routes with `toStoreError`, then replaces the
 * generic message by the localized text of a known problem code (D45), or of an expired session for a
 * 401 that survived the interceptor's refresh.
 *
 * @param {unknown} error - Rejected value caught by the store.
 *
 * @returns {StoreError} Failure with its readable message, code and status.
 */
export function toOAuthError(error: unknown): StoreError {
  const failure: StoreError = toStoreError(error);
  const message: string | undefined =
    failure.code === null ? undefined : OAUTH_ERROR_MESSAGES[failure.code];
  if (message !== undefined) {
    return { ...failure, message };
  }
  return failure.status === 401 ? { ...failure, message: TWO_FACTOR_SESSION_EXPIRED } : failure;
}
