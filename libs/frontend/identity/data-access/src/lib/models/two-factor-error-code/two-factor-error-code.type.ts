import type { TWO_FACTOR_ERROR_CODES } from '@vfortin/identity-contracts';

/**
 * Type TwoFactorErrorCode
 * @type TwoFactorErrorCode
 *
 * @description
 * Problem codes of the second-factor routes, derived from the contract without importing its value:
 * the browser bundle carries no contract runtime (D10).
 */
export type TwoFactorErrorCode =
  (typeof TWO_FACTOR_ERROR_CODES)[keyof typeof TWO_FACTOR_ERROR_CODES];
