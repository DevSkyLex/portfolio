import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type {
  ConnectedApplication,
  ConnectedApplicationsResponse,
} from '@vfortin/identity-contracts';
import { type Observable, Subject, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { OAuthApiService } from '@internal/identity-web-data-access/lib/services/oauth-api/oauth-api.service';
import {
  ConnectedApplicationsStore,
  type ConnectedApplicationsStoreType,
} from '@internal/identity-web-data-access/lib/state/connected-applications/connected-applications.store';

/**
 * Function application
 *
 * @description
 * Builds a listed application.
 *
 * @param {string} id - Grant identifier.
 *
 * @returns {ConnectedApplication} Application.
 */
function application(id: string): ConnectedApplication {
  return {
    id,
    clientId: `https://${id}.fr/client.json`,
    name: id,
    logo: null,
    host: `${id}.fr`,
    registration: 'metadata-document',
    scopes: ['content:read'],
    createdAt: '2026-11-04T10:00:00.000Z',
    lastUsedAt: null,
  };
}

/**
 * Interface ApiDouble
 *
 * @description
 * Mocked methods of the OAuth client used by the store.
 */
interface ApiDouble {
  readonly applications: Mock<() => Observable<ConnectedApplicationsResponse>>;
  readonly revoke: Mock<() => Observable<void>>;
}

/**
 * Function setup
 *
 * @description
 * Provides the store with a mocked client.
 *
 * @returns {{ store: ConnectedApplicationsStoreType; api: ApiDouble }} Store and double.
 */
function setup(): { store: ConnectedApplicationsStoreType; api: ApiDouble } {
  const api: ApiDouble = { applications: vi.fn(), revoke: vi.fn() };
  TestBed.configureTestingModule({
    providers: [ConnectedApplicationsStore, { provide: OAuthApiService, useValue: api }],
  });
  return { store: TestBed.inject<ConnectedApplicationsStoreType>(ConnectedApplicationsStore), api };
}

/**
 * Function problem
 *
 * @description
 * Builds a problem+json failure.
 *
 * @param {number} status - HTTP status.
 * @param {string} code - Problem code.
 *
 * @returns {Observable<never>} Failing observable.
 */
function problem(status: number, code: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, code, title: code } }));
}

describe('ConnectedApplicationsStore', () => {
  it('loads the list and removes a revoked application', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.applications.mockReturnValue(of({ items: [application('a'), application('b')] }));
    await store.load();
    expect(store.applications()?.map((one: ConnectedApplication): string => one.id)).toEqual([
      'a',
      'b',
    ]);
    api.revoke.mockReturnValue(of(undefined));
    expect(await store.revoke('a')).toBe(true);
    expect(api.revoke).toHaveBeenCalledWith('a');
    expect(store.applications()?.map((one: ConnectedApplication): string => one.id)).toEqual(['b']);
    expect(store.revokingId()).toBeNull();
  });

  it('reloads after a revocation answered not found, and keeps other failures', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.applications.mockReturnValue(of({ items: [application('a')] }));
    await store.load();
    api.revoke.mockReturnValue(problem(404, 'identity.oauth-application-not-found'));
    api.applications.mockReturnValue(of({ items: [] }));
    expect(await store.revoke('a')).toBe(false);
    expect(store.revokeCallState().error?.message).toBe(
      'Cette application n’est plus connectée. La liste a été rechargée.',
    );
    await vi.waitFor(() => expect(store.applications()).toEqual([]));
    api.revoke.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    expect(await store.revoke('b')).toBe(false);
    expect(store.revokeCallState().error?.message).toBe(
      'Votre session a expiré. Reconnectez-vous.',
    );
    expect(api.applications).toHaveBeenCalledTimes(2);
  });

  it('reports a failed read and ignores a superseded one', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.applications.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await store.load();
    expect(store.loadCallState().status).toBe('error');
    expect(store.applications()).toBeNull();
    const slow: Subject<ConnectedApplicationsResponse> =
      new Subject<ConnectedApplicationsResponse>();
    api.applications
      .mockReturnValueOnce(slow)
      .mockReturnValueOnce(of({ items: [application('new')] }));
    const first: Promise<void> = store.load();
    await store.load();
    slow.next({ items: [application('old')] });
    slow.complete();
    await first;
    expect(store.applications()?.[0]?.id).toBe('new');
  });

  it('runs one revocation at a time', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    const pending: Subject<void> = new Subject<void>();
    api.revoke.mockReturnValue(pending);
    const first: Promise<boolean> = store.revoke('a');
    expect([store.revoking(), store.revokingId()]).toEqual([true, 'a']);
    expect(await store.revoke('b')).toBe(false);
    pending.next();
    pending.complete();
    expect(await first).toBe(true);
    expect(store.applications()).toEqual([]);
  });
});
