import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { getState } from '@ngrx/signals';
import type { TwoFactorSetupResponse, TwoFactorStatusResponse } from '@vfortin/identity-contracts';
import { type Observable, Subject, of, throwError } from 'rxjs';
import type { Mock } from 'vitest';
import { TwoFactorApiService } from '@internal/identity-web-data-access/lib/services/two-factor-api/two-factor-api.service';
import {
  TwoFactorStore,
  type TwoFactorStoreType,
} from '@internal/identity-web-data-access/lib/state/two-factor/two-factor.store';

/**
 * Constant SETUP
 *
 * @description
 * Pending material answered by a successful setup.
 */
const SETUP: TwoFactorSetupResponse = {
  secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
  provisioningUri: 'otpauth://totp/Portfolio:admin?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
};

/**
 * Interface ApiDouble
 *
 * @description
 * Mocked methods of the second-factor client.
 */
interface ApiDouble {
  readonly status: Mock<() => Observable<TwoFactorStatusResponse>>;
  readonly setup: Mock<() => Observable<TwoFactorSetupResponse>>;
  readonly enable: Mock<() => Observable<TwoFactorStatusResponse>>;
  readonly disable: Mock<() => Observable<TwoFactorStatusResponse>>;
}

/**
 * Function problem
 *
 * @description
 * Builds the problem+json failure the identity service answers.
 *
 * @param {number} status - HTTP status.
 * @param {string} code - Stable problem code.
 *
 * @returns {Observable<never>} Failing observable.
 */
function problem(status: number, code?: string): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status, error: code ? { status, code, title: code } : null }),
  );
}

/**
 * Function setup
 *
 * @description
 * Provides the store with a mocked client.
 *
 * @returns {{ store: TwoFactorStoreType; api: ApiDouble }} Store and client double.
 */
function setup(): { store: TwoFactorStoreType; api: ApiDouble } {
  const api: ApiDouble = {
    status: vi.fn(() => of({ enabled: false })),
    setup: vi.fn(() => of(SETUP)),
    enable: vi.fn(() => of({ enabled: true })),
    disable: vi.fn(() => of({ enabled: false })),
  };
  TestBed.configureTestingModule({
    providers: [TwoFactorStore, { provide: TwoFactorApiService, useValue: api }],
  });
  return { store: TestBed.inject<TwoFactorStoreType>(TwoFactorStore), api };
}

