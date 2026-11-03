import type { Observable } from 'rxjs';
import { SessionStore } from '@vfortin/identity-web-data-access';
import { IDENTITY_LOGIN_ROUTES } from '@internal/identity-web-feature/lib/identity-login.routes';
import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type MaybeAsync,
  type GuardResult,
  type Route,
  Router,
  UrlTree,
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { adminGuard } from '@internal/identity-web-feature/lib/http/guards/admin/admin.guard';
import { LoginPageComponent } from '@internal/identity-web-feature/lib/ui/pages/login-page/login-page.component';

/**
 * Component DashboardComponent
 * @class DashboardComponent
 *
 * @description
 * Minimal protected route target used to verify admin guard redirects and post-login navigation.
 */
@Component({ template: 'Dashboard' })
class DashboardComponent {}

/**
 * Function flush
 *
 * @description
 * Advances a timer turn so scheduled router and form work can complete in the test harness.
 *
 * @returns {Promise<void>} Resolves on the next timer turn.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

/**
 * Function fill
 *
 * @description
 * Enters values into login controls and dispatches input events to update Signal Forms state.
 *
 * @param {HTMLElement} root - Root element containing the login form.
 * @param {Readonly<Record<string, string>>} values - Control ids mapped to entered values.
 *
 * @returns {void} Dispatches input events for each provided field value.
 */
function fill(root: HTMLElement, values: Readonly<Record<string, string>>): void {
  for (const [id, value] of Object.entries(values)) {
    const field: HTMLInputElement | null = root.querySelector<HTMLInputElement>(`#${id}`);
    if (!field) throw new Error(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }
}

/**
 * Function submitForm
 *
 * @description
 * Dispatches a cancelable submit event to exercise the login page's Signal Forms handler.
 *
 * @param {HTMLElement} root - Root element containing the login form.
 *
 * @returns {void} Dispatches the form submit event without browser navigation.
 */
function submitForm(root: HTMLElement): void {
  root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
}

/**
 * Constant validCredentials
 *
 * @description
 * Valid first-screen values used by the login scenarios.
 */
const validCredentials: { 'login-email': string; 'login-password': string } = {
  'login-email': 'me@example.com',
  'login-password': 'a-strong-password',
};

/**
 * Constant CHALLENGE
 *
 * @description
 * Opaque challenge returned by the first login step when the code is required.
 */
const CHALLENGE: string = 'c'.repeat(43);

/**
 * Function tick
 *
 * @description
 * Clicks a checkbox or button found by its visible text inside the page.
 *
 * @param {HTMLElement} root - Page element.
 * @param {string} text - Text of the label or button to click.
 */
function tick(root: HTMLElement, text: string): void {
  const target: HTMLElement | undefined = [
    ...root.querySelectorAll<HTMLElement>('label, button'),
  ].find((element) => element.textContent?.includes(text));
  if (!target) throw new Error(text);
  (target.querySelector<HTMLInputElement>('input[type="checkbox"]') ?? target).click();
}

/**
 * Function setup
 *
 * @description
 * Configures HTTP testing and login/protected routes, returning the backend for request assertions.
 *
 * @returns {HttpTestingController} Mock backend registered in the current TestBed.
 */
function setup(): HttpTestingController {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter(
        [
          { path: 'admin/login', component: LoginPageComponent },
          { path: '', component: DashboardComponent },
          {
            path: 'admin',
            canMatch: [adminGuard],
            children: [
              { path: '', component: DashboardComponent },
              { path: 'messages', component: DashboardComponent },
            ],
          },
        ],
        withComponentInputBinding(),
      ),
    ],
  });
  return TestBed.inject<HttpTestingController>(HttpTestingController);
}

