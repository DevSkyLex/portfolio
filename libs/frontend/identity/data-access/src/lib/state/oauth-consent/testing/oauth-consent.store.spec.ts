import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type {
  AuthorizationConsent,
  AuthorizationRedirect,
  AuthorizationReviewResponse,
} from '@vfortin/identity-contracts';
import { type Observable, Subject, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { OAuthApiService } from '@internal/identity-web-data-access/lib/services/oauth-api/oauth-api.service';
import {
  OAuthConsentStore,
  type OAuthConsentStoreType,
} from '@internal/identity-web-data-access/lib/state/oauth-consent/oauth-consent.store';

/**
 * Constant CONSENT
 *
 * @description
 * Consent answer of a metadata-document client.
 */
const CONSENT: AuthorizationConsent = {
  status: 'consent',
  requestId: 'r1',
  expiresIn: 600,
  client: {
    clientId: 'https://claude.ai/oauth/client',
    name: 'Claude',
    clientUri: null,
    logo: null,
    registration: 'metadata-document',
  },
  redirectUri: 'https://claude.ai/api/mcp/auth_callback',
  redirectHost: 'claude.ai',
  loopbackRedirect: false,
  scopes: ['content:read'],
  grantedScopes: [],
  resource: 'https://valentin-fortin.pro/api/content/mcp',
};

/**
 * Interface ApiDouble
 *
 * @description
 * Mocked methods of the OAuth client used by the store.
 */
interface ApiDouble {
  readonly review: Mock<() => Observable<AuthorizationReviewResponse>>;
  readonly approve: Mock<() => Observable<AuthorizationRedirect>>;
  readonly deny: Mock<() => Observable<AuthorizationRedirect>>;
}

/**
 * Function setup
 *
 * @description
 * Provides the store with a mocked client.
 *
 * @returns {{ store: OAuthConsentStoreType; api: ApiDouble }} Store and double.
 */
function setup(): { store: OAuthConsentStoreType; api: ApiDouble } {
  const api: ApiDouble = { review: vi.fn(), approve: vi.fn(), deny: vi.fn() };
  TestBed.configureTestingModule({
    providers: [OAuthConsentStore, { provide: OAuthApiService, useValue: api }],
  });
  return { store: TestBed.inject<OAuthConsentStoreType>(OAuthConsentStore), api };
}

describe('OAuthConsentStore', () => {
  it('keeps a consent, then returns the redirect of the decision', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.review.mockReturnValue(of(CONSENT));
    expect(await store.review({ client_id: 'x' })).toBeNull();
    expect(store.consent()).toEqual(CONSENT);
    expect(store.loadCallState().status).toBe('success');
    api.approve.mockReturnValue(
      of({ status: 'redirect', redirectTo: 'https://claude.ai/cb?code=c' }),
    );
    expect(await store.decide('approve')).toBe('https://claude.ai/cb?code=c');
    expect(api.approve).toHaveBeenCalledWith('r1');
    api.deny.mockReturnValue(
      of({ status: 'redirect', redirectTo: 'https://claude.ai/cb?error=x' }),
    );
    expect(await store.decide('deny')).toBe('https://claude.ai/cb?error=x');
    expect(api.deny).toHaveBeenCalledWith('r1');
  });

  it('returns an error redirect without keeping a consent', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.review.mockReturnValue(of({ status: 'redirect', redirectTo: 'https://c.fr/cb?error=e' }));
    expect(await store.review({})).toBe('https://c.fr/cb?error=e');
    expect(store.consent()).toBeNull();
    expect(await store.decide('approve')).toBeNull();
    expect(api.approve).not.toHaveBeenCalled();
  });

  it('translates the refusals of the review and the decision', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.review.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { status: 400, code: 'identity.oauth-invalid-redirect-uri', title: 'x' },
          }),
      ),
    );
    expect(await store.review({})).toBeNull();
    expect(store.loadCallState().error?.message).toBe(
      'L’adresse de retour demandée n’est pas déclarée par cette application. Aucune redirection n’a été faite.',
    );
    api.review.mockReturnValue(of(CONSENT));
    await store.review({});
    api.approve.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { status: 404, code: 'identity.oauth-request-expired', title: 'x' },
          }),
      ),
    );
    expect(await store.decide('approve')).toBeNull();
    expect(store.decideCallState().error?.message).toBe(
      'Cette demande a expiré ou a déjà été traitée. Relancez la connexion depuis l’application.',
    );
  });

  it('ignores a second review or decision while one runs', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    const pending: Subject<AuthorizationReviewResponse> =
      new Subject<AuthorizationReviewResponse>();
    api.review.mockReturnValue(pending);
    const first: Promise<string | null> = store.review({});
    expect(store.loading()).toBe(true);
    expect(await store.review({})).toBeNull();
    pending.next(CONSENT);
    pending.complete();
    await first;
    const decision: Subject<AuthorizationRedirect> = new Subject<AuthorizationRedirect>();
    api.approve.mockReturnValue(decision);
    const approving: Promise<string | null> = store.decide('approve');
    expect(store.deciding()).toBe(true);
    expect(await store.decide('deny')).toBeNull();
    decision.next({ status: 'redirect', redirectTo: 'https://c.fr/cb?code=1' });
    decision.complete();
    expect(await approving).toBe('https://c.fr/cb?code=1');
  });
});
