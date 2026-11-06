import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import {
  type TestRequest,
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { ConnectedApplication } from '@vfortin/identity-web-data-access';
import { ConfirmDialogService, ToastService } from '@vfortin/ui';
import type { Mock } from 'vitest';
import { ConnectedApplicationsSectionComponent } from '@internal/identity-web-feature/lib/ui/sections/connected-applications-section/connected-applications-section.component';

/**
 * Constant CLAUDE
 *
 * @description
 * Metadata-document client used once.
 */
const CLAUDE: ConnectedApplication = {
  id: 'g1',
  clientId: 'https://claude.ai/oauth/mcp-oauth-client-metadata',
  name: 'Claude',
  logo: 'data:image/png;base64,AA==',
  host: 'claude.ai',
  registration: 'metadata-document',
  scopes: ['content:read', 'content:publish'],
  createdAt: '2026-11-04T10:00:00.000Z',
  lastUsedAt: '2026-11-04T12:30:00.000Z',
};

/**
 * Constant TOOL
 *
 * @description
 * Dynamically registered client never used.
 */
const TOOL: ConnectedApplication = {
  id: 'g2',
  clientId: 'd1',
  name: null,
  logo: null,
  host: '127.0.0.1',
  registration: 'dynamic',
  scopes: ['content:read'],
  createdAt: '2026-11-03T08:00:00.000Z',
  lastUsedAt: null,
};

// The dates follow the build locale: the specs render the French source one.
registerLocaleData(localeFr);

const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

/**
 * Function setup
 *
 * @description
 * Renders the section over the HTTP testing backend with a confirmation double.
 *
 * @param {boolean} confirmed - Answer of the confirmation.
 *
 * @returns {Promise<{ fixture: ComponentFixture<ConnectedApplicationsSectionComponent>; backend: HttpTestingController; confirm: Mock }>} Section.
 */
async function setup(confirmed: boolean = true): Promise<{
  fixture: ComponentFixture<ConnectedApplicationsSectionComponent>;
  backend: HttpTestingController;
  confirm: Mock<() => Promise<boolean>>;
}> {
  const confirm: Mock<() => Promise<boolean>> = vi.fn(() => Promise.resolve(confirmed));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: LOCALE_ID, useValue: 'fr' },
      { provide: ConfirmDialogService, useValue: { confirm } },
    ],
  });
  const fixture: ComponentFixture<ConnectedApplicationsSectionComponent> = TestBed.createComponent(
    ConnectedApplicationsSectionComponent,
  );
  await fixture.whenStable();
  return {
    fixture,
    backend: TestBed.inject<HttpTestingController>(HttpTestingController),
    confirm,
  };
}

/**
 * Function settle
 *
 * @description
 * Lets an answer reach the section.
 *
 * @param {ComponentFixture<ConnectedApplicationsSectionComponent>} fixture - Section fixture.
 *
 * @returns {Promise<void>} Resolves once rendered.
 */
async function settle(
  fixture: ComponentFixture<ConnectedApplicationsSectionComponent>,
): Promise<void> {
  await flush();
  await fixture.whenStable();
  await flush();
}

/**
 * Function toastMessages
 *
 * @description
 * Messages queued in the toaster.
 *
 * @returns {string[]} Messages.
 */
function toastMessages(): string[] {
  return TestBed.inject<ToastService>(ToastService)
    .toasts()
    .map((toast) => toast.message);
}

