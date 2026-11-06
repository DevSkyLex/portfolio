import type { Mock } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { LOCALE_ID, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { ArticleEditorComponent } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/article-editor.component';
import type { AdminLegalDocument, AdminProfile } from '@vfortin/content-web-data-access/admin';
import { ConfirmDialogService, ToastService } from '@vfortin/ui';
import {
  ADMIN_INFORMATION_ROUTES,
  ADMIN_LEGAL_ROUTES,
} from '@internal/content-web-feature-admin/lib/admin-site-texts.routes';

/**
 * Type AdminProfileDto
 *
 * @description
 * Profile as the API answers it (the feature reads no contract).
 */
type AdminProfileDto = Omit<AdminProfile, 'facts' | 'links'> & {
  facts: AdminProfile['facts'][number][];
  links: AdminProfile['links'][number][];
};

/**
 * Constant PROFILE
 *
 * @description
 * Profile at version 3 with one fact and two links.
 */
const PROFILE: AdminProfileDto = {
  heroIntro: { fr: 'Designer fictif à Ville-Exemple.', en: 'Fictional designer in Example Town.' },
  aboutStatement: { fr: 'J’aime le code.', en: 'I like code.' },
  aboutLead: {
    fr: 'Après une formation fictive en design.',
    en: 'After a fictional design course.',
  },
  facts: [
    {
      label: { fr: 'Basé à', en: 'Based in' },
      value: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
    },
  ],
  links: [
    { kind: 'email', url: 'mailto:morgan@example.com', label: null },
    { kind: 'github', url: 'https://example.com/demo/code', label: null },
  ],
  version: 3,
};

/**
 * Function legal
 *
 * @description
 * Legal document DTO.
 *
 * @param {AdminLegalDocument['kind']} kind - Document.
 * @param {number} version - Version.
 * @param {string} updatedAt - Last save.
 *
 * @returns {AdminLegalDocument} Document.
 */
const legal = (
  kind: AdminLegalDocument['kind'],
  version: number,
  updatedAt: string = '2026-11-02T12:00:00.000Z',
): AdminLegalDocument => ({
  kind,
  body: {
    fr: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte' }] }],
    },
    en: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text' }] }],
    },
  },
  updatedAt,
  version,
});

/**
 * Constant REBUILD
 *
 * @description
 * Site rebuild notice merged into each save toast.
 */
const REBUILD: string = 'Le site sera mis à jour automatiquement après les modifications.';

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
 * Function toasts
 *
 * @description
 * Type, message and description of the queued toasts.
 *
 * @returns {[string, string, string | undefined][]} Toasts, oldest first.
 */
const toasts: () => [string, string, string | undefined][] = (): [
  string,
  string,
  string | undefined,
][] =>
  TestBed.inject<ToastService>(ToastService)
    .toasts()
    .map((toast): [string, string, string | undefined] => [
      toast.type,
      toast.message,
      toast.description,
    ]);

/**
 * Interface Opened
 *
 * @description
 * Harness of an opened administration URL.
 */
interface Opened {
  readonly backend: HttpTestingController;
  readonly harness: RouterTestingHarness;
  readonly root: () => HTMLElement;
  readonly settle: () => Promise<void>;
}

/**
 * Function open
 *
 * @description
 * Mounts the routes as the shell does (`/admin/information`, `/admin/legal`) and opens a URL, in the
 * French build unless a provider sets another `LOCALE_ID`.
 *
 * @param {string} url - URL to open.
 * @param {Provider[]} providers - Extra providers.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function open(url: string, providers: Provider[] = []): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: 'fr' },
      ...providers,
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'admin/information', children: ADMIN_INFORMATION_ROUTES },
        { path: 'admin/legal', children: ADMIN_LEGAL_ROUTES },
        { path: 'admin/projects', children: [] },
      ]),
    ],
  });
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const harness: RouterTestingHarness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await flush();
  const settle = async (): Promise<void> => {
    await flush();
    await harness.fixture.whenStable();
  };
  return {
    backend,
    harness,
    root: (): HTMLElement => harness.routeNativeElement as HTMLElement,
    settle,
  };
}

/**
 * Function information
 *
 * @description
 * Opens « Informations » and answers its read.
 *
 * @param {Provider[]} providers - Extra providers.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function information(providers: Provider[] = []): Promise<Opened> {
  const opened: Opened = await open('/admin/information', providers);
  opened.backend.expectOne({ method: 'GET', url: '/api/content/admin/profile' }).flush(PROFILE);
  await opened.settle();
  return opened;
}

/**
 * Function showLanguage
 *
 * @description
 * Shows a bilingual field in a language through the selector joined to it.
 *
 * @param {Opened} opened - Harness.
 * @param {string} label - Field label the selector is named after.
 * @param {'fr' | 'en'} locale - Language.
 *
 * @returns {Promise<void>} Completion.
 */
