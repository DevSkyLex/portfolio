import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAdminInboxSummary } from '@vfortin/contact-web-data-access/summary';
import { provideAdminProjectNavigation } from '@vfortin/content-web-data-access/navigation';
import { provideAdminSession } from '@vfortin/identity-web-data-access/session';
import { AdminLayoutComponent } from '@internal/web-shell/lib/admin/layouts/admin-layout/admin-layout.component';

/**
 * Interface FakeMediaQuery
 * @interface FakeMediaQuery
 *
 * @description
 * Narrow layout query answered by the stubbed `matchMedia`, with the listener the layout registered.
 */
interface FakeMediaQuery {
  // #region Properties
  /**
   * Property matches
   *
   * @description
   * Whether the window is narrow.
   *
   * @type {boolean}
   */
  matches: boolean;

  /**
   * Property listener
   *
   * @description
   * Change listener registered by the layout, `null` once removed.
   *
   * @type {((event: { matches: boolean }) => void) | null}
   */
  listener: ((event: { matches: boolean }) => void) | null;
  // #endregion
}

/**
 * Function flush
 *
 * @description
 * Advances one timer turn so promise continuations and overlays settle.
 *
 * @returns {Promise<unknown>} Resolves on the next timer turn.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve));

/**
 * Function stubWidth
 *
 * @description
 * Replaces `matchMedia` with a query of the given width class whose change listener can be fired.
 *
 * @param {boolean} matches - Whether the window starts narrow.
 *
 * @returns {FakeMediaQuery} Query state shared with the stub.
 */
function stubWidth(matches: boolean): FakeMediaQuery {
  const query: FakeMediaQuery = { matches, listener: null };
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    get matches(): boolean {
      return query.matches;
    },
    addEventListener: (_: string, callback: (event: { matches: boolean }) => void): void => {
      query.listener = callback;
    },
    removeEventListener: (): void => {
      query.listener = null;
    },
  }));
  return query;
}

/**
 * Function setup
 *
 * @description
 * Renders the admin layout with its owner ports over a test HTTP backend and answers the first
 * unread count.
 *
 * @returns Fixture, root element and HTTP backend.
 */
async function setup(): Promise<{
  backend: HttpTestingController;
  fixture: ComponentFixture<AdminLayoutComponent>;
  root: HTMLElement;
}> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/login', children: [] }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAdminInboxSummary(),
      provideAdminProjectNavigation(),
      provideAdminSession(),
    ],
  });
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const fixture: ComponentFixture<AdminLayoutComponent> =
    TestBed.createComponent(AdminLayoutComponent);
  backend
    .expectOne((r) => r.url === '/api/contact/admin/messages')
    .flush({ member: [], totalItems: 0 });
  await fixture.whenStable();
  return { backend, fixture, root: fixture.nativeElement as HTMLElement };
}

/**
 * Function press
 *
 * @description
 * Dispatches a cancelable key press that bubbles up to the window.
 *
 * @param {string} key - Produced key.
 * @param {KeyboardEventInit} init - Modifiers.
 * @param {EventTarget} target - Element the key is typed in.
 *
 * @returns {KeyboardEvent} The dispatched event.
 */
function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = window,
): KeyboardEvent {
  const event: KeyboardEvent = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Function help
 *
 * @description
 * Finds the open keyboard shortcuts dialog.
 *
 * @returns {HTMLElement | undefined} The dialog panel, if open.
 */
function help(): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]')].find((panel) =>
    panel.textContent?.includes('Raccourcis clavier'),
  );
}

