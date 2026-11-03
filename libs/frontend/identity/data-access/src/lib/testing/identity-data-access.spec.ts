import type { LoginStep } from '@internal/identity-web-data-access/lib/models/login-step/login-step.type';

import type { StoreError } from '@vfortin/web-http';
import type { Mock } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from '@internal/identity-web-data-access/lib/http/interceptors/auth/auth.interceptor';
import { LoginFlowStore } from '@internal/identity-web-data-access/lib/state/login-flow/login-flow.store';
import { AdminSessionPort } from '@internal/identity-web-data-access/lib/ports/admin-session/admin-session.port';
import { provideAdminSession } from '@internal/identity-web-data-access/lib/providers/admin-session/admin-session.provider';
import { SessionStore } from '@internal/identity-web-data-access/lib/state/session/session.store';

/**
 * Function setup
 *
 * @description
 * Provides the authentication interceptor and HTTP testing backend, then returns the client, backend,
 * and session store used by each authentication case.
 *
 * @returns {{ http: HttpClient; backend: HttpTestingController; session: InstanceType<typeof SessionStore> }} Test dependencies for one auth data-access case.
 */
function setup(): {
  http: HttpClient;
  backend: HttpTestingController;
  session: InstanceType<typeof SessionStore>;
} {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  });
  return {
    http: TestBed.inject<HttpClient>(HttpClient),
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
    session: TestBed.inject<InstanceType<typeof SessionStore>>(SessionStore),
  };
}

/**
 * Function flushMicrotasks
 *
 * @description
 * Advances a timer turn so lazy module loading and interceptor promise work can settle.
 *
 * @returns {Promise<void>} Resolves on the next timer turn.
 */
const flushMicrotasks: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

describe('SessionStore', () => {
  it('opens the session on login and clears it on logout', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const login: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: true,
    });
    const sent: TestRequest = backend.expectOne('/api/auth/login');
    expect(sent.request.body).toEqual({ email: 'a@b.fr', password: 'p', remember: true });
    sent.flush({ status: 'authenticated', accessToken: 'jwt-1', expiresIn: 300 });
    await expect(login).resolves.toEqual({ kind: 'authenticated' });
    expect(session.authenticated()).toBe(true);

    const logout: Promise<boolean> = session.logout();
    const call: TestRequest = backend.expectOne('/api/auth/logout');
    expect(call.request.headers.get('x-csrf')).toBe('1');
    call.flush(null, { status: 204, statusText: 'No Content' });
    await logout;
    expect(session.authenticated()).toBe(false);
  });

  it('returns a readable error when login is rejected', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const login: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    backend
      .expectOne('/api/auth/login')
      .flush({ code: 'identity.invalid-credentials' }, { status: 401, statusText: 'Unauthorized' });
    await expect(login).resolves.toMatchObject({
      kind: 'failed',
      error: { code: 'identity.invalid-credentials' },
    });
  });

  it('asks for the one-time code, then opens the session once it is right', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const challenge: string = 'c'.repeat(43);
    const login: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'totp-required', challenge, expiresIn: 300 });
    await expect(login).resolves.toEqual({ kind: 'code', challenge });
    expect(session.authenticated()).toBe(false);

    const wrong: Promise<StoreError | null> = session.verifyCode({
      challenge,
      totp: '000000',
      trustDevice: false,
    });
    backend
      .expectOne('/api/auth/login/totp')
      .flush({ code: 'identity.invalid-credentials' }, { status: 401, statusText: 'Unauthorized' });
    await expect(wrong).resolves.toMatchObject({ code: 'identity.invalid-credentials' });

    const right: Promise<StoreError | null> = session.verifyCode({
      challenge,
      totp: '123456',
      trustDevice: true,
    });
    const call: TestRequest = backend.expectOne('/api/auth/login/totp');
    expect(call.request.headers.get('x-csrf')).toBe('1');
    expect(call.request.body).toEqual({ challenge, totp: '123456', trustDevice: true });
    call.flush({ accessToken: 'jwt-7', expiresIn: 300 });
    await expect(right).resolves.toBeNull();
    expect(session.accessToken()).toBe('jwt-7');
  });

  it('shares a single refresh between concurrent calls', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const a: Promise<boolean> = session.refresh();
    const b: Promise<boolean> = session.refresh();
    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'jwt-2', expiresIn: 600 });
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
    expect(session.accessToken()).toBe('jwt-2');
  });

  it('does not bring the session back when a refresh answers after the logout', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const refresh: Promise<boolean> = session.refresh();
    const call: TestRequest = backend.expectOne('/api/auth/refresh');
    const logout: Promise<boolean> = session.logout();
    expect(session.authenticated()).toBe(false);
    call.flush({ accessToken: 'jwt-late', expiresIn: 600 });
    await flushMicrotasks();
    backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await logout;
    await expect(refresh).resolves.toBe(false);
    expect(session.accessToken()).toBeNull();
  });

  it('clears a session refreshed just before the logout', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const refresh: Promise<boolean> = session.refresh();
    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'jwt-5', expiresIn: 600 });
    await expect(refresh).resolves.toBe(true);
    const logout: Promise<boolean> = session.logout();
    backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await logout;
    expect(session.accessToken()).toBeNull();
  });

  it('keeps a new login when an older refresh fails late', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const refresh: Promise<boolean> = session.refresh();
    const call: TestRequest = backend.expectOne('/api/auth/refresh');
    const login: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    backend.expectNone('/api/auth/login');
    call.flush(null, { status: 401, statusText: 'Unauthorized' });
    await flushMicrotasks();
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'authenticated', accessToken: 'jwt-6', expiresIn: 300 });
    await login;
    await expect(refresh).resolves.toBe(false);
    expect(session.accessToken()).toBe('jwt-6');
  });

  it('runs the refresh under a lock shared by the tabs', async () => {
    const request: Mock<(_name: string, call: () => Promise<unknown>) => Promise<unknown>> = vi.fn(
      (_name: string, call: () => Promise<unknown>) => call(),
    );
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    try {
      const { backend, session }: ReturnType<typeof setup> = setup();
      const refresh: Promise<boolean> = session.refresh();
      await flushMicrotasks();
      backend.expectOne('/api/auth/refresh').flush({ accessToken: 'jwt-4', expiresIn: 600 });
      await expect(refresh).resolves.toBe(true);
      expect(request).toHaveBeenCalledWith('portfolio-admin-refresh', expect.any(Function));
    } finally {
      Reflect.deleteProperty(navigator, 'locks');
    }
  });
});