describe('ConnectedApplicationsSectionComponent', () => {
  afterEach(() => TestBed.inject<HttpTestingController>(HttpTestingController).verify());

  it('shows the empty state when no application is connected', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Chargement…');
    backend.expectOne('/api/auth/admin/oauth/applications').flush({ items: [] });
    await settle(fixture);
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Applications connectées');
    expect(root.querySelector('[data-slot="empty"]')?.textContent).toContain(
      'Aucune application connectée',
    );
  });

  it('lists each application with its host, scopes, dates and trust', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup();
    backend.expectOne('/api/auth/admin/oauth/applications').flush({ items: [CLAUDE, TOOL] });
    await settle(fixture);
    const rows: HTMLElement[] = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')];
    expect(rows.map((row) => row.querySelector('h3')?.textContent?.trim())).toEqual([
      'Claude',
      '127.0.0.1',
    ]);
    const first: string = (rows[0]?.textContent ?? '').replace(/\s+/g, ' ');
    expect(first).toContain('claude.ai · Lire le contenu, Publier et dépublier');
    expect(first).toContain('Autorisée le 04/11/2026');
    expect(first).toMatch(/Dernière utilisation : 04\/11\/2026 \d{2}:\d{2}/);
    expect(rows[0]?.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AA==');
    expect(rows[0]?.querySelector('[data-slot="badge"]')).toBeNull();
    expect(rows[1]?.querySelector('[data-slot="badge"]')?.textContent?.trim()).toBe('Non vérifiée');
    expect((rows[1]?.textContent ?? '').replace(/\s+/g, ' ')).toContain(
      'Dernière utilisation : jamais',
    );
    expect(rows[1]?.querySelector('button')?.getAttribute('aria-label')).toBe('Révoquer 127.0.0.1');
  });

  it('draws the Claude logo when Claude publishes none, never for an unverified client', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup();
    backend.expectOne('/api/auth/admin/oauth/applications').flush({
      items: [
        { ...CLAUDE, logo: null },
        { ...TOOL, host: 'claude.ai' },
      ],
    });
    await settle(fixture);
    const rows: HTMLElement[] = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')];
    expect(rows[0]?.querySelector('img')).toBeNull();
    expect(rows[0]?.querySelector('ng-icon svg path')).not.toBeNull();
    expect(rows[0]?.querySelector('svg title')).toBeNull();
    // The dynamic registration keeps the generic icon (Lucide strokes, no brand path fill).
    expect(rows[1]?.querySelector('ng-icon')?.innerHTML).not.toBe(
      rows[0]?.querySelector('ng-icon')?.innerHTML,
    );
  });

  it('revokes after the confirmation and removes the row', async () => {
    const { fixture, backend, confirm }: Awaited<ReturnType<typeof setup>> = await setup();
    backend.expectOne('/api/auth/admin/oauth/applications').flush({ items: [CLAUDE] });
    await settle(fixture);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('li button')?.click();
    await settle(fixture);
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Révoquer l’accès de Claude ?',
        tone: 'danger',
        confirmLabel: 'Révoquer',
      }),
    );
    const call: TestRequest = backend.expectOne('/api/auth/admin/oauth/applications/g1');
    expect(call.request.method).toBe('DELETE');
    call.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
    expect(toastMessages()).toContain('Accès révoqué.');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-slot="empty"]'),
    ).not.toBeNull();
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup(false);
    backend.expectOne('/api/auth/admin/oauth/applications').flush({ items: [CLAUDE] });
    await settle(fixture);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('li button')?.click();
    await settle(fixture);
    backend.expectNone('/api/auth/admin/oauth/applications/g1');
  });

  it('reports a revocation failure and reloads after a 404', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup();
    backend.expectOne('/api/auth/admin/oauth/applications').flush({ items: [CLAUDE] });
    await settle(fixture);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('li button')?.click();
    await settle(fixture);
    backend
      .expectOne('/api/auth/admin/oauth/applications/g1')
      .flush(
        { status: 404, code: 'identity.oauth-application-not-found', title: 'x' },
        { status: 404, statusText: 'Not Found' },
      );
    await settle(fixture);
    expect(toastMessages()).toContain(
      'Cette application n’est plus connectée. La liste a été rechargée.',
    );
    backend.expectOne('/api/auth/admin/oauth/applications').flush({ items: [] });
    await settle(fixture);
  });

  it('offers a retry when the list cannot be read', async () => {
    const { fixture, backend }: Awaited<ReturnType<typeof setup>> = await setup();
    backend
      .expectOne('/api/auth/admin/oauth/applications')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await settle(fixture);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-slot="alert"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-slot="alert"] button')?.click();
    await settle(fixture);
    backend.expectOne('/api/auth/admin/oauth/applications').flush({ items: [TOOL] });
    await settle(fixture);
    expect(root.querySelector('[data-slot="alert"]')).toBeNull();
    expect(root.querySelectorAll('li')).toHaveLength(1);
  });
});
