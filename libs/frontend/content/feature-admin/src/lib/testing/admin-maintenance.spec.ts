import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { AdminMaintenance } from '@vfortin/content-web-data-access/admin';
import { ToastService } from '@vfortin/ui';
import { ADMIN_MAINTENANCE_ROUTES } from '@internal/content-web-feature-admin/lib/admin-maintenance.routes';

/**
 * Constant URL
 *
 * @description
 * Maintenance endpoint of the API.
 */
const URL: string = '/api/content/admin/maintenance';

/**
 * Function setting
 *
 * @description
 * Setting as the API answers it.
 *
 * @param {boolean} enabled - Switch state.
 * @param {number} version - Version.
 * @param {AdminMaintenance['message']} message - Message.
 *
 * @returns {AdminMaintenance} Setting.
 */
const setting = (
  enabled: boolean,
  version: number,
  message: AdminMaintenance['message'] = { fr: '' },
): AdminMaintenance => ({ enabled, message, version });

/**
 * Function flush
 *
 * @description
 * Yields one timer turn.
 *
 * @returns {Promise<unknown>} Completion after the next timer callback.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve: (value: unknown) => void): ReturnType<typeof setTimeout> =>
    setTimeout(resolve),
  );

/**
 * Interface Opened
 *
 * @description
 * Harness of the opened page.
 */
interface Opened {
  readonly backend: HttpTestingController;
  readonly root: () => HTMLElement;
  readonly settle: () => Promise<void>;
}

/**
 * Function open
 *
 * @description
 * Mounts the route as the shell does (`/admin/maintenance`) and answers the read, or fails it with
 * a 500 when `stored` is `'error'`.
 *
 * @param {AdminMaintenance | 'error'} stored - Setting the API answers, or `'error'`.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function open(stored: AdminMaintenance | 'error'): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: 'fr' },
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: 'admin/maintenance', children: ADMIN_MAINTENANCE_ROUTES }]),
    ],
  });
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const harness: RouterTestingHarness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/admin/maintenance');
  await flush();
  const settle = async (): Promise<void> => {
    await flush();
    await harness.fixture.whenStable();
  };
  const read: TestRequest = backend.expectOne({ method: 'GET', url: URL });
  if (stored === 'error') {
    read.flush({ code: 'internal' }, { status: 500, statusText: 'Server Error' });
  } else {
    read.flush(stored);
  }
  await settle();
  return { backend, root: (): HTMLElement => harness.routeNativeElement as HTMLElement, settle };
}

/**
 * Function type
 *
 * @description
 * Types a value into the visible message.
 *
 * @param {Opened} opened - Harness.
 * @param {string} value - Text.
 *
 * @returns {Promise<void>} Completion.
 */
async function type(opened: Opened, value: string): Promise<void> {
  const textarea: HTMLTextAreaElement | null = opened.root().querySelector('textarea');
  if (!textarea) throw new Error('message missing');
  textarea.value = value;
  textarea.dispatchEvent(new Event('input'));
  await opened.settle();
}

/**
 * Function submit
 *
 * @description
 * Clicks « Enregistrer ».
 *
 * @param {Opened} opened - Harness.
 *
 * @returns {Promise<void>} Completion.
 */
async function submit(opened: Opened): Promise<void> {
  opened.root().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
  await opened.settle();
}