describe('authInterceptor', () => {
  it('adds no token outside the admin area', async () => {
    const { http, backend }: ReturnType<typeof setup> = setup();
    void firstValueFrom(http.get<unknown>('/api/content/snapshot'));
    await flushMicrotasks();
    expect(backend.expectOne('/api/content/snapshot').request.headers.has('authorization')).toBe(
      false,
    );
  });

  it('refreshes the session then adds the token', async () => {
    const { http, backend }: ReturnType<typeof setup> = setup();
    const result: Promise<unknown> = firstValueFrom(
      http.get<unknown>('/api/content/admin/projects'),
    );
    await flushMicrotasks();
    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'jwt-3', expiresIn: 600 });
    await flushMicrotasks();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects');
    expect(call.request.headers.get('authorization')).toBe('Bearer jwt-3');
    call.flush({ ok: true });
    await expect(result).resolves.toEqual({ ok: true });
  });

  it('clears the session if the refresh fails after a 401', async () => {
    const { http, backend, session }: ReturnType<typeof setup> = setup();
    const login: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'authenticated', accessToken: 'jwt-1', expiresIn: 300 });
    await login;

    const result: Promise<unknown> = firstValueFrom(
      http.get<unknown>('/api/contact/admin/messages'),
    );
    await flushMicrotasks();
    backend
      .expectOne('/api/contact/admin/messages')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await flushMicrotasks();
    backend.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(session.authenticated()).toBe(false);
  });
});