describe('admin: login', () => {
  it('does not submit malformed email even when native validation is disabled', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, { ...validCredentials, 'login-email': 'not-an-email' });
    submitForm(root);
    await flush();
    backend.expectNone('/api/auth/login');
    expect(root.querySelector('#login-email-error')?.textContent).toContain(
      'Saisissez une adresse e-mail valide.',
    );
  });

  it('redirects to the login page without a session, keeping the requested page', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    const navigation: ReturnType<RouterTestingHarness['navigateByUrl']> =
      harness.navigateByUrl('/admin/messages');
    await flush();
    backend.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    await navigation;
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/login?redirect=%2Fadmin%2Fmessages');
  });

  it('opens the requested page at once on a trusted device, remembering the session', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login?redirect=/admin/messages');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, validCredentials);
    tick(root, 'Se souvenir de moi');
    submitForm(root);
    await flush();
    const call: TestRequest = backend.expectOne('/api/auth/login');
    expect(call.request.body).toEqual({
      email: 'me@example.com',
      password: 'a-strong-password',
      remember: true,
    });
    call.flush({ status: 'authenticated', accessToken: 'jwt', expiresIn: 300 });
    await flush();
    await harness.fixture.whenStable();
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/messages');
  });

  it('asks for the code on a second screen and sends it as soon as six digits are in', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login?redirect=/admin/messages');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, validCredentials);
    submitForm(root);
    await flush();
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'totp-required', challenge: CHALLENGE, expiresIn: 300 });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Code de vérification');
    expect(root.textContent).toContain('me@example.com');
    expect(document.activeElement?.id).toBe('login-totp');

    tick(root, 'Faire confiance à cet appareil');
    fill(root, { 'login-totp': '123 456' });
    await flush();
    const call: TestRequest = backend.expectOne('/api/auth/login/totp');
    expect(call.request.body).toEqual({ challenge: CHALLENGE, totp: '123456', trustDevice: true });
    // A second submission while the first one runs sends nothing.
    submitForm(root);
    backend.expectNone('/api/auth/login/totp');
    call.flush({ accessToken: 'jwt', expiresIn: 300 });
    await flush();
    await harness.fixture.whenStable();
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/messages');
  });

  it('shows a rejection without naming the faulty field', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, { ...validCredentials, 'login-password': 'wrong' });
    submitForm(root);
    await flush();
    backend
      .expectOne('/api/auth/login')
      .flush({ code: 'identity.invalid-credentials' }, { status: 401, statusText: 'Unauthorized' });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Adresse ou mot de passe incorrect.',
    );
  });
});

describe('adminGuard', () => {
  const route: Route = { path: 'admin' };

  it('falls back to the admin home as redirect target outside a navigation', async () => {
    const backend: HttpTestingController = setup();
    const result: MaybeAsync<GuardResult> = TestBed.runInInjectionContext(() =>
      adminGuard(route, [], TestBed.inject<Router>(Router).routerState.snapshot.root),
    );
    await flush();
    backend.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    const tree: GuardResult | Observable<GuardResult> = await result;
    expect(tree).toBeInstanceOf(UrlTree);
    expect(TestBed.inject<Router>(Router).serializeUrl(tree as UrlTree)).toBe(
      '/admin/login?redirect=%2Fadmin',
    );
  });

  it('lets a refreshed session through', async () => {
    const backend: HttpTestingController = setup();
    const result: MaybeAsync<GuardResult> = TestBed.runInInjectionContext(() =>
      adminGuard(route, [], TestBed.inject<Router>(Router).routerState.snapshot.root),
    );
    await flush();
    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'jwt', expiresIn: 600 });
    await expect(result).resolves.toBe(true);
  });
});

