import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DialogService, ToastService } from '@vfortin/ui';
import type { Mock } from 'vitest';
import { IDENTITY_SECURITY_ROUTES } from '@internal/identity-web-feature/lib/identity-security.routes';
import { SecurityPageComponent } from '@internal/identity-web-feature/lib/ui/pages/security-page/security-page.component';
import { ConnectedApplicationsSectionComponent } from '@internal/identity-web-feature/lib/ui/sections/connected-applications-section/connected-applications-section.component';

/**
 * Component ConnectedApplicationsSectionStubComponent
 * @class ConnectedApplicationsSectionStubComponent
 *
 * @description
 * Stands for the « Applications connectées » section, which owns its store, requests and spec.
 */
@Component({
  selector: 'identity-connected-applications-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class ConnectedApplicationsSectionStubComponent {}

/**
 * Constant SECRET
 *
 * @description
 * Pending secret of the contract fixture.
 */
const SECRET: string = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

/**
 * Constant URI
 *
 * @description
 * Provisioning URI of the contract fixture.
 */
const URI: string = `otpauth://totp/Portfolio:admin%40example.test?secret=${SECRET}&issuer=Portfolio`;

/**
 * Function flush
 *
 * @description
 * Advances one timer turn so promise continuations, overlays and change detection settle.
 *
 * @returns {Promise<unknown>} Resolves on the next timer turn.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

/**
 * Function refusal
 *
 * @description
 * Answers a request with a problem+json refusal.
 *
 * @param {TestRequest} call - Pending request.
 * @param {number} status - HTTP status.
 * @param {string} code - Problem code.
 */
function refusal(call: TestRequest, status: number, code: string): void {
  call.flush({ status, code, title: code }, { status, statusText: 'Refused' });
}

/**
 * Function field
 *
 * @description
 * Finds an element rendered in the dialog overlay.
 *
 * @param {string} selector - CSS selector.
 *
 * @returns {HTMLElement | null} Element, or `null` while absent.
 */
function overlay(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.cdk-overlay-container ${selector}`);
}

/**
 * Function type
 *
 * @description
 * Enters a value into a dialog control as the administrator would.
 *
 * @param {string} id - Control id.
 * @param {string} value - Value to enter.
 */
function type(id: string, value: string): void {
  const control: HTMLInputElement | null = overlay(`#${id}`) as HTMLInputElement | null;
  if (!control) throw new Error(id);
  control.value = value;
  control.dispatchEvent(new Event('input'));
}

/**
 * Function submitDialog
 *
 * @description
 * Submits the form of the open dialog.
 */
function submitDialog(): void {
  overlay('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
}

/**
 * Function button
 *
 * @description
 * Clicks a button by its visible text inside a root.
 *
 * @param {ParentNode} root - Element or document to search.
 * @param {string} text - Visible text of the button.
 */
function click(root: ParentNode, text: string): void {
  const target: HTMLButtonElement | undefined = [
    ...root.querySelectorAll<HTMLButtonElement>('button'),
  ].find((candidate) => candidate.textContent?.trim() === text);
  if (!target) throw new Error(text);
  target.click();
}

/**
 * Function toastMessages
 *
 * @description
 * Messages currently queued in the administration toaster.
 *
 * @returns {string[]} Toast messages.
 */
function toastMessages(): string[] {
  return TestBed.inject<ToastService>(ToastService)
    .toasts()
    .map((toast) => toast.message);
}

/**
 * Function footerHints
 *
 * @description
 * Spoken keyboard hints of the open dialog's footer bar.
 *
 * @returns {(string | null)[]} One sentence per hint.
 */
function footerHints(): (string | null)[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '[role="dialog"] [data-slot="dialog-footer"][data-variant="bar"] [data-slot="kbd-hint"] .sr-only',
    ),
  ].map((hint) => hint.textContent);
}

/**
 * Function setup
 *
 * @description
 * Renders the page over the HTTP testing backend and answers its status read.
 *
 * @param {boolean} enabled - Status answered by the service.
 *
 * @returns {Promise<{ fixture: ComponentFixture<SecurityPageComponent>; backend: HttpTestingController }>} Page and backend.
 */
async function setup(enabled: boolean): Promise<{
  fixture: ComponentFixture<SecurityPageComponent>;
  backend: HttpTestingController;
}> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const fixture: ComponentFixture<SecurityPageComponent> =
    TestBed.createComponent(SecurityPageComponent);
  await fixture.whenStable();
  backend.expectOne('/api/auth/totp').flush({ enabled });
  await flush();
  await fixture.whenStable();
  return { fixture, backend };
}

