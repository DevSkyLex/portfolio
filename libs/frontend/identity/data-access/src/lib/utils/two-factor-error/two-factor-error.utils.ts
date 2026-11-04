import { type StoreError, toStoreError } from '@vfortin/web-http';
import {
  TWO_FACTOR_ERROR_MESSAGES,
  TWO_FACTOR_SESSION_EXPIRED,
} from '@internal/identity-web-data-access/lib/constants/two-factor-messages.constants';
import type { TwoFactorErrorCode } from '@internal/identity-web-data-access/lib/models/two-factor-error-code/two-factor-error-code.type';

/**
 * Function isTwoFactorErrorCode
 *
 * @description
 * Narrows a problem code to one of the second-factor codes.
 *
 * @param {string | null} code - Code of the normalized failure.
 *
 * @returns {boolean} Whether the code has a dedicated message.
 */
function isTwoFactorErrorCode(code: string | null): code is TwoFactorErrorCode {
  return code !== null && Object.hasOwn(TWO_FACTOR_ERROR_MESSAGES, code);
}

/**
 * Function toTwoFactorError
 *
 * @description
 * Normalizes a second-factor failure with `toStoreError`, then replaces the generic message by the
 * localized text of a known problem code, or of an expired session for a 401.
 *
 * @param {unknown} error - Rejected value caught by the store.
 *
 * @returns {StoreError} Failure carrying the readable message, the stable code and the status.
 */
export function toTwoFactorError(error: unknown): StoreError {
  const failure: StoreError = toStoreError(error);
  if (isTwoFactorErrorCode(failure.code)) {
    return { ...failure, message: TWO_FACTOR_ERROR_MESSAGES[failure.code] };
  }
  return failure.status === 401 ? { ...failure, message: TWO_FACTOR_SESSION_EXPIRED } : failure;
}