describe('TwoFactorStore', () => {
  it('loads the status, and keeps a readable failure', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    expect(store.enabled()).toBeNull();
    await store.load();
    expect(store.enabled()).toBe(false);
    expect(store.loadCallState().status).toBe('success');

    api.status.mockReturnValue(problem(503));
    await store.load();
    expect(store.loadCallState().status).toBe('error');
    expect(store.loadCallState().error?.message).toBe(
      'Le service ne répond pas. Réessayez dans un moment.',
    );
    expect(store.enabled()).toBe(false);
  });

  it('returns the pending material to the caller without keeping it in state', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    await expect(store.setup('a-strong-password')).resolves.toEqual(SETUP);
    expect(api.setup).toHaveBeenCalledWith({ password: 'a-strong-password' });
    expect(store.setupCallState().status).toBe('success');
    expect(JSON.stringify(getState(store))).not.toContain(SETUP.secret);
  });

  it('maps a wrong password to its French message and keeps the code', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.setup.mockReturnValue(problem(422, 'identity.password-mismatch'));
    await expect(store.setup('wrong')).resolves.toBeNull();
    expect(store.setupCallState().error).toMatchObject({
      status: 422,
      code: 'identity.password-mismatch',
      message: 'Mot de passe incorrect.',
    });
  });

  it('enables with a code, then reports a wrong code on the enable call', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    await store.load();
    api.enable.mockReturnValueOnce(problem(422, 'identity.totp-invalid'));
    await expect(store.enable('000000')).resolves.toBe(false);
    expect(store.enableCallState().error).toMatchObject({
      code: 'identity.totp-invalid',
      message: 'Code incorrect. Réessayez.',
    });
    expect(store.enabled()).toBe(false);

    await expect(store.enable('123456')).resolves.toBe(true);
    expect(api.enable).toHaveBeenLastCalledWith({ totp: '123456' });
    expect(store.enabled()).toBe(true);
    expect(store.enableCallState().status).toBe('success');
  });

  it('disables with both factors', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.status.mockReturnValue(of({ enabled: true }));
    await store.load();
    await expect(store.disable({ password: 'p', totp: '123456' })).resolves.toBe(true);
    expect(api.disable).toHaveBeenCalledWith({ password: 'p', totp: '123456' });
    expect(store.enabled()).toBe(false);
  });

  it('reloads the status after a state conflict', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    await store.load();
    api.status.mockReturnValue(of({ enabled: true }));
    api.setup.mockReturnValue(problem(409, 'identity.totp-state'));
    await expect(store.setup('p')).resolves.toBeNull();
    expect(store.setupCallState().error?.message).toBe(
      'La double authentification a changé d’état entre-temps. Son état a été rechargé.',
    );
    await Promise.resolve();
    expect(api.status).toHaveBeenCalledTimes(2);
    expect(store.enabled()).toBe(true);
  });

  it('names an expired session on a 401 and keeps other failures generic', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    api.disable.mockReturnValueOnce(problem(401));
    await store.disable({ password: 'p', totp: '123456' });
    expect(store.disableCallState().error?.message).toBe(
      'Votre session a expiré. Reconnectez-vous.',
    );
    api.disable.mockReturnValueOnce(problem(400, 'request.invalid'));
    await store.disable({ password: 'p', totp: '123456' });
    expect(store.disableCallState().error?.message).toBe('La demande a été refusée.');
  });

  it('runs one command at a time and resets the outcomes between dialogs', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    const answer: Subject<TwoFactorSetupResponse> = new Subject<TwoFactorSetupResponse>();
    api.setup.mockReturnValue(answer);
    const first: Promise<TwoFactorSetupResponse | null> = store.setup('p');
    expect(store.writing()).toBe(true);
    await expect(store.setup('p')).resolves.toBeNull();
    await expect(store.enable('123456')).resolves.toBe(false);
    await expect(store.disable({ password: 'p', totp: '123456' })).resolves.toBe(false);
    store.resetCommands();
    expect(store.setupCallState().status).toBe('pending');
    answer.next(SETUP);
    answer.complete();
    await first;
    expect(api.setup).toHaveBeenCalledTimes(1);
    api.enable.mockReturnValueOnce(problem(422, 'identity.totp-invalid'));
    await store.enable('000000');
    store.resetCommands();
    expect(store.setupCallState().status).toBe('idle');
    expect(store.enableCallState().status).toBe('idle');
  });

  it('ignores a status read that answers after a newer write', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    const late: Subject<TwoFactorStatusResponse> = new Subject<TwoFactorStatusResponse>();
    api.status.mockReturnValue(late);
    const read: Promise<void> = store.load();
    expect(store.loading()).toBe(true);
    await store.enable('123456');
    late.next({ enabled: false });
    late.complete();
    await read;
    expect(store.enabled()).toBe(true);
    expect(store.loadCallState().status).toBe('success');
  });

  it('keeps only the latest read in the load call state', async () => {
    const { store, api }: ReturnType<typeof setup> = setup();
    const slow: Subject<TwoFactorStatusResponse> = new Subject<TwoFactorStatusResponse>();
    api.status.mockReturnValueOnce(slow);
    const first: Promise<void> = store.load();
    await store.load();
    slow.error(new HttpErrorResponse({ status: 503 }));
    await first;
    expect(store.loadCallState().status).toBe('success');
  });
});