describe('ADMIN_MAINTENANCE_ROUTES', (): void => {
  afterEach((): void => {
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('shows the stored state as a badge, the switch and the empty message', async (): Promise<void> => {
    const opened: Opened = await open(setting(false, 2));
    const root: HTMLElement = opened.root();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Maintenance');
    expect(root.querySelector('[data-slot="badge"]')?.textContent?.trim()).toBe('Désactivé');
    const toggle: HTMLButtonElement | null = root.querySelector('button[role="switch"]');
    expect(toggle?.getAttribute('aria-checked')).toBe('false');
    expect(root.querySelector('label[for="maintenance-enabled"]')?.textContent?.trim()).toBe(
      'Mode maintenance',
    );
    expect(root.querySelector('textarea')?.value).toBe('');
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it('switches the maintenance on with a message, saving with If-Match', async (): Promise<void> => {
    const opened: Opened = await open(setting(false, 2));
    opened.root().querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
    await opened.settle();
    await type(opened, '  Retour à 14 h. ');
    await submit(opened);
    const put: TestRequest = opened.backend.expectOne({ method: 'PUT', url: URL });
    expect(put.request.headers.get('if-match')).toBe('"2"');
    expect(put.request.body).toEqual({ enabled: true, message: { fr: 'Retour à 14 h.' } });
    put.flush(setting(true, 3, { fr: 'Retour à 14 h.' }));
    await opened.settle();
    expect(opened.root().querySelector('[data-slot="badge"]')?.textContent?.trim()).toBe('Activé');
    const toast: ReturnType<ToastService['toasts']>[number] | undefined =
      TestBed.inject<ToastService>(ToastService).toasts()[0];
    expect([toast?.type, toast?.message, toast?.description]).toEqual([
      'success',
      'Maintenance enregistrée.',
      'Le site public affiche l’écran de maintenance.',
    ]);
  });

  it('refuses a message over 500 characters before sending', async (): Promise<void> => {
    const opened: Opened = await open(setting(true, 4));
    await type(opened, 'x'.repeat(501));
    await submit(opened);
    opened.backend.expectNone({ method: 'PUT', url: URL });
    expect(opened.root().textContent).toContain('500 caractères maximum.');
  });

  it('shows the conflict of a stale version and reloads it', async (): Promise<void> => {
    const opened: Opened = await open(setting(true, 4));
    opened.root().querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
    await opened.settle();
    await submit(opened);
    opened.backend
      .expectOne({ method: 'PUT', url: URL })
      .flush(
        { code: 'content.version-mismatch', title: 'Stale' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await opened.settle();
    expect(opened.root().textContent).toContain(
      'La maintenance a été modifiée ailleurs depuis son ouverture.',
    );
    const reload: HTMLButtonElement | undefined = [
      ...opened.root().querySelectorAll<HTMLButtonElement>('button'),
    ].find((button: HTMLButtonElement): boolean => button.textContent?.trim() === 'Recharger');
    reload?.click();
    await opened.settle();
    opened.backend.expectOne({ method: 'GET', url: URL }).flush(setting(false, 5));
    await opened.settle();
    expect(opened.root().textContent).not.toContain('modifiée ailleurs');
    expect(opened.root().textContent).toContain('Version 5');
  });

  it('switches the maintenance off and says the public site is online', async (): Promise<void> => {
    const opened: Opened = await open(setting(true, 6, { fr: 'Retour à 14 h.' }));
    opened.root().querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
    await opened.settle();
    await submit(opened);
    const put: TestRequest = opened.backend.expectOne({ method: 'PUT', url: URL });
    expect(put.request.body).toEqual({ enabled: false, message: { fr: 'Retour à 14 h.' } });
    put.flush(setting(false, 7, { fr: 'Retour à 14 h.' }));
    await opened.settle();
    expect(opened.root().querySelector('[data-slot="badge"]')?.textContent?.trim()).toBe(
      'Désactivé',
    );
    expect(TestBed.inject<ToastService>(ToastService).toasts()[0]?.description).toBe(
      'Le site public est en ligne.',
    );
  });

  it('toasts a refused save without showing a conflict', async (): Promise<void> => {
    const opened: Opened = await open(setting(false, 2));
    opened.root().querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
    await opened.settle();
    await submit(opened);
    opened.backend
      .expectOne({ method: 'PUT', url: URL })
      .flush({ code: 'internal' }, { status: 500, statusText: 'Server Error' });
    await opened.settle();
    expect(TestBed.inject<ToastService>(ToastService).toasts()[0]?.type).toBe('error');
    expect(opened.root().textContent).not.toContain('modifiée ailleurs');
  });

  it('offers to retry a failed read', async (): Promise<void> => {
    const opened: Opened = await open('error');
    const retry: HTMLButtonElement | undefined = [
      ...opened.root().querySelectorAll<HTMLButtonElement>('button'),
    ].find((button: HTMLButtonElement): boolean => button.textContent?.trim() === 'Réessayer');
    expect(retry).toBeDefined();
    retry?.click();
    await opened.settle();
    opened.backend.expectOne({ method: 'GET', url: URL }).flush(setting(false, 3));
    await opened.settle();
    expect(opened.root().querySelector('button[role="switch"]')).not.toBeNull();
  });

  it('guards unsaved changes on unload and saves them with Ctrl+S', async (): Promise<void> => {
    const opened: Opened = await open(setting(false, 2));
    const clean: Event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    opened.root().querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
    await opened.settle();
    const dirty: Event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    await opened.settle();
    opened.backend.expectOne({ method: 'PUT', url: URL }).flush(setting(true, 3));
    await opened.settle();
  });
});