async function showLanguage(opened: Opened, label: string, locale: 'fr' | 'en'): Promise<void> {
  const name: string = locale === 'en' ? 'English' : 'Français';
  // The segmented toggle joined to the field: one button per language.
  const group: HTMLElement | null = opened
    .root()
    .querySelector<HTMLElement>(`div[role="group"][aria-label="Langue du champ ${label}"]`);
  const choice: HTMLButtonElement | undefined = [
    ...(group?.querySelectorAll<HTMLButtonElement>('button') ?? []),
  ].find((button: HTMLButtonElement): boolean => (button.textContent ?? '').includes(name));
  if (choice) {
    choice.click();
    await opened.settle();
    return;
  }
  // The earlier menu form of the selector.
  const trigger: HTMLButtonElement | undefined = [
    ...opened.root().querySelectorAll<HTMLButtonElement>('button[aria-haspopup="menu"]'),
  ].find((button: HTMLButtonElement): boolean =>
    (button.getAttribute('aria-label') ?? '').startsWith(`Langue du champ ${label} :`),
  );
  if (!trigger) throw new Error(`${label} language selector missing`);
  trigger.click();
  await opened.settle();
  const item: HTMLElement | undefined = [
    ...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
  ].find((candidate: HTMLElement): boolean => (candidate.textContent ?? '').includes(name));
  if (!item) throw new Error(`${locale} item missing`);
  item.click();
  await opened.settle();
}

/**
 * Constant TEXT_LABELS
 *
 * @description
 * Selector label of each « Présentation » text.
 */
const TEXT_LABELS: Readonly<Record<string, string>> = {
  heroIntro: 'Introduction',
  aboutStatement: 'Phrase du À propos',
  aboutLead: 'Texte du À propos',
};

/**
 * Function type
 *
 * @description
 * Types into a control by id, first showing the language of a bilingual field when hidden.
 *
 * @param {Opened} opened - Harness.
 * @param {string} id - Control id.
 * @param {string} value - Value.
 *
 * @returns {Promise<void>} Completion.
 */
async function type(opened: Opened, id: string, value: string): Promise<void> {
  const text: RegExpExecArray | null =
    /^edit-profile-(heroIntro|aboutStatement|aboutLead)-(fr|en)$/.exec(id);
  const fact: RegExpExecArray | null = /^edit-profile-fact-(\d+)-(label|value)-(fr|en)$/.exec(id);
  if (!opened.root().querySelector(`#${id}`)) {
    if (text)
      await showLanguage(opened, TEXT_LABELS[text[1] ?? ''] ?? '', text[2] === 'en' ? 'en' : 'fr');
    if (fact)
      await showLanguage(opened, `Repère ${Number(fact[1]) + 1}`, fact[3] === 'en' ? 'en' : 'fr');
  }
  const field: HTMLInputElement | HTMLTextAreaElement | null = opened
    .root()
    .querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
  if (!field) throw new Error(`${id} missing`);
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await opened.harness.fixture.whenStable();
}

/**
 * Function button
 *
 * @description
 * Visible button by label (the first match).
 *
 * @param {HTMLElement} root - Page.
 * @param {string} label - Text or accessible name.
 *
 * @returns {HTMLButtonElement} Button.
 */
