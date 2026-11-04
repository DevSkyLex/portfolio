import { HttpErrorResponse } from '@angular/common/http';
import { toTwoFactorError } from '@internal/identity-web-data-access/lib/utils/two-factor-error/two-factor-error.utils';

/**
 * Function problem
 *
 * @description
 * Builds a problem+json HTTP failure.
 *
 * @param {number} status - HTTP status.
 * @param {string} code - Optional problem code.
 *
 * @returns {HttpErrorResponse} Failure as `HttpClient` rejects it.
 */
function problem(status: number, code?: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: code ? { status, code, title: code } : null });
}

describe('toTwoFactorError', () => {
  it.each([
    [422, 'identity.password-mismatch', 'Mot de passe incorrect.'],
    [422, 'identity.totp-invalid', 'Code incorrect. Réessayez.'],
    [
      409,
      'identity.totp-state',
      'La double authentification a changé d’état entre-temps. Son état a été rechargé.',
    ],
  ])('maps %i %s to its French message', (status, code, message) => {
    expect(toTwoFactorError(problem(status, code))).toMatchObject({ status, code, message });
  });

  it('names an expired session for a 401 without a known code', () => {
    expect(toTwoFactorError(problem(401)).message).toBe(
      'Votre session a expiré. Reconnectez-vous.',
    );
  });

  it('keeps the generic messages otherwise', () => {
    expect(toTwoFactorError(problem(422, 'constructor')).message).toBe('La demande a été refusée.');
    expect(toTwoFactorError(problem(0))).toMatchObject({ retryable: true, code: null });
    expect(toTwoFactorError(new Error('boom')).message).toBe('Une erreur inattendue est survenue.');
  });
});
