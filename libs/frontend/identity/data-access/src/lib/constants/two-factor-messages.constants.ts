import type { TwoFactorErrorCode } from '@internal/identity-web-data-access/lib/models/two-factor-error-code/two-factor-error-code.type';

/**
 * Constant TWO_FACTOR_ERROR_MESSAGES
 *
 * @description
 * Localized messages of the second-factor problem codes (French source, English targets): 422 for a
 * wrong password or code, 409 when the state changed meanwhile (the store then reloads the status).
 *
 * @type {Readonly<Record<TwoFactorErrorCode, string>>}
 */
export const TWO_FACTOR_ERROR_MESSAGES: Readonly<Record<TwoFactorErrorCode, string>> = {
  'identity.password-mismatch': $localize`:@@admin.identity.twoFactorError.passwordMismatch:Mot de passe incorrect.`,
  'identity.totp-invalid': $localize`:@@admin.identity.twoFactorError.totpInvalid:Code incorrect. Réessayez.`,
  'identity.totp-state': $localize`:@@admin.identity.twoFactorError.totpState:La double authentification a changé d’état entre-temps. Son état a été rechargé.`,
};

/**
 * Constant TWO_FACTOR_SESSION_EXPIRED
 *
 * @description
 * Message of a 401 that survived the interceptor's refresh: the session is gone and the next
 * navigation returns to the login.
 *
 * @type {string}
 */
export const TWO_FACTOR_SESSION_EXPIRED: string = $localize`:@@admin.identity.sessionExpired:Votre session a expiré. Reconnectez-vous.`;