/**
 * Function settle
 *
 * @description
 * Lets an answer reach the page and its dialog.
 *
 * @param {ComponentFixture<SecurityPageComponent>} fixture - Page fixture.
 *
 * @returns {Promise<void>} Resolves once rendered.
 */
async function settle(fixture: ComponentFixture<SecurityPageComponent>): Promise<void> {
  await flush();
  await fixture.whenStable();
  await flush();
}

describe('SecurityPageComponent', () => {
  let clipboard: { writeText: Mock<(text: string) => Promise<void>> };

  beforeEach(() => {
    TestBed.overrideComponent(SecurityPageComponent, {
      remove: { imports: [ConnectedApplicationsSectionComponent] },
      add: { imports: [ConnectedApplicationsSectionStubComponent] },
    });
    clipboard = { writeText: vi.fn(() => Promise.resolve()) };
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  });

  afterEach(() => {
    TestBed.inject<DialogService>(DialogService).closeAll();
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('shows a disabled second factor as an empty state with its action', async () => {
    const { fixture }: Awaited<ReturnType<typeof setup>> = await setup(false);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Sécurité');
    // The navigation bar names the section; the heading and its description form the page header.
    expect(root.querySelector('header h1')).toBeNull();
    // The bar starts with the layout's sidebar toggle, which renders nothing outside the layout.
    expect(root.querySelector('header')?.firstElementChild?.tagName).toBe('UI-SIDEBAR-TRIGGER');
    expect(
      root.querySelector('ui-page-header h1 + [data-slot="page-header-meta"]')?.textContent,
    ).toContain('compte administrateur');
    // Disabled, each section shows a dashed empty state (owner review), the first with its action.
    expect(root.querySelector('[data-slot="badge"]')).toBeNull();
    const empties: HTMLElement[] = [
      ...root.querySelectorAll<HTMLElement>('[data-slot="empty"][data-appearance="dashed"]'),
    ];
    expect(
      empties.map((empty) => empty.querySelector('[data-slot="empty-title"]')?.textContent?.trim()),
    ).toEqual(['Double authentification désactivée', 'Aucun appareil approuvé']);
    expect(empties[0]?.textContent).toContain('La connexion ne demande que le mot de passe.');
    expect(
      empties[0]?.querySelector('[data-slot="empty-content"] button')?.textContent?.trim(),
    ).toBe('Activer');
    // Two settings sections, each with its title and description beside its own flat rows.
    const section: HTMLElement | null = root.querySelector(
      'section[aria-labelledby="two-factor-title"]',
    );
    const devices: HTMLElement | null = root.querySelector(
      'section[aria-labelledby="trusted-devices-title"]',
    );
    expect([...root.querySelectorAll('section h2')].map((h) => h.textContent?.trim())).toEqual([
      'Double authentification',
      'Appareils approuvés',
    ]);
    // Factual compatibility note: the server issues standard SHA1, 6-digit, 30 s codes.
    expect(section?.textContent).toContain(
      'Compatible avec Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden et toute application TOTP.',
    );
    expect(devices?.textContent).toContain(
      'Après le code, un appareil peut être approuvé pour 30 jours : la connexion n’y demande plus que le mot de passe.',
    );
    expect(devices?.querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Aucun appareil approuvé',
    );
    expect(devices?.textContent).toContain(
      'l’écran du code propose de faire confiance à l’appareil pendant 30 jours',
    );
    // The standard full-width header; the content sits in the editor's centred 920 px column.
    const column: HTMLElement | null | undefined = section?.parentElement;
    expect(column?.classList).toContain('mx-auto');
    expect(column?.classList).toContain('max-w-[920px]');
    expect(devices?.parentElement).toBe(column);
    expect(
      [...(root.querySelector('ui-page-header')?.classList ?? [])].some((name) =>
        name.startsWith('px-'),
      ),
    ).toBe(false);
    // Both sections share the grid, so titles and rows line up; only spacing divides them.
    for (const current of [section, devices]) {
      expect(current?.classList).toContain('@3xl/settings:grid-cols-[14rem_minmax(0,1fr)]');
    }
    expect(devices?.classList).not.toContain('border-t');
    expect(devices?.classList).toContain('pt-10');
    expect(section?.classList).toContain('pb-10');
    // No card or hairline rows while disabled: only the dashed empty states, each a 36 px action at most.
    expect(root.querySelector('section .border-y')).toBeNull();
    expect(root.querySelector('section div.py-4.items-start')).toBeNull();
    expect(section?.querySelector('button')?.classList).toContain('h-9');
  });

  it('keeps both rows and the action slot while the status loads', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<SecurityPageComponent> =
      TestBed.createComponent(SecurityPageComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    // The device row's title depends on the status: only the authenticator row is named yet.
    expect([...root.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual([
      'Application d’authentification',
    ]);
    expect(root.querySelectorAll('section div.py-4.items-start')).toHaveLength(2);
    // One spoken status; the placeholders of the descriptions, device title and button stay silent.
    expect(root.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(
      root.querySelectorAll('section [data-slot="skeleton"][aria-hidden="true"]'),
    ).toHaveLength(4);
    expect(root.querySelector('section button')).toBeNull();
    backend.expectOne('/api/auth/totp').flush({ enabled: false });
    await settle(fixture);
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it('enables the second factor: password, QR code and key, then the code', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup(false);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    click(root, 'Activer');
    await settle(fixture);
    expect(overlay('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Activer la double authentification',
    );
    // The QR code sits beside the key: the medium catalogue width.
    expect(overlay('[role="dialog"]')?.classList).toContain('max-w-lg');
    expect(footerHints()).toEqual(['Échap : Annuler']);
    expect(
      overlay('[role="dialog"] > [data-slot="dialog-header"]')?.getAttribute('data-variant'),
    ).toBe('bar');

    // A wrong password stays on its field and keeps the session.
    type('two-factor-setup-password', 'wrong-password');
    submitDialog();
    await settle(fixture);
    const wrong: TestRequest = backend.expectOne('/api/auth/totp/setup');
    expect(wrong.request.body).toEqual({ password: 'wrong-password' });
    refusal(wrong, 422, 'identity.password-mismatch');
    await settle(fixture);
    expect(overlay('#two-factor-setup-password-error')?.textContent?.trim()).toBe(
      'Mot de passe incorrect.',
    );
    // The field's error marks its input, so the danger border shows.
    expect(overlay('#two-factor-setup-password')?.getAttribute('aria-invalid')).toBe('true');
    expect(toastMessages()).toEqual([]);

    type('two-factor-setup-password', 'a-strong-password');
    await settle(fixture);
    expect(overlay('#two-factor-setup-password-error')).toBeNull();
    expect(overlay('#two-factor-setup-password')?.hasAttribute('aria-invalid')).toBe(false);
    submitDialog();
    await settle(fixture);
    backend.expectOne('/api/auth/totp/setup').flush({ secret: SECRET, provisioningUri: URI });
    await settle(fixture);

    const qr: HTMLElement | null = overlay('svg[role="img"]');
    expect(qr?.getAttribute('aria-label')).toBe(
      'QR code de la clé, à scanner avec l’application d’authentification',
    );
    expect(qr?.querySelector('path')?.getAttribute('d')).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
    expect(qr?.getAttribute('viewBox')).toMatch(/^-4 -4 \d+ \d+$/);
    expect(overlay('code')?.textContent?.trim()).toBe('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP');
    expect(footerHints()).toEqual(['Échap : Annuler']);

    // A 28 px icon button on the small-control radius (D43).
    expect(overlay('button[aria-label="Copier la clé"]')?.classList).toContain('size-7');
    expect(overlay('button[aria-label="Copier la clé"]')?.classList).toContain('rounded-sm');
    overlay('button[aria-label="Copier la clé"]')?.click();
    await settle(fixture);
    expect(clipboard.writeText).toHaveBeenCalledWith(SECRET);
    expect(toastMessages()).toContain('Clé copiée.');

    // A wrong code stays on the code field.
    type('two-factor-enable-totp', '000000');
    await settle(fixture);
    const badCode: TestRequest = backend.expectOne('/api/auth/totp/enable');
    expect(badCode.request.body).toEqual({ totp: '000000' });
    refusal(badCode, 422, 'identity.totp-invalid');
    await settle(fixture);
    expect(overlay('#two-factor-enable-totp-error')?.textContent?.trim()).toBe(
      'Code incorrect. Réessayez.',
    );

    type('two-factor-enable-totp', '123456');
    await settle(fixture);
    backend.expectOne('/api/auth/totp/enable').flush({ enabled: true });
    await settle(fixture);
    expect(overlay('[role="dialog"]')).toBeNull();
    expect(toastMessages()).toContain('Double authentification activée.');
    expect(root.querySelector('[data-slot="badge"]')?.textContent?.trim()).toBe('Activée');
    expect(document.body.textContent).not.toContain('JBSW');
  });

  it('forgets the pending secret when the dialog closes', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup(false);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    click(root, 'Activer');
    await settle(fixture);
    type('two-factor-setup-password', 'a-strong-password');
    submitDialog();
    await settle(fixture);
    backend.expectOne('/api/auth/totp/setup').flush({ secret: SECRET, provisioningUri: URI });
    await settle(fixture);
    expect(overlay('code')).not.toBeNull();
    click(document, 'Annuler');
    await settle(fixture);
    expect(overlay('[role="dialog"]')).toBeNull();

    click(root, 'Activer');
    await settle(fixture);
    expect(overlay('code')).toBeNull();
    expect(overlay('#two-factor-setup-password')).not.toBeNull();
  });

  it('cancels on Escape, as its footer bar says', async () => {
    const { fixture }: Awaited<ReturnType<typeof setup>> = await setup(false);
    click(fixture.nativeElement as HTMLElement, 'Activer');
    await settle(fixture);
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    await settle(fixture);
    expect(overlay('[role="dialog"]')).toBeNull();
  });

  it('discards a setup answer that arrives after the dialog closed', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup(false);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    click(root, 'Activer');
    await settle(fixture);
    type('two-factor-setup-password', 'a-strong-password');
    submitDialog();
    await settle(fixture);
    const late: TestRequest = backend.expectOne('/api/auth/totp/setup');
    click(document, 'Annuler');
    await settle(fixture);
    late.flush({ secret: SECRET, provisioningUri: URI });
    await settle(fixture);
    expect(document.body.textContent).not.toContain('JBSW');
  });

  it('reports other failures in a toast and closes the dialog after a state conflict', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup(false);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    click(root, 'Activer');
    await settle(fixture);
    type('two-factor-setup-password', 'a-strong-password');
    submitDialog();
    await settle(fixture);
    backend
      .expectOne('/api/auth/totp/setup')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await settle(fixture);
    expect(toastMessages()).toContain('Le service ne répond pas. Réessayez dans un moment.');
    expect(overlay('#two-factor-setup-password-error')).toBeNull();

    type('two-factor-setup-password', 'another-password');
    submitDialog();
    await settle(fixture);
    refusal(backend.expectOne('/api/auth/totp/setup'), 409, 'identity.totp-state');
    await settle(fixture);
    backend.expectOne('/api/auth/totp').flush({ enabled: true });
    await settle(fixture);
    expect(overlay('[role="dialog"]')).toBeNull();
    expect(toastMessages()).toContain(
      'La double authentification a changé d’état entre-temps. Son état a été rechargé.',
    );
    expect(root.querySelector('[data-slot="badge"]')?.textContent?.trim()).toBe('Activée');
  });

  it('disables the second factor with the password and a code, in a danger dialog', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup(true);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const badge: HTMLElement | null = root.querySelector('[data-slot="badge"]');
    expect(badge?.textContent?.trim()).toBe('Activée');
    expect(badge?.classList).toContain('before:bg-success-ink');
    // Disabling is a danger ghost on the page; the dialog's confirmation is the filled danger button.
    const action: HTMLButtonElement | undefined = [
      ...root.querySelectorAll<HTMLButtonElement>('section button'),
    ].find((candidate) => candidate.textContent?.trim() === 'Désactiver');
    expect(action?.classList).toContain('text-danger-ink');
    expect(action?.classList).not.toContain('bg-danger');
    expect(root.textContent).toContain(
      'Chaque connexion depuis un appareil non approuvé demande le code de votre application.',
    );
    // The devices section says what disabling costs: every trusted device is forgotten.
    const devices: HTMLElement | null = root.querySelector(
      'section[aria-labelledby="trusted-devices-title"]',
    );
    expect(devices?.querySelector('h3')?.textContent?.trim()).toBe('Approbation à la connexion');
    expect(devices?.textContent).toContain(
      'Désactiver la double authentification oublie tous les appareils approuvés.',
    );
    click(root, 'Désactiver');
    await settle(fixture);
    expect(overlay('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Désactiver la double authentification',
    );
    // Two fields: the small catalogue width.
    expect(overlay('[role="dialog"]')?.classList).toContain('max-w-[420px]');
    const confirm: HTMLButtonElement | undefined = [
      ...document.querySelectorAll<HTMLButtonElement>('.cdk-overlay-container button'),
    ].find((candidate) => candidate.textContent?.trim() === 'Désactiver');
    expect(confirm?.className).toContain('bg-danger');
    expect(footerHints()).toEqual(['Échap : Annuler']);
    expect(
      overlay('[role="dialog"] > [data-slot="dialog-header"]')?.getAttribute('data-variant'),
    ).toBe('bar');
    expect(
      [
        ...document.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] [data-variant="bar"] button',
        ),
      ].map((button) => button.textContent?.trim()),
    ).toEqual(['Annuler', 'Désactiver']);

    // Nothing is sent before both factors are valid.
    submitDialog();
    await settle(fixture);
    backend.expectNone('/api/auth/totp/disable');
    expect(overlay('#two-factor-disable-password-error')?.textContent?.trim()).toBe(
      'Saisissez votre mot de passe.',
    );
    expect(overlay('#two-factor-disable-password')?.getAttribute('aria-invalid')).toBe('true');

    type('two-factor-disable-password', 'a-strong-password');
    type('two-factor-disable-totp', '000000');
    submitDialog();
    await settle(fixture);
    const wrong: TestRequest = backend.expectOne('/api/auth/totp/disable');
    expect(wrong.request.body).toEqual({ password: 'a-strong-password', totp: '000000' });
    refusal(wrong, 422, 'identity.totp-invalid');
    await settle(fixture);
    expect(overlay('#two-factor-disable-totp-error')?.textContent?.trim()).toBe(
      'Code incorrect. Réessayez.',
    );
    expect(overlay('#two-factor-disable-password-error')).toBeNull();

    type('two-factor-disable-totp', '123456');
    submitDialog();
    await settle(fixture);
    refusal(backend.expectOne('/api/auth/totp/disable'), 422, 'identity.password-mismatch');
    await settle(fixture);
    expect(overlay('#two-factor-disable-password-error')?.textContent?.trim()).toBe(
      'Mot de passe incorrect.',
    );

    type('two-factor-disable-password', 'the-right-password');
    submitDialog();
    await settle(fixture);
    backend.expectOne('/api/auth/totp/disable').flush({ enabled: false });
    await settle(fixture);
    expect(overlay('[role="dialog"]')).toBeNull();
    expect(toastMessages()).toContain('Double authentification désactivée.');
    expect(root.querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Double authentification désactivée',
    );
  });

  it('ends with the connected applications section', async () => {
    const { fixture }: Awaited<ReturnType<typeof setup>> = await setup(false);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(
      root.querySelector('section:last-of-type + identity-connected-applications-section'),
    ).not.toBeNull();
  });

  it('offers a retry when the status cannot be read', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const backend: HttpTestingController =
      TestBed.inject<HttpTestingController>(HttpTestingController);
    const fixture: ComponentFixture<SecurityPageComponent> =
      TestBed.createComponent(SecurityPageComponent);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Chargement…');
    backend.expectOne('/api/auth/totp').flush(null, { status: 503, statusText: 'Unavailable' });
    await settle(fixture);
    expect(root.querySelector('[data-slot="alert"]')?.textContent).toContain(
      'Le service ne répond pas.',
    );
    // An unknown status leaves the alert alone beside the section title, without empty rows.
    expect(root.querySelector('section [data-slot="alert"]')).not.toBeNull();
    expect(root.querySelector('h3')).toBeNull();
    // The title drops the offset that lines it up with the first row and starts beside the alert.
    expect(root.querySelector('section')?.firstElementChild?.classList).toContain(
      '@3xl/settings:group-has-[[data-slot=alert]]/section:pt-0',
    );
    click(root, 'Réessayer');
    await settle(fixture);
    backend.expectOne('/api/auth/totp').flush({ enabled: false });
    await settle(fixture);
    expect(root.querySelector('[data-slot="alert"]')).toBeNull();
    expect(root.querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Double authentification désactivée',
    );
  });

  it('reports a clipboard failure', async () => {
    clipboard.writeText.mockRejectedValue(new Error('denied'));
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup(false);
    click(fixture.nativeElement as HTMLElement, 'Activer');
    await settle(fixture);
    type('two-factor-setup-password', 'a-strong-password');
    submitDialog();
    await settle(fixture);
    backend.expectOne('/api/auth/totp/setup').flush({ secret: SECRET, provisioningUri: URI });
    await settle(fixture);
    overlay('button[aria-label="Copier la clé"]')?.click();
    await settle(fixture);
    expect(toastMessages()).toContain('Copie impossible. Sélectionnez la clé pour la copier.');
  });
});

describe('IDENTITY_SECURITY_ROUTES', () => {
  it('loads its owner security page lazily with its title', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/security', children: IDENTITY_SECURITY_ROUTES }]),
      ],
    });
    const harness: RouterTestingHarness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/security');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Sécurité');
    expect(document.title).toBe('Sécurité — Administration');
    TestBed.inject<HttpTestingController>(HttpTestingController)
      .expectOne('/api/auth/totp')
      .flush({ enabled: false });
  });
});