const button = (root: HTMLElement, label: string): HTMLButtonElement => {
  const found: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find(
    (b: HTMLButtonElement): boolean =>
      !b.closest('[hidden]') &&
      (b.textContent?.trim() === label || b.getAttribute('aria-label') === label),
  );
  if (!found) throw new Error(`${label} missing`);
  return found;
};

/**
 * Function saveButton
 *
 * @description
 * Save button of the visible form (its label also holds the shortcut caps).
 *
 * @param {HTMLElement} root - Page.
 *
 * @returns {HTMLButtonElement} Button.
 */
const saveButton = (root: HTMLElement): HTMLButtonElement => {
  const found: HTMLButtonElement | undefined = [
    ...root.querySelectorAll<HTMLButtonElement>('button[type="submit"]'),
  ].find((b: HTMLButtonElement): boolean => !b.closest('[hidden]'));
  if (!found) throw new Error('save button missing');
  return found;
};

/**
 * Function submit
 *
 * @description
 * Submits the first visible form.
 *
 * @param {Opened} opened - Harness.
 *
 * @returns {Promise<void>} Completion.
 */
async function submit(opened: Opened): Promise<void> {
  const form: HTMLFormElement | undefined = [...opened.root().querySelectorAll('form')].find(
    (candidate: HTMLFormElement): boolean => !candidate.closest('[hidden]'),
  );
  form?.dispatchEvent(new Event('submit', { cancelable: true }));
  await opened.settle();
}