describe('session authority and revocation', () => {
  it('does not authenticate from code verification superseded by logout', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const verify: Promise<StoreError | null> = session.verifyCode({
      challenge: 'c',
      totp: '123456',
      trustDevice: false,
    });
    const accepted: TestRequest = backend.expectOne('/api/auth/login/totp');
    const logout: Promise<boolean> = session.logout();
    accepted.flush({ accessToken: 'obsolete', expiresIn: 300 });
    expect(await verify).not.toBeNull();
    await flushMicrotasks();
    backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await logout;
    expect(session.authenticated()).toBe(false);
  });

  it('allows an explicit login after failed revocation and clears its obsolete failure', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const logout: Promise<boolean> = session.logout();
    backend.expectOne('/api/auth/logout').flush(null, { status: 503, statusText: 'Unavailable' });
    await logout;
    const login: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'authenticated', accessToken: 'new', expiresIn: 300 });
    await login;
    expect(session.authenticated()).toBe(true);
    expect(session.logoutCallState().status).toBe('idle');
    await expect(session.validToken()).resolves.toBe('new');
  });

  it('does not authenticate from a login response superseded by logout', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const login: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    const accepted: TestRequest = backend.expectOne('/api/auth/login');
    const logout: Promise<boolean> = session.logout();
    accepted.flush({ status: 'authenticated', accessToken: 'obsolete', expiresIn: 300 });
    await expect(login).resolves.toMatchObject({ kind: 'failed' });
    await flushMicrotasks();
    backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await logout;
    expect(session.authenticated()).toBe(false);
  });

  it('captures authority before the lazy session module resolves', async () => {
    const { http, backend, session }: ReturnType<typeof setup> = setup();
    const response: Promise<unknown> = firstValueFrom(
      http.get<unknown>('/api/content/admin/projects'),
    );
    const rejected: Promise<void> = expect(response).rejects.toMatchObject({ status: 401 });
    session.clear();
    await flushMicrotasks();
    await rejected;
    backend.expectNone('/api/content/admin/projects');
    backend.expectNone('/api/auth/refresh');
  });

  it('rejects a late 401 without refreshing or clearing a replacement login', async () => {
    const { http, backend, session }: ReturnType<typeof setup> = setup();
    const first: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'authenticated', accessToken: 'old', expiresIn: 300 });
    await first;
    const response: Promise<unknown> = firstValueFrom(
      http.get<unknown>('/api/content/admin/projects'),
    );
    const rejected: Promise<void> = expect(response).rejects.toMatchObject({ status: 401 });
    await flushMicrotasks();
    const request: TestRequest = backend.expectOne('/api/content/admin/projects');
    const login: Promise<LoginStep> = session.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'authenticated', accessToken: 'new', expiresIn: 300 });
    await login;
    request.flush(null, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    backend.expectNone('/api/auth/refresh');
    expect(session.accessToken()).toBe('new');
  });

  it('keeps a failed logout observable and blocks silent cookie recovery until explicit login', async () => {
    const { backend, session }: ReturnType<typeof setup> = setup();
    const logout: Promise<boolean> = session.logout();
    expect(session.logoutCallState().status).toBe('pending');
    backend.expectOne('/api/auth/logout').flush(null, { status: 503, statusText: 'Unavailable' });
    await expect(logout).resolves.toBe(false);
    expect(session.logoutCallState().status).toBe('error');
    await expect(session.refresh()).resolves.toBe(false);
    backend.expectNone('/api/auth/refresh');
    const retry: Promise<boolean> = session.logout();
    backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await expect(retry).resolves.toBe(true);
    expect(session.logoutCallState().status).toBe('success');
  });

  it.each([true, false])(
    'serializes cookie-changing login behind refresh with Web Locks=%s',
    async (withLocks) => {
      let queue: Promise<void> = Promise.resolve();
      const request: Mock<(_name: string, call: () => Promise<unknown>) => Promise<unknown>> =
        vi.fn((_name: string, call: () => Promise<unknown>) => {
          const next: Promise<unknown> = queue.then(call);
          queue = next.then(
            () => undefined,
            () => undefined,
          );
          return next;
        });
      if (withLocks)
        Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
      try {
        const { backend, session }: ReturnType<typeof setup> = setup();
        const refresh: Promise<boolean> = session.refresh();
        await flushMicrotasks();
        const renewal: TestRequest = backend.expectOne('/api/auth/refresh');
        const login: Promise<LoginStep> = session.login({
          email: 'a@b.fr',
          password: 'p',
          remember: false,
        });
        backend.expectNone('/api/auth/login');
        renewal.flush({ accessToken: 'old', expiresIn: 300 });
        await refresh;
        await flushMicrotasks();
        backend
          .expectOne('/api/auth/login')
          .flush({ status: 'authenticated', accessToken: 'new', expiresIn: 300 });
        await login;
        expect(session.accessToken()).toBe('new');
        expect(request).toHaveBeenCalledTimes(withLocks ? 2 : 0);
      } finally {
        Reflect.deleteProperty(navigator, 'locks');
      }
    },
  );
});

describe('LoginFlowStore', () => {
  it('owns pending and failed credential/code states and binds the shell to root authority', async () => {
    TestBed.configureTestingModule({ providers: [LoginFlowStore, provideAdminSession()] });
    const { backend, session }: ReturnType<typeof setup> = setup();
    const flow: InstanceType<typeof LoginFlowStore> =
      TestBed.inject<InstanceType<typeof LoginFlowStore>>(LoginFlowStore);
    expect(TestBed.inject<AdminSessionPort>(AdminSessionPort)).toBe(session);
    const login: Promise<LoginStep> = flow.login({
      email: 'a@b.fr',
      password: 'p',
      remember: false,
    });
    expect(flow.pending()).toBe(true);
    expect(flow.credentialsCallState().status).toBe('pending');
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'totp-required', challenge: 'c', expiresIn: 300 });
    await login;
    expect(flow.pending()).toBe(false);
    expect(flow.credentialsCallState().status).toBe('success');
    const verify: Promise<StoreError | null> = flow.verifyCode({
      challenge: 'c',
      totp: '123456',
      trustDevice: false,
    });
    backend
      .expectOne('/api/auth/login/totp')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await verify;
    expect(flow.verificationCallState().status).toBe('error');
  });
});