describe('LoginPageComponent', () => {
  /**
   * Function codeScreen
   *
   * @description
   * Opens the login page and answers the first step with a code challenge.
   *
   * @returns {Promise<{ backend: HttpTestingController; harness: RouterTestingHarness; root: HTMLElement }>} Test handles.
   */
  async function codeScreen(): Promise<{
    backend: HttpTestingController;
    harness: RouterTestingHarness;
    root: HTMLElement;
  }> {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, validCredentials);
    submitForm(root);
    await flush();
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'totp-required', challenge: CHALLENGE, expiresIn: 300 });
    await flush();
    await harness.fixture.whenStable();
    return { backend, harness, root };
  }

  it('cancels a slow verification when changing account without entering administration', async () => {
    const { backend, root }: Awaited<ReturnType<typeof codeScreen>> = await codeScreen();
    fill(root, { 'login-totp': '123456' });
    await flush();
    const accepted: TestRequest = backend.expectOne('/api/auth/login/totp');
    const back: HTMLButtonElement | undefined = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Changer de compte'),
    );
    if (!back) throw new Error('Missing change-account control');
    back.click();
    await flush();
    accepted.flush({ accessToken: 'obsolete', expiresIn: 300 });
    await flush();
    backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await flush();
    expect(TestBed.inject<Router>(Router).url).toBe('/admin/login');
    expect(root.querySelector('#login-email')).not.toBeNull();
    expect(TestBed.inject<InstanceType<typeof SessionStore>>(SessionStore).authenticated()).toBe(
      false,
    );
  });

  it('does not project or navigate from a slow login after its route is destroyed', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, validCredentials);
    submitForm(root);
    await flush();
    const accepted: TestRequest = backend.expectOne('/api/auth/login');
    const leave: HTMLAnchorElement | null = root.querySelector<HTMLAnchorElement>('a');
    if (!leave) throw new Error('Missing return-to-site control');
    leave.click();
    await flush();
    accepted.flush({ status: 'authenticated', accessToken: 'obsolete', expiresIn: 300 });
    await flush();
    backend.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await flush();
    expect(TestBed.inject<Router>(Router).url).toBe('/');
    expect(TestBed.inject<InstanceType<typeof SessionStore>>(SessionStore).authenticated()).toBe(
      false,
    );
  });

  it('asks for the e-mail and the password without calling the API', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, { 'login-email': 'me@example.com' });
    submitForm(root);
    await flush();
    await harness.fixture.whenStable();
    backend.expectNone('/api/auth/login');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Renseignez l’adresse e-mail et le mot de passe.',
    );
  });

  it('shows the readable error of a rejection other than invalid credentials', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, validCredentials);
    submitForm(root);
    await flush();
    backend
      .expectOne('/api/auth/login')
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Trop de tentatives. Réessayez dans un moment.',
    );
  });

  it('ignores a redirect outside the admin area and opens the admin home', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login?redirect=https://evil.example/admin');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, validCredentials);
    submitForm(root);
    await flush();
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'authenticated', accessToken: 'jwt', expiresIn: 300 });
    await flush();
    await harness.fixture.whenStable();
    expect(TestBed.inject<Router>(Router).url).toBe('/admin');
  });

  it('empties a wrong code, then sends back to the first screen when the challenge expires', async () => {
    const { backend, harness, root }: Awaited<ReturnType<typeof codeScreen>> = await codeScreen();
    fill(root, { 'login-totp': '000000' });
    await flush();
    backend
      .expectOne('/api/auth/login/totp')
      .flush({ code: 'identity.invalid-credentials' }, { status: 401, statusText: 'Unauthorized' });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Code incorrect. Réessayez.',
    );
    expect(root.querySelector<HTMLInputElement>('#login-totp')?.value).toBe('');

    fill(root, { 'login-totp': '111111' });
    await flush();
    backend
      .expectOne('/api/auth/login/totp')
      .flush({ code: 'identity.challenge-expired' }, { status: 401, statusText: 'Unauthorized' });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Administration');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'La vérification a expiré. Reconnectez-vous.',
    );
    expect(root.querySelector<HTMLInputElement>('#login-email')?.value).toBe('me@example.com');
    expect(root.querySelector<HTMLInputElement>('#login-password')?.value).toBe('');
  });

  it('asks for six digits before sending, and goes back to change the account', async () => {
    const { backend, harness, root }: Awaited<ReturnType<typeof codeScreen>> = await codeScreen();
    fill(root, { 'login-totp': '123' });
    submitForm(root);
    await flush();
    await harness.fixture.whenStable();
    backend.expectNone('/api/auth/login/totp');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Saisissez les six chiffres du code.',
    );
    tick(root, 'Changer de compte');
    await harness.fixture.whenStable();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Administration');
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the readable error of a code rejection other than a wrong code', async () => {
    const { backend, harness, root }: Awaited<ReturnType<typeof codeScreen>> = await codeScreen();
    fill(root, { 'login-totp': '123456' });
    await flush();
    backend
      .expectOne('/api/auth/login/totp')
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Trop de tentatives. Réessayez dans un moment.',
    );
    expect(root.querySelector<HTMLInputElement>('#login-totp')?.value).toBe('');
  });

  it('keeps the e-mail and the remember choice when coming back from the code screen', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    fill(root, validCredentials);
    tick(root, 'Se souvenir de moi');
    submitForm(root);
    await flush();
    // A second submission while the first one runs sends nothing.
    submitForm(root);
    await flush();
    backend
      .expectOne('/api/auth/login')
      .flush({ status: 'totp-required', challenge: CHALLENGE, expiresIn: 300 });
    await flush();
    await harness.fixture.whenStable();
    tick(root, 'Changer de compte');
    await harness.fixture.whenStable();
    expect(root.querySelector<HTMLInputElement>('#login-email')?.value).toBe('me@example.com');
    expect(root.querySelector<HTMLInputElement>('#login-password')?.value).toBe('');
    expect(root.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
  });

  it('reveals and hides the password without submitting the form', async () => {
    const backend: HttpTestingController = setup();
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    const password: () => HTMLInputElement | null = (): HTMLInputElement | null =>
      root.querySelector<HTMLInputElement>('#login-password');
    const toggle: HTMLButtonElement | null =
      root.querySelector<HTMLButtonElement>('button[aria-pressed]');
    expect(password()?.type).toBe('password');
    toggle?.click();
    await harness.fixture.whenStable();
    expect(password()?.type).toBe('text');
    expect(toggle?.getAttribute('aria-label')).toBe('Masquer la saisie');
    toggle?.click();
    await harness.fixture.whenStable();
    expect(password()?.type).toBe('password');
    backend.expectNone('/api/auth/login');
  });
});

describe('IDENTITY_LOGIN_ROUTES', () => {
  it('loads its owner login page lazily', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/login', children: IDENTITY_LOGIN_ROUTES }]),
      ],
    });
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/login');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Administration',
    );
  });
});
