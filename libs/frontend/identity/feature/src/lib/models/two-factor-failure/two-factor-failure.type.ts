import type { TwoFactorStoreType } from '@vfortin/identity-web-data-access';

/**
 * Type TwoFactorFailure
 * @type TwoFactorFailure
 *
 * @description
 * Normalized failure of a second-factor command, `null` when there is none; derived from the store so
 * the feature needs no transport import.
 */
export type TwoFactorFailure = ReturnType<TwoFactorStoreType['setupCallState']>['error'];
