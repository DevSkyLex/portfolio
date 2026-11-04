import { HttpErrorResponse } from '@angular/common/http';
import type { StoreError } from '@vfortin/web-http';
import { toOAuthError } from '@internal/identity-web-data-access/lib/utils/oauth-error/oauth-error.utils';

describe('toOAuthError', () => {
  it('uses the French message of a known code', () => {
    const failure: StoreError = toOAuthError(
      new HttpErrorResponse({
        status: 400,
        error: { status: 400, code: 'identity.oauth-invalid-client', title: 'x' },
      }),
    );
    expect(failure).toMatchObject({ code: 'identity.oauth-invalid-client', status: 400 });
    expect(failure.message).toMatch(/^L’application n’a pas pu être identifiée/);
  });

  it('explains an expired session and keeps other failures', () => {
    expect(toOAuthError(new HttpErrorResponse({ status: 401 })).message).toBe(
      'Votre session a expiré. Reconnectez-vous.',
    );
    const other: StoreError = toOAuthError(
      new HttpErrorResponse({ status: 500, error: { status: 500, code: 'internal', title: 'x' } }),
    );
    expect(other.code).toBe('internal');
    expect(toOAuthError(new Error('offline')).code).toBeNull();
  });
});