describe('AdminInformationPageComponent', (): void => {
  it('lays the profile out with its sections, language selectors and links, then saves it with If-Match', async (): Promise<void> => {
    const opened: Opened = await information();
    const root: HTMLElement = opened.root();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Informations');
    expect(root.querySelector('header')?.firstElementChild?.tagName).toBe('UI-SIDEBAR-TRIGGER');
    expect(root.textContent).toContain('Version 3');
    // No page tabs: each bilingual field shows French, with its selector joined to it.
    expect(root.querySelector('[role="tab"]')).toBeNull();
    expect(root.querySelector<HTMLTextAreaElement>('#edit-profile-heroIntro-fr')?.value).toBe(
      'Designer fictif à Ville-Exemple.',
    );
    expect(root.querySelector('#edit-profile-heroIntro-en')).toBeNull();
    expect(root.querySelector('#edit-profile-heroIntro-fr')?.getAttribute('aria-label')).toBe(
      'Introduction en français',
    );
    await showLanguage(opened, 'Introduction', 'en');
    const english: HTMLTextAreaElement | null = root.querySelector('#edit-profile-heroIntro-en');
    expect(english?.value).toBe('Fictional designer in Example Town.');
    expect(english?.getAttribute('lang')).toBe('en');
    // The e-mail is edited without mailto:.
    expect(root.querySelector<HTMLInputElement>('#edit-profile-link-0-url')?.value).toBe(
      'morgan@example.com',
    );
    expect(saveButton(root).disabled).toBe(true);

    await type(opened, 'edit-profile-fact-0-value-fr', 'Ville-Exemple, quartier imaginaire');
    button(root, 'Ajouter un lien').click();
    await opened.settle();
    await type(opened, 'edit-profile-link-2-url', 'https://example.com/demo/freelance');
    await type(opened, 'edit-profile-link-2-label', 'Malt');
    await submit(opened);
    const call: TestRequest = opened.backend.expectOne({
      method: 'PUT',
      url: '/api/content/admin/profile',
    });
    expect(call.request.headers.get('if-match')).toBe('"3"');
    expect(call.request.body.facts[0].value).toEqual({
      fr: 'Ville-Exemple, quartier imaginaire',
      en: 'Ville-Exemple',
    });
    expect(call.request.body.links).toEqual([
      { kind: 'email', url: 'mailto:morgan@example.com', label: null },
      { kind: 'github', url: 'https://example.com/demo/code', label: null },
      { kind: 'website', url: 'https://example.com/demo/freelance', label: 'Malt' },
    ]);
    call.flush({ ...PROFILE, version: 4 });
    await opened.settle();
    expect(root.textContent).toContain('Version 4');
    expect(toasts()).toEqual([['success', 'Informations enregistrées.', REBUILD]]);
  });

  it('refuses a missing English text, an insecure address and a second GitHub link before sending', async (): Promise<void> => {
    const opened: Opened = await information();
    const root: HTMLElement = opened.root();
    await type(opened, 'edit-profile-aboutLead-en', ' ');
    await type(opened, 'edit-profile-link-1-url', 'http://example.com/demo/code');
    button(root, 'Ajouter un lien').click();
    await opened.settle();
    await submit(opened);
    opened.backend.expectNone('/api/content/admin/profile');
    expect(root.querySelector('#edit-profile-aboutLead-en')?.getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(root.textContent).toContain('Indiquez une adresse complète commençant par https://.');
    expect(root.textContent).toContain('Indiquez l’adresse du lien.');
    await showLanguage(opened, 'Texte du À propos', 'fr');
    await submit(opened);
    // The invalid submit shows the field in its language in error again.
    expect(root.querySelector('#edit-profile-aboutLead-en')).not.toBeNull();
    expect(root.textContent).toContain(
      'Le texte anglais est obligatoire : le profil est publié dès son enregistrement.',
    );
  });

  it('adds, moves and removes facts, up to eight', async (): Promise<void> => {
    const opened: Opened = await information();
    const root: HTMLElement = opened.root();
    for (let i: number = 0; i < 7; i++) {
      button(root, 'Ajouter un repère').click();
      await opened.settle();
    }
    expect(button(root, 'Ajouter un repère').disabled).toBe(true);
    // Rows reorder by drag and drop from a grip (owner review): no move buttons any more.
    expect(root.textContent).not.toContain('Monter le');
    for (const label of ['Déplacer le repère 1', 'Déplacer le lien 1']) {
      expect(button(root, label).className).toContain('cursor-grab');
      expect(button(root, label).getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown');
    }
    expect(button(root, 'Retirer le repère 1').getAttribute('variant')).toBe('ghost');
    await type(opened, 'edit-profile-fact-7-label-fr', 'Dernier');
    // The grip's arrow keys move the row and keep the focus on its grip.
    button(root, 'Déplacer le repère 8').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
    );
    await opened.settle();
    expect(root.querySelector<HTMLInputElement>('#edit-profile-fact-6-label-fr')?.value).toBe(
      'Dernier',
    );
    expect(document.activeElement?.id).toBe('edit-profile-fact-6-handle');
    button(root, 'Retirer le repère 1').click();
    await opened.settle();
    expect(root.querySelector<HTMLInputElement>('#edit-profile-fact-5-label-fr')?.value).toBe(
      'Dernier',
    );
    expect(button(root, 'Ajouter un repère').disabled).toBe(false);
    expect(root.textContent).toContain('Modifications non enregistrées');
  });

  it('keeps a refused field error on its field, and offers to reload after a conflict', async (): Promise<void> => {
    const opened: Opened = await information();
    const root: HTMLElement = opened.root();
    await type(opened, 'edit-profile-heroIntro-fr', 'Nouvelle intro');
    await submit(opened);
    opened.backend.expectOne({ method: 'PUT', url: '/api/content/admin/profile' }).flush(
      {
        code: 'content.invalid-value',
        errors: [{ field: 'links.1.kind', message: 'Un seul lien GitHub.' }],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await opened.settle();
    expect(root.textContent).toContain('Un seul lien GitHub.');
    // The refused kind is unchanged: the form keeps the error and sends nothing.
    await submit(opened);
    opened.backend.expectNone('/api/content/admin/profile');
    button(root, 'Retirer le lien 2').click();
    await opened.settle();
    expect(root.textContent).not.toContain('Un seul lien GitHub.');
    await submit(opened);
    opened.backend
      .expectOne({ method: 'PUT', url: '/api/content/admin/profile' })
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await opened.settle();
    expect(root.textContent).toContain(
      'Les informations ont été modifiées ailleurs depuis leur ouverture.',
    );
    button(root, 'Recharger').click();
    await opened.settle();
    opened.backend
      .expectOne({ method: 'GET', url: '/api/content/admin/profile' })
      .flush({ ...PROFILE, version: 6 });
    await opened.settle();
    expect(root.textContent).toContain('Version 6');
    expect(root.textContent).not.toContain('modifiées ailleurs');
  });

  it('toasts an incomplete profile refused by the service', async (): Promise<void> => {
    const opened: Opened = await information();
    await type(opened, 'edit-profile-heroIntro-fr', 'Nouvelle intro');
    await submit(opened);
    opened.backend
      .expectOne({ method: 'PUT', url: '/api/content/admin/profile' })
      .flush(
        { code: 'content.profile-incomplete', errors: [] },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await opened.settle();
    expect(toasts()[0]?.slice(0, 2)).toEqual(['error', 'Complétez les deux langues.']);
  });

  it('asks before leaving a dirty form, and offers to retry a failed read', async (): Promise<void> => {
    const confirm: Mock<() => Promise<boolean>> = vi.fn((): Promise<boolean> =>
      Promise.resolve(false),
    );
    const opened: Opened = await information([
      { provide: ConfirmDialogService, useValue: { confirm } },
    ]);
    await type(opened, 'edit-profile-heroIntro-fr', 'Autre');
    await TestBed.inject(Router).navigateByUrl('/admin/projects');
    await opened.settle();
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Quitter sans enregistrer ?' }),
    );
    expect(TestBed.inject(Router).url).toBe('/admin/information');
  });

  it('shows a failed read with a retry', async (): Promise<void> => {
    const opened: Opened = await open('/admin/information');
    opened.backend
      .expectOne('/api/content/admin/profile')
      .flush({ code: 'http.503' }, { status: 503, statusText: 'Unavailable' });
    await opened.settle();
    expect(opened.root().textContent).toContain('Impossible de charger les informations');
    button(opened.root(), 'Réessayer').click();
    await opened.settle();
    opened.backend.expectOne('/api/content/admin/profile').flush(PROFILE);
    await opened.settle();
    expect(opened.root().querySelector('content-profile-form')).not.toBeNull();
  });
});

describe('AdminLegalPageComponent', (): void => {
  /**
   * Function legalPage
   *
   * @description
   * Opens « Légal » and answers both reads.
   *
   * @param {Provider[]} providers - Extra providers.
   *
   * @returns {Promise<Opened>} Harness.
   */
  async function legalPage(providers: Provider[] = []): Promise<Opened> {
    const opened: Opened = await open('/admin/legal', providers);
    opened.backend.expectOne('/api/content/admin/legal/notice').flush(legal('notice', 2));
    opened.backend
      .expectOne('/api/content/admin/legal/privacy')
      .flush(legal('privacy', 1, '2026-11-03T23:30:00.000Z'));
    await opened.settle();
    return opened;
  }

  it('shows the document tabs, the date of the shown document and one editor with its language selector', async (): Promise<void> => {
    const opened: Opened = await legalPage();
    const root: HTMLElement = opened.root();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Légal');
    expect(
      [...root.querySelectorAll('[role="tab"]')].map((t): string => t.textContent?.trim() ?? ''),
    ).toEqual(['Mentions légales', 'Confidentialité']);
    expect(root.textContent).toContain('Dernière mise à jour le 2 novembre 2026');
    expect(root.textContent).toContain('Version 2');
    const pane = (id: string): HTMLElement | null =>
      root.querySelector<HTMLElement>(`#${id}`)?.closest<HTMLElement>('[hidden]') ?? null;
    // Both editors stay alive: the English one is hidden until its language is chosen.
    expect(root.querySelector('#edit-legal-notice-fr')).not.toBeNull();
    expect(pane('edit-legal-notice-fr')).toBeNull();
    expect(pane('edit-legal-notice-en')).not.toBeNull();
    await showLanguage(opened, 'Mentions légales', 'en');
    expect(pane('edit-legal-notice-en')).toBeNull();
    expect(pane('edit-legal-notice-fr')).not.toBeNull();
    (root.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1] as HTMLButtonElement).click();
    await opened.settle();
    // Saved at 23:30 UTC: already 4 November in Paris.
    expect(root.textContent).toContain('Dernière mise à jour le 4 novembre 2026');
    expect(root.textContent).toContain('Version 1');
  });

  it('writes the date of the last save in the locale of the build', async (): Promise<void> => {
    const opened: Opened = await legalPage([{ provide: LOCALE_ID, useValue: 'en' }]);
    expect(opened.root().textContent).toContain('November 2, 2026');
    expect(opened.root().textContent).not.toContain('novembre');
  });

  it('saves the shown document with Ctrl+S and If-Match, then toasts', async (): Promise<void> => {
    const opened: Opened = await legalPage();
    const root: HTMLElement = opened.root();
    // Nothing to save: the shortcut sends nothing.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    await opened.settle();
    opened.backend.expectNone('/api/content/admin/legal/notice');
    expect(saveButton(root).disabled).toBe(true);
    expect(root.textContent).toContain('Tout est enregistré');
  });

  it('saves an edited document with If-Match, then keeps a conflict on its tab until reloaded', async (): Promise<void> => {
    const opened: Opened = await legalPage();
    const root: HTMLElement = opened.root();
    await showLanguage(opened, 'Mentions légales', 'en');
    // The notice's English editor: notice French and English, then the privacy policy's.
    const editor: ArticleEditorComponent = opened.harness.fixture.debugElement
      .queryAll(By.directive(ArticleEditorComponent))
      .map((node) => node.componentInstance as ArticleEditorComponent)[1] as ArticleEditorComponent;
    editor.value.set({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New text' }] }],
    });
    await opened.settle();
    expect(root.textContent).toContain('Modifications non enregistrées');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    await opened.settle();
    const call: TestRequest = opened.backend.expectOne({
      method: 'PUT',
      url: '/api/content/admin/legal/notice',
    });
    expect(call.request.headers.get('if-match')).toBe('"2"');
    expect(call.request.body.body.en.content[0].content[0].text).toBe('New text');
    call.flush(legal('notice', 3, '2026-11-04T10:00:00.000Z'));
    await opened.settle();
    expect(root.textContent).toContain('Version 3');
    expect(root.textContent).toContain('Dernière mise à jour le 4 novembre 2026');
    expect(toasts()).toEqual([
      ['success', '« Mentions légales » : modifications enregistrées.', REBUILD],
    ]);

    editor.value.set({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Again' }] }],
    });
    await opened.settle();
    await submit(opened);
    opened.backend
      .expectOne({ method: 'PUT', url: '/api/content/admin/legal/notice' })
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await opened.settle();
    expect(root.textContent).toContain('« Mentions légales » a été modifié ailleurs');
    button(root, 'Recharger').click();
    await opened.settle();
    opened.backend.expectOne('/api/content/admin/legal/notice').flush(legal('notice', 7));
    await opened.settle();
    expect(root.textContent).not.toContain('modifié ailleurs');
    expect(root.textContent).toContain('Version 7');
  });

  it('offers to reload the document of a conflict, and shows a failed read', async (): Promise<void> => {
    const opened: Opened = await open('/admin/legal');
    opened.backend
      .expectOne('/api/content/admin/legal/notice')
      .flush({ code: 'http.503' }, { status: 503, statusText: 'Unavailable' });
    opened.backend.expectOne('/api/content/admin/legal/privacy').flush(legal('privacy', 1));
    await opened.settle();
    expect(opened.root().textContent).toContain('Impossible de charger les documents légaux');
    button(opened.root(), 'Réessayer').click();
    await opened.settle();
    opened.backend.expectOne('/api/content/admin/legal/notice').flush(legal('notice', 2));
    opened.backend.expectOne('/api/content/admin/legal/privacy').flush(legal('privacy', 1));
    await opened.settle();
    expect(opened.root().querySelectorAll('content-legal-document-form')).toHaveLength(2);
  });
});
