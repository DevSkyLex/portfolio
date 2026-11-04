import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  AuthorizationRedirect,
  AuthorizationReviewResponse,
  ConnectedApplicationsResponse,
} from '@vfortin/identity-contracts';
import { firstValueFrom } from 'rxjs';
import { OAuthApiService } from '@internal/identity-web-data-access/lib/services/oauth-api/oauth-api.service';

/**
 * Function setup
 *
 * @description
 * Provides the service over the HTTP testing backend.
 *
 * @returns {{ api: OAuthApiService; backend: HttpTestingController }} Service and backend.
 */
function setup(): { api: OAuthApiService; backend: HttpTestingController } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return {
    api: TestBed.inject<OAuthApiService>(OAuthApiService),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
  };
}

describe('OAuthApiService', () => {
  afterEach(() => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('posts the authorization query for review', async () => {
    const { api, backend }: ReturnType<typeof setup> = setup();
    const answer: Promise<AuthorizationReviewResponse> = firstValueFrom(
      api.review({ client_id: 'https://c.fr/m.json', scope: 'content:read' }),
    );
    const call: TestRequest = backend.expectOne('/api/auth/admin/oauth/authorizations');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ client_id: 'https://c.fr/m.json', scope: 'content:read' });
    call.flush({ status: 'redirect', redirectTo: 'https://c.fr/cb?error=x' });
    await expect(answer).resolves.toEqual({
      status: 'redirect',
      redirectTo: 'https://c.fr/cb?error=x',
    });
  });

  it('approves and denies by request identifier', async () => {
    const { api, backend }: ReturnType<typeof setup> = setup();
    const approved: Promise<AuthorizationRedirect> = firstValueFrom(api.approve('r/1'));
    const approve: TestRequest = backend.expectOne(
      '/api/auth/admin/oauth/authorizations/r%2F1/approve',
    );
    expect(approve.request.method).toBe('POST');
    approve.flush({ status: 'redirect', redirectTo: 'https://c.fr/cb?code=x' });
    await expect(approved).resolves.toMatchObject({ redirectTo: 'https://c.fr/cb?code=x' });
    const denied: Promise<AuthorizationRedirect> = firstValueFrom(api.deny('r1'));
    backend
      .expectOne('/api/auth/admin/oauth/authorizations/r1/deny')
      .flush({ status: 'redirect', redirectTo: 'https://c.fr/cb?error=access_denied' });
    await expect(denied).resolves.toMatchObject({ status: 'redirect' });
  });

  it('lists and revokes connected applications', async () => {
    const { api, backend }: ReturnType<typeof setup> = setup();
    const listed: Promise<ConnectedApplicationsResponse> = firstValueFrom(api.applications());
    const list: TestRequest = backend.expectOne('/api/auth/admin/oauth/applications');
    expect(list.request.method).toBe('GET');
    list.flush({ items: [] });
    await expect(listed).resolves.toEqual({ items: [] });
    const revoked: Promise<void> = firstValueFrom(api.revoke('g1'));
    const revoke: TestRequest = backend.expectOne('/api/auth/admin/oauth/applications/g1');
    expect(revoke.request.method).toBe('DELETE');
    revoke.flush(null, { status: 204, statusText: 'No Content' });
    await expect(revoked).resolves.toBeNull();
  });
});