describe('AdminLayoutComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mounts one toaster and reports an unconfirmed logout in an error toast', async () => {
    const { backend, fixture, root } = await setup();
    const toasters: NodeListOf<Element> = document.querySelectorAll('[data-slot="toaster"]');
    expect(toasters).toHaveLength(1);
    expect(toasters[0]?.getAttribute('aria-label')).toBe('Notifications');
    expect(toasters[0]?.className).toContain('right-4');
    expect(root.querySelector('p[role="alert"]')).toBeNull();

    [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('déconnecter'))
      ?.click();
    backend.expectOne('/api/auth/logout').flush(null, { status: 503, statusText: 'Unavailable' });
    await flush();
    await fixture.whenStable();
    const toast: Element | null = document.querySelector('[data-slot="toast"]');
    expect(toast?.getAttribute('data-type')).toBe('error');
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(toast?.textContent).toContain('La déconnexion n’a pas été confirmée. Réessayez.');
    toast?.querySelector<HTMLButtonElement>('button[aria-label="Fermer la notification"]')?.click();
    await fixture.whenStable();
    expect(document.querySelector('[data-slot="toast"]')).toBeNull();
  });

  it('opens the keyboard shortcuts help on ? outside fields and dialogs, once', async () => {
    const { fixture } = await setup();
    const field: HTMLInputElement = document.body.appendChild(document.createElement('input'));
    expect(press('?', {}, field).defaultPrevented).toBe(false);
    field.remove();
    expect(press('?', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(press('/').defaultPrevented).toBe(false);
    expect(help()).toBeUndefined();

    expect(press('?', { shiftKey: true }).defaultPrevented).toBe(true);
    await fixture.whenStable();
    const panel: HTMLElement | undefined = help();
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.querySelector('h2')?.textContent?.trim()).toBe('Raccourcis clavier');
    const rows: string[] = [...(panel?.querySelectorAll('dl > div') ?? [])].map(
      (row) => row.querySelector('dt')?.textContent?.trim() ?? '',
    );
    expect(rows).toEqual([
      'Ouvrir la palette de commandes',
      'Afficher cette aide',
      'Enregistrer un projet',
      'Naviguer entre les messages',
      'Marquer comme lu',
      'Archiver',
    ]);
    const palette: Element | undefined = panel?.querySelectorAll('dd')[0];
    expect([...(palette?.querySelectorAll('kbd') ?? [])].map((kbd) => kbd.textContent)).toEqual([
      'Ctrl',
      'K',
      '⌘',
      'K',
    ]);
    expect(palette?.querySelector('.sr-only')?.textContent).toBe('Contrôle K ou Commande K');

    // Neither a ? typed inside the open help nor one from the page stacks a second help.
    const close: HTMLButtonElement | null | undefined = panel?.querySelector<HTMLButtonElement>(
      'button[data-slot="dialog-close"]',
    );
    expect(press('?', {}, close ?? window).defaultPrevented).toBe(false);
    press('?');
    await fixture.whenStable();
    expect(document.querySelectorAll('[data-slot="dialog-content"]')).toHaveLength(1);
    expect(close?.getAttribute('aria-label')).toBe('Fermer');
    close?.click();
    await flush();
    await fixture.whenStable();
    expect(help()).toBeUndefined();
  });

  it('opens the keyboard shortcuts help from the command palette', async () => {
    const { backend, fixture } = await setup();
    press('k', { ctrlKey: true });
    backend.expectOne('/api/content/admin/projects').flush({ member: [], totalItems: 0 });
    await flush();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.trim() === 'Raccourcis clavier')
      ?.click();
    await flush();
    await fixture.whenStable();
    expect(document.querySelector('[aria-label="Palette de commandes"]')).toBeNull();
    expect(help()).toBeDefined();
    TestBed.inject<HttpTestingController>(HttpTestingController).verify();
  });

  it('names the icon-only sidebar entries in tooltips on narrow screens only', async () => {
    const query: FakeMediaQuery = stubWidth(true);
    const { fixture, root } = await setup();
    const entry: (label: string) => HTMLElement | undefined = (
      label: string,
    ): HTMLElement | undefined =>
      [...root.querySelectorAll<HTMLElement>('aside a, aside button')].find((element) =>
        element.textContent?.includes(label),
      );
    const tip: (element: HTMLElement | undefined) => Promise<string | null> = async (
      element: HTMLElement | undefined,
    ): Promise<string | null> => {
      element?.dispatchEvent(new FocusEvent('focusin'));
      await fixture.whenStable();
      const text: string | null =
        document.querySelector('[role="tooltip"]')?.textContent?.trim() ?? null;
      element?.dispatchEvent(new FocusEvent('focusout'));
      await fixture.whenStable();
      return text;
    };

    expect(await tip(entry('Rechercher'))).toBe('Rechercher (Ctrl K)');
    expect(await tip(entry('Voir le site'))).toBe('Voir le site');
    expect(await tip(entry('Se déconnecter'))).toBe('Se déconnecter');

    query.matches = false;
    query.listener?.({ matches: false });
    await fixture.whenStable();
    expect(await tip(entry('Se déconnecter'))).toBeNull();

    fixture.destroy();
    expect(query.listener).toBeNull();
  });
});
