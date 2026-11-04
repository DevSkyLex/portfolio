import type { TwoFactorStoreType } from '@vfortin/identity-web-data-access';

/**
 * Type TwoFactorMaterial
 * @type TwoFactorMaterial
 *
 * @description
 * Pending secret and `otpauth://` URI returned by the enrollment's password step; derived from the
 * store because a feature does not read the contracts.
 */
export type TwoFactorMaterial = NonNullable<Awaited<ReturnType<TwoFactorStoreType['setup']>>>;
