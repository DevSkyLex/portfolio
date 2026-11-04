import type { Mock } from 'vitest';
import type { AdminProjectEditPageComponent } from '@internal/content-web-feature-admin/lib/ui/pages/admin-project-edit-page/admin-project-edit-page.component';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { LOCALE_ID, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Editor, JSONContent } from '@tiptap/core';
import type { AdminProject, ArticleDocumentDraft } from '@vfortin/content-web-data-access/admin';
import { type ConfirmDialogOptions, ConfirmDialogService, ToastService } from '@vfortin/ui';
import { ADMIN_CONTENT_ROUTES } from '@internal/content-web-feature-admin/lib/admin-content.routes';

// The French build's plural rules, for the count of the list title under `FRENCH_BUILD`.
registerLocaleData(localeFr);

/**
 * Constant FRENCH_BUILD
 *
 * @description
 * `LOCALE_ID` of the French source build, for the tests of the links to the public site; the others
 * keep Angular's default `en-US`, which formats the dates (no translation is loaded either way).
 *
 * @type {Provider}
 */
const FRENCH_BUILD: Provider = { provide: LOCALE_ID, useValue: 'fr' };

/** Router and HTTP boundaries shared by administrator route test helpers. */
interface OpenedProjectHarness {
  backend: HttpTestingController;
  harness: RouterTestingHarness;
  navigation: ReturnType<RouterTestingHarness['navigateByUrl']>;
}

/** Editor interactions exposed by the route test helper. */
interface EditorHarness extends OpenedProjectHarness {
  root: HTMLElement;
  type: (id: string, value: string) => Promise<void>;
  showLanguage: (label: string, locale: 'fr' | 'en') => Promise<void>;
  submit: () => Promise<void>;
  settle: () => Promise<void>;
}

/**
 * Constant FIELD_LABELS
 *
 * @description
 * Label of each bilingual control of the project editor by its id stem, the name of its language
 * toggle (« Langue du champ <label> »).
 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  title: 'Titre',
  summary: 'Résumé',
  lead: 'Chapô',
  client: 'Client',
  role: 'Rôle',
  place: 'Lieu',
  'seo-title': 'Titre de recherche',
  'seo-description': 'Description de recherche',
  'seo-keywords': 'Mots clés',
  'cover-alt': 'Texte alternatif',
};

/** Project-list interactions exposed by the route test helper. */
interface ListHarness extends OpenedProjectHarness {
  root: HTMLElement;
  settle: () => Promise<void>;
  action: (row: number, label: string) => Promise<HTMLElement>;
}

/**
 * Function t
 *
 * @description
 * Creates a contract localized value and omits English when the fixture has no translation.
 *
 * @param {string} fr - French source text.
 * @param {string} [en] - Optional English translation.
 *
 * @returns {{ fr: string; en?: string }} Localized content fixture.
 */
const t = (fr: string, en?: string): { fr: string; en?: string } =>
  en === undefined ? { fr } : { fr, en };

/**
 * Constant MEDIA
 *
 * @description
 * Media stored by the fake upload endpoint.
 */
const MEDIA: { id: string; src: string; width: number; height: number } = {
  id: '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
  src: '/media/3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90.webp',
  width: 1600,
  height: 900,
};

/**
 * Function doc
 *
 * @description
 * Builds an article document of one paragraph per text.
 *
 * @param {...string} texts - Paragraph texts.
 *
 * @returns {ArticleDocumentDraft} Article document.
 */
const doc = (...texts: string[]): ArticleDocumentDraft => ({
  type: 'doc',
  content: texts.map((text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
});

/**
 * Function project
 *
 * @description
 * Builds an administrator project fixture with the requested publication state and missing-field list;
 * both articles hold one paragraph and the project has no cover.
 *
 * @param {string} id - Stable fixture identifier and slug.
 * @param {'draft' | 'published'} status - Publication state of the fixture.
 * @param {string[]} [missing] - Fields reported incomplete by the API.
 *
 * @returns {AdminProject} Administrator project response used by route and form tests.
 */
const project: (id: string, status: 'draft' | 'published', missing?: string[]) => AdminProject = (
  id: string,
  status: 'draft' | 'published',
  missing: string[] = [],
): AdminProject => ({
  id,
  slug: id,
  status,
  version: 4,
  position: 0,
  title: t(`Titre ${id}`, `Title ${id}`),
  summary: t('Résumé', 'Summary'),
  lead: t('Chapô', 'Lead'),
  period: { start: { year: 2026, month: null }, end: null },
  client: t('Client', 'Client'),
  role: t('Rôle', 'Role'),
  place: t('Lieu', 'Place'),
  siteUrl: null,
  techs: ['angular'],
  featured: false,
  article: { fr: doc('Un.'), en: doc('One.') },
  cover: null,
  media: [],
  seo: { title: {}, description: {}, keywords: { fr: [], en: [] } },
  missing,
});

/**
 * Function complete
 *
 * @description
 * Builds a project fixture complete in both languages, with a described cover and its media.
 *
 * @param {string} id - Stable fixture identifier and slug.
 * @param {'draft' | 'published'} status - Publication state of the fixture.
 *
 * @returns {AdminProject} Complete administrator project response.
 */
const complete: (id: string, status: 'draft' | 'published') => AdminProject = (
  id: string,
  status: 'draft' | 'published',
): AdminProject => ({
  ...project(id, status),
  cover: { media: MEDIA.id, alt: t('Couverture', 'Cover') },
  media: [MEDIA],
});

/**
 * Function editorOf
 *
 * @description
 * TipTap editor of one language's article, mounted by the article editor component.
 *
 * @param {HTMLElement} root - Rendered page root.
 * @param {'fr' | 'en'} lang - Article language.
 *
 * @returns {Editor} The editor.
 */
const editorOf = (root: HTMLElement, lang: 'fr' | 'en'): Editor => {
  const surface: (HTMLElement & { editor?: Editor }) | null = root.querySelector(
    `#edit-article-${lang}`,
  );
  if (!surface?.editor) throw new Error(`${lang} editor missing`);
  return surface.editor;
};

/**
 * Function figure
 *
 * @description
 * Figure node of the stored media.
 *
 * @param {string} alt - Alternative text.
 *
 * @returns {{ type: 'figure'; attrs: Record<string, string | null> }} Figure JSON.
 */
const figure = (alt: string): { type: 'figure'; attrs: Record<string, string | null> } => ({
  type: 'figure',
  attrs: { media: MEDIA.id, alt, caption: '', src: MEDIA.src },
});

/**
 * Function flush
 *
 * @description
 * Yields one timer turn so asynchronous HTTP and route work can settle in the harness.
 *
 * @returns {Promise<void>} Completion after the next timer callback.
 */
const flush: () => Promise<unknown> = (): Promise<unknown> =>
  new Promise((resolve: (value: unknown) => void): ReturnType<typeof setTimeout> =>
    setTimeout(resolve),
  );

/**
 * Function toasts
 *
 * @description
 * Reads the toasts queued for the admin layout's toaster, which the routed pages do not render.
 *
 * @returns {[string, string][]} Type and message of each toast, oldest first.
 */
const toasts: () => [string, string][] = (): [string, string][] =>
  TestBed.inject<ToastService>(ToastService)
    .toasts()
    .map((toast): [string, string] => [toast.type, toast.message]);

/**
 * Function descriptions
 *
 * @description
 * Reads the descriptions of the queued toasts, where an action that changes the public site
 * announces its rebuild once.
 *
 * @returns {(string | undefined)[]} Description of each toast, oldest first.
 */
const descriptions: () => (string | undefined)[] = (): (string | undefined)[] =>
  TestBed.inject<ToastService>(ToastService)
    .toasts()
    .map((toast): string | undefined => toast.description);

/**
 * Function open
 *
 * @description
 * Configures the administrator routes with HTTP testing providers and starts navigation to the supplied URL.
 *
 * @param {string} url - Administrator URL opened by the router harness.
 * @param {Provider[]} [providers] - Extra providers, such as a confirmation double or a build
 * `LOCALE_ID` (`FRENCH_BUILD`).
 *
 * @returns {Promise<OpenedProjectHarness>} Harness, backend controller, and pending navigation.
 */
async function open(url: string, providers: Provider[] = []): Promise<OpenedProjectHarness> {
  TestBed.configureTestingModule({
    providers: [
      ...providers,
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter(
        [{ path: 'admin/projects', children: ADMIN_CONTENT_ROUTES }],
        withComponentInputBinding(),
      ),
    ],
  });
  const backend: HttpTestingController =
    TestBed.inject<HttpTestingController>(HttpTestingController);
  const harness: RouterTestingHarness = await RouterTestingHarness.create();
  const navigation: ReturnType<RouterTestingHarness['navigateByUrl']> = harness.navigateByUrl(url);
  return { backend, harness, navigation };
}

/**
 * Function edit
 *
 * @description
 * Opens the project editor with the supplied response and returns helpers for filling and submitting its form.
 *
 * @param {AdminProject} current - Project response returned by the initial request.
 * @param {Provider[]} [providers] - Extra providers, such as a confirmation double.
 *
 * @returns {Promise<EditorHarness>} Harness, rendered root, and editor interaction helpers.
 */
const edit = async (current: AdminProject, providers: Provider[] = []): Promise<EditorHarness> => {
  const opened: OpenedProjectHarness = await open(`/admin/projects/${current.id}`, providers);
  await opened.navigation;
  await flush();
  opened.backend.expectOne(`/api/content/admin/projects/${current.id}`).flush(current);
  await flush();
  await opened.harness.fixture.whenStable();
  const root: HTMLElement = opened.harness.routeNativeElement as HTMLElement;

  /**
   * Function showLanguage
   *
   * @description
   * Shows a bilingual field in a language by pressing that language in its toggle.
   *
   * @param {string} label - Field label, as in « Langue du champ <label> ».
   * @param {'fr' | 'en'} locale - Language shown.
   *
   * @returns {Promise<void>} Completion once the field shows the language.
   */
  const showLanguage: (label: string, locale: 'fr' | 'en') => Promise<void> = async (
    label: string,
    locale: 'fr' | 'en',
  ): Promise<void> => {
    const name: string = locale === 'en' ? 'English' : 'Français';
    const found: HTMLButtonElement | undefined = [
      ...localeToggle(root, label).querySelectorAll<HTMLButtonElement>('button'),
    ].find((candidate: HTMLButtonElement): boolean => (candidate.textContent ?? '').includes(name));
    if (!found) throw new Error(`${label} ${name} button missing`);
    found.click();
    await opened.harness.fixture.whenStable();
  };

  /**
   * Function type
   *
   * @description
   * Enters a value into the form control with the given id, first showing its language when the
   * field shows the other one.
   *
   * @param {string} id - Control id, such as `edit-title-fr` or `edit-seo-title-en`.
   * @param {string} value - Text entered into the control.
   *
   * @returns {Promise<void>} Completion after the form receives and stabilizes the input event.
   */
  const type: (id: string, value: string) => Promise<void> = async (
    id: string,
    value: string,
  ): Promise<void> => {
    const localized: RegExpExecArray | null = /^edit-([a-zA-Z-]+)-(fr|en)$/.exec(id);
    const label: string | undefined = FIELD_LABELS[localized?.[1] ?? ''];
    if (label && !root.querySelector(`#${id}`)) {
      await showLanguage(label, localized?.[2] === 'en' ? 'en' : 'fr');
    }
    const field: HTMLInputElement | HTMLTextAreaElement | null = root.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(`#${id}`);
    if (!field) throw new Error(`${id} missing`);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await opened.harness.fixture.whenStable();
  };

  /**
   * Function submit
   *
   * @description
   * Dispatches a cancellable submit event on the editor form and waits for the page to settle.
   *
   * @returns {Promise<void>} Completion after the submit handler and pending view updates.
   */
  const submit: () => Promise<void> = async (): Promise<void> => {
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    await opened.harness.fixture.whenStable();
  };

  /**
   * Function settle
   *
   * @description
   * Waits for the next timer turn and for Angular's editor fixture to stabilize.
   *
   * @returns {Promise<void>} Completion after asynchronous page work has settled.
   */
  const settle: () => Promise<void> = async (): Promise<void> => {
    await flush();
    await opened.harness.fixture.whenStable();
  };
  return { ...opened, root, type, showLanguage, submit, settle };
};

/**
 * Function list
 *
 * @description
 * Opens the project list, responds with the supplied collection, and exposes the row menu items.
 *
 * @param {AdminProject[]} projects - Project collection returned by the list endpoint.
 * @param {Provider[]} [providers] - Extra providers, such as a confirmation double.
 * @param {string} [url] - List URL, with the query parameters of a table state.
 *
 * @returns {Promise<ListHarness>} Harness, rendered list, request controller, and row menu helper.
 */
const list = async (
  projects: AdminProject[],
  providers: Provider[] = [],
  url: string = '/admin/projects',
): Promise<ListHarness> => {
  const opened: OpenedProjectHarness = await open(url, providers);
  await opened.navigation;
  opened.backend
    .expectOne('/api/content/admin/projects')
    .flush({ member: projects, totalItems: projects.length });
  await flush();
  await opened.harness.fixture.whenStable();
  const root: HTMLElement = opened.harness.routeNativeElement as HTMLElement;

  /**
   * Function settle
   *
   * @description
   * Waits for the next timer turn and for Angular's list fixture to stabilize.
   *
   * @returns {Promise<void>} Completion after asynchronous list work has settled.
   */
  const settle: () => Promise<void> = async (): Promise<void> => {
    await flush();
    await opened.harness.fixture.whenStable();
  };

  /**
   * Function action
   *
   * @description
   * Opens the "…" menu of one project row and finds the item with the requested label, which the CDK
   * renders outside the page element; throws if the row or the item is absent.
   *
   * @param {number} row - Zero-based project row index.
   * @param {string} label - Visible item label to match.
   *
   * @returns {Promise<HTMLElement>} Matching menu item.
   */
  const action: (row: number, label: string) => Promise<HTMLElement> = async (
    row: number,
    label: string,
  ): Promise<HTMLElement> => {
    const trigger: HTMLButtonElement | null | undefined = root
      .querySelectorAll('tbody tr')
      [row]?.querySelector<HTMLButtonElement>('button[aria-label^="Actions pour"]');
    if (!trigger) throw new Error(`row ${row} menu missing`);
    if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
    await opened.harness.fixture.whenStable();
    const found: HTMLElement | undefined = menuItems().find(
      (item: HTMLElement): boolean => item.textContent?.trim() === label,
    );
    if (!found) throw new Error(`${label} missing`);
    return found;
  };
  return { ...opened, root, settle, action };
};

/**
 * Function menuItems
 *
 * @description
 * Items of the open row menu.
 *
 * @returns {HTMLElement[]} The menu items, in order.
 */
const menuItems: () => HTMLElement[] = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-slot="dropdown-menu-content"] [data-slot="dropdown-menu-item"]',
  ),
];

/**
 * Function button
 *
 * @description
 * Finds a page button by visible label and throws when the requested button is absent.
 *
 * @param {HTMLElement} root - Rendered page root to search.
 * @param {string} label - Visible button text to match.
 *
 * @returns {HTMLButtonElement} Matching button element.
 */
const button: (root: HTMLElement, label: string) => HTMLButtonElement = (
  root: HTMLElement,
  label: string,
): HTMLButtonElement => {
  const found: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find(
    (b: HTMLButtonElement): boolean => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`${label} missing`);
  return found;
};

/**
 * Function localeToggle
 *
 * @description
 * Language toggle of a bilingual field by its accessible name, the visible one for the article,
 * whose two editors each end their toolbar with one.
 *
 * @param {HTMLElement} root - Rendered page root to search.
 * @param {string} label - Field label, as in « Langue du champ <label> ».
 *
 * @returns {HTMLElement} The toggle group.
 */
const localeToggle: (root: HTMLElement, label: string) => HTMLElement = (
  root: HTMLElement,
  label: string,
): HTMLElement => {
  const found: HTMLElement | undefined = [
    ...root.querySelectorAll<HTMLElement>(`[role="group"][aria-label="Langue du champ ${label}"]`),
  ].find((group: HTMLElement): boolean => !group.closest('[hidden]'));
  if (!found) throw new Error(`${label} language toggle missing`);
  return found;
};

/**
 * Function shownLanguage
 *
 * @description
 * Language a bilingual field shows: the name of the pressed button of its toggle.
 *
 * @param {HTMLElement} root - Rendered page root to search.
 * @param {string} label - Field label.
 *
 * @returns {string | null} « Français », « English », or `null` without a pressed button.
 */
const shownLanguage: (root: HTMLElement, label: string) => string | null = (
  root: HTMLElement,
  label: string,
): string | null =>
  localeToggle(root, label).querySelector('[aria-pressed="true"] [lang]')?.textContent?.trim() ??
  null;

/**
 * Function languageStates
 *
 * @description
 * Spoken text of each button of a field's language toggle: the language, then its state when it
 * needs attention (« English, à compléter »).
 *
 * @param {HTMLElement} root - Rendered page root to search.
 * @param {string} label - Field label.
 *
 * @returns {string[]} French then English.
 */
const languageStates: (root: HTMLElement, label: string) => string[] = (
  root: HTMLElement,
  label: string,
): string[] =>
  [...localeToggle(root, label).querySelectorAll('button')].map(
    (button: HTMLButtonElement): string => button.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );

/**
 * Function projectCount
 *
 * @description
 * Count beside the project list title, spoken suffix included, whitespace collapsed.
 *
 * @param {HTMLElement} root - Rendered list page.
 *
 * @returns {string} The count text.
 */
const projectCount: (root: HTMLElement) => string = (root: HTMLElement): string =>
  root.querySelector('[data-slot="project-count"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/**
 * Function answer
 *
 * @description
 * Clicks a button of the open confirmation dialog, which the CDK renders outside the page element.
 *
 * @param {string} label - Visible button text.
 */
const answer: (label: string) => void = (label: string): void => {
  const found: HTMLButtonElement | undefined = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-content"] button'),
  ].find((b: HTMLButtonElement): boolean => b.textContent?.trim() === label);
  if (!found) throw new Error(`${label} missing`);
  found.click();
};

describe('projects admin (front end)', (): void => {
  it('lists the projects and blocks publishing an incomplete project', async (): Promise<void> => {
    const { root, action } = await list([
      project('a', 'published'),
      project('b', 'draft', ['title.en']),
    ]);
    const items: string[] = [...root.querySelectorAll('tbody tr')].map(
      (row: Element): string => row.textContent ?? '',
    );
    expect(items[0]).toContain('Publié');
    expect(items[1]).toContain('1 à compléter');
    // Resizable columns: the fixed layout gives each column its width from a col, the title
    // filling the room left without a handle, the actions their 52 px without one either.
    expect(root.querySelector('table')?.classList).toContain('table-fixed');
    expect(root.querySelector<HTMLElement>('col[data-column="titre"]')?.style.width).toBe('');
    expect(root.querySelector<HTMLElement>('col[data-column="technos"]')?.style.width).toBe(
      '224px',
    );
    expect(root.querySelector<HTMLElement>('col[data-column="actions"]')?.style.width).toBe('52px');
    const handles: (string | null)[] = [...root.querySelectorAll('thead [role="separator"]')].map(
      (handle: Element): string | null => handle.getAttribute('aria-label'),
    );
    expect(handles).not.toContain('Redimensionner la colonne Projet');
    expect(handles).toContain('Redimensionner la colonne Technos');
    expect(handles).toContain('Redimensionner la colonne Version');
    expect(handles).not.toContain('Redimensionner la colonne Actions');
    expect(root.querySelector('tbody td a')?.parentElement?.className).toContain('w-0 min-w-full');
    // An h-7 icon button takes the `sm` radius (D43).
    expect(root.querySelector('button[aria-label^="Actions pour"]')?.classList).toContain(
      'rounded-sm',
    );
    expect((await action(1, 'Publier')).getAttribute('aria-disabled')).toBe('true');
  });

  it('saves with If-Match and offers to reload on conflict', async (): Promise<void> => {
    const { backend, harness, root, type, showLanguage, submit, settle } = await edit(
      project('a', 'draft'),
    );
    expect(root.querySelector<HTMLInputElement>('#edit-title-fr')?.value).toBe('Titre a');
    await showLanguage('Article', 'en');
    await type('edit-title-fr', 'Nouveau titre');
    await submit();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    expect(call.request.body.title).toEqual({ fr: 'Nouveau titre', en: 'Title a' });
    await harness.fixture.whenStable();
    const fieldsets: HTMLFieldSetElement[] = [...root.querySelectorAll('fieldset')];
    // Presentation, information and search texts, then the shared settings.
    expect(fieldsets).toHaveLength(4);
    expect(fieldsets.every((fieldset: HTMLFieldSetElement): boolean => fieldset.disabled)).toBe(
      true,
    );
    expect(editorOf(root, 'fr').isEditable).toBe(false);
    expect(button(root, 'Partir du français').disabled).toBe(true);
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    backend.expectNone('/api/content/admin/projects/a');
    call.flush(
      { code: 'content.version-mismatch' },
      { status: 412, statusText: 'Precondition Failed' },
    );
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('modifié ailleurs');
    expect(toasts()).toEqual([]);
    expect(fieldsets.some((fieldset: HTMLFieldSetElement): boolean => fieldset.disabled)).toBe(
      false,
    );
    button(root, 'Recharger').click();
    await settle();
    backend
      .expectOne('/api/content/admin/projects/a')
      .flush({ ...project('a', 'draft'), version: 6 });
    await settle();
    expect(root.textContent).not.toContain('modifié ailleurs');
    expect(
      root.querySelector('aside[aria-label="Propriétés"]')?.textContent?.replace(/\s+/g, ''),
    ).toContain('Version6');
  });

  it('saves a draft and toasts it, keeping the form and the document title in step with the answer', async (): Promise<void> => {
    const { backend, root, type, submit, settle } = await edit(project('a', 'draft'));
    expect(TestBed.inject<Title>(Title).getTitle()).toBe('Titre a — Projets — Administration');
    await type('edit-title-fr', 'Nouveau titre');
    await submit();
    backend.expectOne('/api/content/admin/projects/a').flush({
      ...project('a', 'draft'),
      version: 5,
      title: { fr: 'Nouveau titre', en: 'Title a' },
    });
    await settle();
    expect(toasts()).toEqual([['success', 'Enregistré (brouillon).']]);
    expect(descriptions()).toEqual([undefined]);
    expect(root.querySelector('h1')?.textContent).toContain('Nouveau titre');
    expect(TestBed.inject<Title>(Title).getTitle()).toBe(
      'Nouveau titre — Projets — Administration',
    );
  });

  it('saves with Ctrl+S once the form has changed, and never saves the page itself', async (): Promise<void> => {
    const { backend, type } = await edit(project('a', 'draft'));
    const press: () => KeyboardEvent = (): KeyboardEvent => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
      return event;
    };
    expect(press().defaultPrevented).toBe(true);
    backend.expectNone('/api/content/admin/projects/a');
    await type('edit-title-fr', 'Titre au clavier');
    expect(press().defaultPrevented).toBe(true);
    await flush();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(call.request.method).toBe('PUT');
    expect(call.request.body.title).toEqual({ fr: 'Titre au clavier', en: 'Title a' });
  });

  it('refuses to save an empty French title or an image without alternative text, showing each field in its language in error', async (): Promise<void> => {
    const { backend, root, type, showLanguage, submit, settle } = await edit(project('a', 'draft'));
    await type('edit-title-fr', '');
    await submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('obligatoires');
    expect(shownLanguage(root, 'Titre')).toBe('Français');
    expect(root.querySelector('#edit-title-fr-error')?.textContent).toContain(
      'Le texte français est obligatoire.',
    );
    expect(root.querySelector('#edit-title-fr')?.getAttribute('aria-describedby')).toBe(
      'edit-title-fr-error',
    );
    expect(root.querySelector('#edit-title-fr')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#edit-lead-fr')?.hasAttribute('aria-invalid')).toBe(false);
    await type('edit-title-fr', 'Titre');
    expect(root.querySelector('#edit-title-fr')?.hasAttribute('aria-invalid')).toBe(false);
    const english: Editor = editorOf(root, 'en');
    english.commands.insertContentAt(english.state.doc.content.size, figure(''));
    await settle();
    await submit();
    expect(root.querySelector('form [data-slot="alert"]')?.textContent).toContain(
      'Chaque image de l’article doit avoir un texte alternatif.',
    );
    expect(root.querySelector('#edit-article-en-error')?.textContent).toContain(
      'Chaque image de l’article doit avoir un texte alternatif.',
    );
    expect(root.querySelector('#edit-article-en')?.getAttribute('aria-describedby')).toBe(
      'edit-article-en-error',
    );
    // The French article is valid: the article now shows its English editor, the French one hidden.
    expect(shownLanguage(root, 'Article')).toBe('English');
    expect(root.querySelector('#edit-article-en')?.closest('[hidden]')).toBeNull();
    expect(root.querySelector('#edit-article-fr')?.closest('[hidden]')).not.toBeNull();
    english.commands.undo();
    await settle();
    await type('edit-title-fr', '');
    await showLanguage('Titre', 'en');
    await submit();
    expect(shownLanguage(root, 'Titre')).toBe('Français');
    expect(root.querySelector('#edit-title-fr')?.getAttribute('aria-invalid')).toBe('true');
    backend.expectNone('/api/content/admin/projects/a');
  });

  it('publishes a complete draft, then toasts it', async (): Promise<void> => {
    const { backend, root, settle } = await edit(project('a', 'draft'));
    button(root, 'Publier').click();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a/publish');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    call.flush({ ...project('a', 'published'), version: 5 });
    await settle();
    expect(toasts()).toEqual([['success', 'Publié.']]);
    expect(descriptions()).toEqual(['Le site public sera mis à jour dans quelques minutes.']);
  });

  it('unpublishes from the list only once confirmed, and reloads after a conflict', async (): Promise<void> => {
    const { backend, settle, action } = await list([
      project('a', 'published'),
      project('b', 'draft'),
    ]);
    (await action(0, 'Dépublier')).click();
    await settle();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')?.textContent).toContain(
      'Dépublier « Titre a » ?',
    );
    answer('Annuler');
    await flush();
    backend.expectNone('/api/content/admin/projects/a/unpublish');
    // Back on the row's menu button rather than on the page body.
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Actions pour « Titre a »');
    (await action(0, 'Dépublier')).click();
    await settle();
    answer('Dépublier');
    await flush();
    backend
      .expectOne('/api/content/admin/projects/a/unpublish')
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await flush();
    backend.expectOne('/api/content/admin/projects').flush({ member: [], totalItems: 0 });
    await flush();
    expect(toasts()).toEqual([
      ['warning', 'Le projet a été modifié entre-temps : la liste a été rechargée, recommencez.'],
    ]);
  });
});

describe('ProjectFormComponent', (): void => {
  it('edits one language at a time per field, the shared settings in the properties panel', async (): Promise<void> => {
    const { root, showLanguage } = await edit(complete('a', 'draft'));
    const form: HTMLFormElement | null = root.querySelector('form');
    const aside: HTMLElement | null = root.querySelector('aside[aria-label="Propriétés"]');
    // Every field starts in French; only the language shown has a control.
    expect(shownLanguage(root, 'Titre')).toBe('Français');
    expect(root.querySelector('#edit-title-fr')).not.toBeNull();
    expect(root.querySelector('#edit-title-en')).toBeNull();
    expect(root.querySelector('#edit-title-fr')?.getAttribute('aria-label')).toBe(
      'Titre en français',
    );
    // Both article editors stay alive, the English one hidden.
    expect(root.querySelector('#edit-article-fr')?.closest('[hidden]')).toBeNull();
    expect(root.querySelector('#edit-article-en')?.closest('[hidden]')).not.toBeNull();
    for (const id of ['edit-site-url', 'edit-techs', 'edit-featured', 'edit-cover-alt-fr']) {
      expect(form?.querySelector(`#${id}`)).toBeNull();
      expect(aside?.querySelector(`#${id}`)).not.toBeNull();
    }
    // Outside the form element, the text inputs name it so that Enter still submits it.
    expect(root.querySelector('#edit-site-url')?.getAttribute('form')).toBe('edit-project-form');
    expect(root.querySelector('#edit-techs')?.getAttribute('form')).toBe('edit-project-form');
    expect(root.querySelector('#edit-cover-alt-fr')?.getAttribute('form')).toBe(
      'edit-project-form',
    );
    expect(form?.id).toBe('edit-project-form');
    expect(root.querySelector('#edit-title-fr')?.getAttribute('aria-required')).toBe('true');
    // Every text carries its own language (WCAG 3.1.2): the admin itself is French or English.
    expect(root.querySelector('#edit-title-fr')?.getAttribute('lang')).toBe('fr');
    expect(root.querySelector('#edit-cover-alt-fr')?.getAttribute('lang')).toBe('fr');
    expect(root.querySelector('#edit-article-fr')?.getAttribute('lang')).toBe('fr');

    await showLanguage('Titre', 'en');
    expect(shownLanguage(root, 'Titre')).toBe('English');
    expect(root.querySelector('#edit-title-fr')).toBeNull();
    const title: HTMLInputElement | null = root.querySelector<HTMLInputElement>('#edit-title-en');
    expect(title?.value).toBe('Title a');
    expect(title?.getAttribute('aria-label')).toBe('Titre en anglais');
    expect(root.querySelector('label[for="edit-title-en"]')?.textContent?.trim()).toBe('Titre');
    // A draft's English is optional; the other fields keep their own language.
    expect(title?.getAttribute('aria-required')).toBeNull();
    expect(root.querySelector('#edit-summary-fr')).not.toBeNull();
    // The English texts are marked as such too.
    for (const [label, id] of [
      ['Résumé', 'edit-summary-en'],
      ['Titre de recherche', 'edit-seo-title-en'],
      ['Description de recherche', 'edit-seo-description-en'],
      ['Texte alternatif', 'edit-cover-alt-en'],
    ] as const) {
      await showLanguage(label, 'en');
      expect(root.querySelector(`#${id}`)?.getAttribute('lang')).toBe('en');
    }
    expect(title?.getAttribute('lang')).toBe('en');
    expect(root.querySelector('#edit-article-en')?.getAttribute('lang')).toBe('en');

    expect(
      [...(form?.querySelectorAll('h2') ?? [])].map(
        (heading: HTMLHeadingElement): string => heading.firstChild?.textContent?.trim() ?? '',
      ),
    ).toEqual(['Présentation', 'Informations', 'Article', 'Référencement']);
    expect(form?.querySelector('section p')?.textContent).toContain(
      'Le sélecteur accolé à chaque champ change sa langue.',
    );
    // One type scale: 14 px section titles above 13 px field labels, in every section.
    for (const heading of form?.querySelectorAll('h2') ?? []) {
      expect(heading.classList).toContain('text-[14px]/5');
    }
    for (const label of form?.querySelectorAll('ui-field > label') ?? []) {
      expect(label.classList).toContain('text-[13px]/5');
    }
    // One divider between two sections, never under a heading.
    expect(
      [...(form?.querySelectorAll('section') ?? [])].map((section: HTMLElement): boolean =>
        section.classList.contains('border-t'),
      ),
    ).toEqual([false, true, true, true]);
    expect(form?.querySelector('legend')).toBeNull();
    expect(
      [...(form?.querySelectorAll('header, h2') ?? [])].some(
        (element: Element): boolean =>
          element.classList.contains('border-b') || element.classList.contains('border-t'),
      ),
    ).toBe(false);
    expect(root.querySelector('label[for="edit-article-en"]')).toBeNull();
    expect(root.querySelector('#edit-client-fr')?.closest('fieldset')?.className).toContain(
      '@md/form:grid-cols-2',
    );

    // A one-line control ends on its toggle; a textarea has its toggle in a strip under it.
    expect(root.querySelector('#edit-client-fr')?.classList).toContain('rounded-e-none');
    expect(root.querySelector('#edit-client-fr')?.nextElementSibling?.tagName).toBe(
      'CONTENT-LOCALE-SWITCH',
    );
    const summary: HTMLElement | null = root.querySelector('#edit-summary-en');
    expect(summary?.classList).toContain('rounded-b-none');
    expect(summary?.nextElementSibling?.className).toContain('rounded-b-md');
    expect(summary?.nextElementSibling?.querySelector('content-locale-switch')).not.toBeNull();
    expect(
      root.querySelector('#edit-seo-keywords-fr')?.closest('ui-tags-input')?.classList,
    ).toContain('rounded-e-none');
    // The article's toggle ends its editor's toolbar, « Partir du français » only for English.
    expect(form?.textContent).not.toContain('Partir du français');
    expect(localeToggle(root, 'Article').closest('[role="toolbar"]')).not.toBeNull();
    expect(
      localeToggle(root, 'Article')
        .closest('content-article-editor')
        ?.querySelector('#edit-article-fr'),
    ).not.toBeNull();
    await showLanguage('Article', 'en');
    expect(root.querySelector('#edit-article-fr')?.closest('[hidden]')).not.toBeNull();
    expect(root.querySelector('#edit-article-en')?.closest('[hidden]')).toBeNull();
    expect(form?.textContent).toContain('Partir du français');

    expect(
      [...(aside?.querySelectorAll('h3') ?? [])].map((heading: HTMLHeadingElement): string =>
        heading.textContent.trim(),
      ),
    ).toEqual(['Couverture', 'Réglages']);
    expect(aside?.textContent).toContain('Complétude');
    expect(root.querySelector('#edit-site-url')?.getAttribute('aria-describedby')).toBeNull();
    expect(root.querySelector<HTMLInputElement>('#edit-site-url')?.placeholder).toBe('https://…');
  });

  it('counts the search text characters and previews the Google result as the user types', async (): Promise<void> => {
    const { backend, root, type, showLanguage, submit } = await edit(project('movah', 'draft'));
    const preview: (slot: string) => string = (slot: string): string =>
      root.querySelector(`[data-slot="seo-preview-${slot}"]`)?.textContent?.trim() ?? '';
    const counter: (id: string) => HTMLElement | null = (id: string): HTMLElement | null =>
      root.querySelector<HTMLElement>(`#${id}-count`);
    expect(root.querySelector<HTMLInputElement>('#edit-seo-title-fr')?.placeholder).toBe(
      'Titre movah',
    );
    await showLanguage('Description de recherche', 'en');
    expect(root.querySelector<HTMLTextAreaElement>('#edit-seo-description-en')?.placeholder).toBe(
      'Summary',
    );
    // The previews follow their own toggle, French first.
    expect(shownLanguage(root, 'Aperçus')).toBe('Français');
    expect(preview('title')).toBe('Titre movah — Valentin Fortin');
    expect(preview('description')).toBe('Résumé');
    expect(preview('url')).toBe('valentin-fortin.pro › projects › movah');
    await showLanguage('Aperçus', 'en');
    expect(preview('url')).toBe('valentin-fortin.pro › en › projects › movah');
    expect(preview('title')).toBe('Title movah — Valentin Fortin');
    expect(root.querySelector('[data-slot="seo-preview-title"]')?.getAttribute('lang')).toBe('en');
    await showLanguage('Aperçus', 'fr');
    expect(counter('edit-seo-title-fr')?.textContent?.trim()).toBe('0/70');
    expect(root.querySelector('#edit-seo-title-fr')?.getAttribute('aria-describedby')).toBe(
      'edit-seo-title-fr-count',
    );

    await type('edit-seo-title-fr', '  Movah, app de covoiturage  ');
    expect(preview('title')).toBe('Movah, app de covoiturage');
    expect(counter('edit-seo-title-fr')?.textContent?.trim()).toBe('25/70');
    expect(counter('edit-seo-title-fr')?.className).toContain('text-fg-faint');
    await type('edit-seo-title-fr', 'x'.repeat(61));
    expect(counter('edit-seo-title-fr')?.className).toContain('text-warning-ink');
    expect(counter('edit-seo-title-fr')?.textContent).toContain('Risque de coupure');
    await type('edit-seo-description-fr', `${'mot '.repeat(40)}fin`);
    expect(counter('edit-seo-description-fr')?.className).toContain('text-warning-ink');
    expect(preview('description').endsWith('mot …')).toBe(true);

    await type('edit-seo-title-fr', 'x'.repeat(71));
    // Shown in English, the field in error comes back to French on the refused submission.
    await showLanguage('Titre de recherche', 'en');
    await submit();
    backend.expectNone('/api/content/admin/projects/movah');
    expect(shownLanguage(root, 'Titre de recherche')).toBe('Français');
    expect(root.querySelector('#edit-seo-title-fr-error')?.textContent).toContain(
      '70 caractères maximum.',
    );
    expect(root.querySelector('#edit-seo-title-fr')?.getAttribute('aria-describedby')).toBe(
      'edit-seo-title-fr-error edit-seo-title-fr-count',
    );
    expect(languageStates(root, 'Titre de recherche')).toEqual(['Français, à corriger', 'English']);

    await type('edit-seo-title-fr', ' Movah ');
    await type('edit-seo-description-fr', '');
    await type('edit-seo-description-en', 'Local carpooling app.');
    await submit();
    expect(backend.expectOne('/api/content/admin/projects/movah').request.body.seo).toEqual({
      title: { fr: 'Movah' },
      description: { en: 'Local carpooling app.' },
      keywords: { fr: [] },
    });
  });

  it('edits the keywords per language, prefills them from the technologies and lists the generated tags', async (): Promise<void> => {
    const { backend, root, showLanguage, submit, settle } = await edit({
      ...project('movah', 'draft'),
      techs: ['flutter', 'supabase'],
      cover: { media: MEDIA.id, alt: t('Accueil', 'Home') },
      media: [MEDIA],
      seo: {
        title: {},
        description: {},
        keywords: { fr: ['covoiturage'], en: [] },
      },
    });
    const section = (): HTMLElement => {
      const element: HTMLElement | null = root.querySelector(
        'section[aria-labelledby="edit-section-seo"]',
      );
      if (!element) throw new Error('SEO section missing');
      return element;
    };
    const tags = (lang: 'fr' | 'en'): string[] => {
      const field: HTMLElement | null | undefined = section()
        .querySelector(`#edit-seo-keywords-${lang}`)
        ?.closest('ui-tags-input');
      if (!field) throw new Error(`${lang} keywords not shown`);
      return [...field.querySelectorAll('[data-slot="tags-input-tag"]')].map(
        (tag: Element): string => tag.textContent?.trim() ?? '',
      );
    };
    const generated = async (lang: 'fr' | 'en'): Promise<Record<string, string>> => {
      await showLanguage('Aperçus', lang);
      return Object.fromEntries(
        [...section().querySelectorAll('[data-slot="seo-generated-tag"]')].map(
          (row: Element): [string, string] => [
            row.querySelector('dt')?.textContent?.trim() ?? '',
            row.querySelector('dd')?.getAttribute('title') ?? '',
          ],
        ),
      );
    };
    const fromTechs = async (lang: 'fr' | 'en'): Promise<void> => {
      await showLanguage('Mots clés', lang);
      section().querySelector<HTMLButtonElement>('[data-slot="seo-keywords-from-techs"]')?.click();
      await settle();
    };

    expect(tags('fr')).toEqual(['covoiturage']);
    expect(root.querySelector('label[for="edit-seo-keywords-fr"]')?.textContent).toContain(
      'Mots clés',
    );
    expect(root.querySelector('#edit-seo-keywords-fr-count')?.textContent?.trim()).toBe('1/10');
    // 36 px, the height of the joined toggle.
    expect(
      root.querySelector('#edit-seo-keywords-fr')?.closest('ui-tags-input')?.classList,
    ).toContain('min-h-9');
    await showLanguage('Mots clés', 'en');
    expect(root.querySelector<HTMLInputElement>('#edit-seo-keywords-en')?.placeholder).toBe(
      'flutter, supabase',
    );
    expect(
      root.querySelector('#edit-seo-keywords-en')?.closest('ui-tags-input')?.getAttribute('lang'),
    ).toBe('en');

    // Generated tags: the public page's own functions, keywords written verbatim.
    const french: Record<string, string> = await generated('fr');
    expect(french['title']).toBe('Titre movah — Valentin Fortin');
    expect(french['keywords']).toBe('covoiturage');
    expect(french['canonical']).toBe('https://valentin-fortin.pro/projects/movah');
    expect(french['hreflang x-default']).toBe('https://valentin-fortin.pro/projects/movah');
    expect(french['og:image']).toBe(`https://valentin-fortin.pro${MEDIA.src}`);
    expect(french['og:image:alt']).toBe('Accueil');
    expect(french['twitter:card']).toBe('summary_large_image');
    expect(JSON.parse(french['JSON-LD'] ?? '{}')).toMatchObject({
      '@type': 'CreativeWork',
      keywords: 'covoiturage',
    });
    expect(
      section()
        .querySelector('[data-slot="seo-generated-tags"] button')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');

    // Link card: Open Graph title and description, the cover as image.
    const card: Element | null = section().querySelector('[data-slot="social-preview"]');
    expect(card?.querySelector('figcaption')?.textContent?.trim()).toBe(
      'Aperçu sur les réseaux sociaux',
    );
    expect(card?.querySelector('[data-slot="social-preview-domain"]')?.textContent?.trim()).toBe(
      'valentin-fortin.pro',
    );
    expect(card?.querySelector('[data-slot="social-preview-title"]')?.textContent?.trim()).toBe(
      'Titre movah — Valentin Fortin',
    );
    expect(card?.querySelector('img')?.getAttribute('src')).toBe(MEDIA.src);
    // Without English keywords the English page falls back on the technologies.
    const english: Record<string, string> = await generated('en');
    expect(english['keywords']).toBe('flutter, supabase');
    expect(english['og:locale']).toBe('en_GB');
    expect(english['og:image:alt']).toBe('Home');

    await fromTechs('en');
    await fromTechs('fr');
    expect(tags('fr')).toEqual(['covoiturage', 'flutter', 'supabase']);
    expect(root.querySelector('#edit-seo-keywords-fr-count')?.textContent?.trim()).toBe('3/10');
    await showLanguage('Mots clés', 'en');
    expect(tags('en')).toEqual(['flutter', 'supabase']);

    await submit();
    expect(backend.expectOne('/api/content/admin/projects/movah').request.body.seo).toEqual({
      title: {},
      description: {},
      keywords: { fr: ['covoiturage', 'flutter', 'supabase'], en: ['flutter', 'supabase'] },
    });
  });

  it('refuses a keyword shorter than two characters', async (): Promise<void> => {
    const { backend, root, submit } = await edit({
      ...project('movah', 'draft'),
      seo: { title: {}, description: {}, keywords: { fr: ['x'], en: [] } },
    });
    await submit();
    backend.expectNone('/api/content/admin/projects/movah');
    expect(root.querySelector('#edit-seo-keywords-fr-error')?.textContent).toContain(
      'Chaque mot clé compte de 2 à 40 caractères.',
    );
  });

  it('marks each language still to complete or in error on its toggle, following the edits, and reveals a hidden error', async (): Promise<void> => {
    const { root, type, showLanguage, submit, settle } = await edit({
      ...project('a', 'draft', ['article.fr', 'title.en', 'article.en', 'cover.alt.en']),
      title: t('Titre a'),
      article: { fr: { type: 'doc', content: [{ type: 'paragraph' }] }, en: null },
      cover: { media: MEDIA.id, alt: t('Couverture') },
      media: [MEDIA],
    });
    // A draft's English is still to complete; the French article is required but untouched.
    expect(languageStates(root, 'Titre')).toEqual(['Français', 'English, à compléter']);
    expect(languageStates(root, 'Article')).toEqual([
      'Français, à compléter',
      'English, à compléter',
    ]);
    expect(languageStates(root, 'Texte alternatif')).toEqual(['Français', 'English, à compléter']);
    expect(languageStates(root, 'Résumé')).toEqual(['Français', 'English']);
    // The search texts are optional: empty, they stay quiet.
    expect(languageStates(root, 'Titre de recherche')).toEqual(['Français', 'English']);
    expect(languageStates(root, 'Mots clés')).toEqual(['Français', 'English']);
    // The toggle of the hidden English editor follows the same states.
    const toggles: HTMLElement[] = [
      ...root.querySelectorAll<HTMLElement>('[role="group"][aria-label="Langue du champ Article"]'),
    ];
    expect(toggles).toHaveLength(2);

    editorOf(root, 'fr').commands.insertContent('Texte.');
    await settle();
    expect(languageStates(root, 'Article')).toEqual(['Français', 'English, à compléter']);
    await type('edit-title-en', 'Title a');
    expect(shownLanguage(root, 'Titre')).toBe('English');
    expect(languageStates(root, 'Titre')).toEqual(['Français', 'English']);
    await type('edit-cover-alt-en', 'Cover');
    expect(languageStates(root, 'Texte alternatif')).toEqual(['Français', 'English']);
    editorOf(root, 'en').commands.insertContent('Text.');
    await settle();
    expect(languageStates(root, 'Article')).toEqual(['Français', 'English']);
    // A figure without alternative text leaves the English article to complete.
    const english: Editor = editorOf(root, 'en');
    english.commands.insertContentAt(english.state.doc.content.size, figure(''));
    await settle();
    expect(languageStates(root, 'Article')).toEqual(['Français', 'English, à compléter']);
    await type('edit-title-fr', '');
    await showLanguage('Titre', 'en');
    expect(languageStates(root, 'Titre')).toEqual(['Français, à compléter', 'English']);

    // The refused submission shows each error: the title back in French, the article in English.
    expect(shownLanguage(root, 'Article')).toBe('Français');
    await submit();
    expect(shownLanguage(root, 'Titre')).toBe('Français');
    expect(languageStates(root, 'Titre')).toEqual(['Français, à corriger', 'English']);
    expect(shownLanguage(root, 'Article')).toBe('English');
    expect(languageStates(root, 'Article')).toEqual(['Français', 'English, à corriger']);
    expect(root.querySelector('#edit-article-en')?.closest('[hidden]')).toBeNull();
    // A field whose shown language is in error stays on it.
    await showLanguage('Article', 'fr');
    expect(languageStates(root, 'Article')).toEqual(['Français', 'English, à corriger']);
  });

  it('moves the focus to the article shown when its toggle switches the editors', async (): Promise<void> => {
    const { root, showLanguage } = await edit(project('a', 'draft'));
    const pressed = (): HTMLElement | null =>
      localeToggle(root, 'Article').querySelector<HTMLElement>('[aria-pressed="true"]');
    pressed()?.focus();
    await showLanguage('Article', 'en');
    await flush();
    expect(document.activeElement).toBe(pressed());
    expect(
      document.activeElement?.closest('content-article-editor')?.querySelector('#edit-article-en'),
    ).not.toBeNull();
  });

  it('starts the English article from the French one, asking before replacing a written one', async (): Promise<void> => {
    const confirm: Mock<ConfirmDialogService['confirm']> = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const { backend, root, showLanguage, submit, settle } = await edit(
      { ...project('a', 'draft'), article: { fr: doc('Un.', 'Deux.'), en: null } },
      [{ provide: ConfirmDialogService, useValue: { confirm } }],
    );
    expect(editorOf(root, 'en').getText()).toBe('');
    expect(() => button(root, 'Partir du français')).toThrow();
    await showLanguage('Article', 'en');
    button(root, 'Partir du français').click();
    await settle();
    expect(confirm).not.toHaveBeenCalled();
    expect(editorOf(root, 'en').getText()).toBe('Un.\n\nDeux.');
    expect(root.textContent).toContain('Modifications non enregistrées');
    editorOf(root, 'en').commands.setContent(doc('One.') as unknown as JSONContent);
    await settle();
    button(root, 'Partir du français').click();
    await settle();
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Remplacer l’article anglais ?', tone: 'danger' }),
    );
    expect(editorOf(root, 'en').getText()).toBe('One.');
    button(root, 'Partir du français').click();
    await settle();
    expect(editorOf(root, 'en').getText()).toBe('Un.\n\nDeux.');
    await submit();
    expect(backend.expectOne('/api/content/admin/projects/a').request.body.article).toEqual({
      fr: doc('Un.', 'Deux.'),
      en: doc('Un.', 'Deux.'),
    });
  });
});

/**
 * Function measureGroup
 *
 * @description
 * Gives the resizable group a measured width; every other element measures 0 as in jsdom.
 *
 * @param {number} width - Group width in pixels.
 */
function measureGroup(width: number): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ): DOMRect {
    return this.getAttribute('data-slot') === 'resizable-panel-group'
      ? new DOMRect(0, 0, width, 900)
      : new DOMRect(0, 0, 0, 0);
  });
}

describe('AdminProjectEditPageComponent', (): void => {
  afterEach((): void => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('opens the properties at their stored width in pixels behind a separator', async (): Promise<void> => {
    localStorage.setItem('portfolio.admin.layout.project-editor', '400');
    measureGroup(1440);
    const { root } = await edit(project('a', 'draft'));
    const [formPanel, propertiesPanel] = [
      ...root.querySelectorAll<HTMLElement>('[uiResizablePanel]'),
    ];
    const handle: HTMLElement | null = root.querySelector('ui-resizable-handle');
    expect(Number.parseFloat(formPanel?.style.flex ?? '')).toBeCloseTo((1040 / 1440) * 100, 5);
    expect(formPanel?.querySelector('form')).not.toBeNull();
    // The document keeps scrolling the form, so its sticky toolbar and save bar still stick.
    expect(formPanel?.className).toContain('overflow-visible');
    expect(formPanel?.className).not.toContain('overflow-hidden');
    expect(propertiesPanel?.tagName).toBe('ASIDE');
    expect(propertiesPanel?.getAttribute('aria-label')).toBe('Propriétés');
    expect(Number.parseFloat(propertiesPanel?.style.flex ?? '')).toBeCloseTo((400 / 1440) * 100, 5);
    expect(handle?.getAttribute('role')).toBe('separator');
    expect(handle?.getAttribute('aria-label')).toBe('Redimensionner le panneau Propriétés');
    expect(handle?.getAttribute('aria-valuenow')).toBe('72');
    // The panel's 300 to 480 px bounds decide the reachable range of the form at 1440 px.
    expect(handle?.getAttribute('aria-valuemin')).toBe('67');
    expect(handle?.getAttribute('aria-valuemax')).toBe('79');
    expect(handle?.className).toContain('focus-visible:outline-accent/55');
  });

  it('falls back to 320 px for a percentage layout stored before or an out-of-bounds width', async (): Promise<void> => {
    localStorage.setItem('portfolio.admin.layout.project-editor', '[95,5]');
    const { root } = await edit(project('a', 'draft'));
    // Not measured (jsdom): the default lays out as a fixed basis.
    expect(root.querySelector<HTMLElement>('aside[uiResizablePanel]')?.style.flex).toBe(
      '0 0 320px',
    );
    TestBed.resetTestingModule();
    localStorage.setItem('portfolio.admin.layout.project-editor', '200');
    const again: Awaited<ReturnType<typeof edit>> = await edit(project('a', 'draft'));
    expect(again.root.querySelector<HTMLElement>('aside[uiResizablePanel]')?.style.flex).toBe(
      '0 0 320px',
    );
  });

  it('resizes the properties by 16 px steps, remembers it and resets it on double click', async (): Promise<void> => {
    measureGroup(1440);
    const { root, settle } = await edit(project('a', 'draft'));
    const handle: HTMLElement | null = root.querySelector('ui-resizable-handle');
    const event: KeyboardEvent = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    handle?.dispatchEvent(event);
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(localStorage.getItem('portfolio.admin.layout.project-editor')).toBe('336');

    handle?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle();
    expect(localStorage.getItem('portfolio.admin.layout.project-editor')).toBe('320');
  });

  it('renders no separator where the properties move to the sheet', async (): Promise<void> => {
    let listener: ((event: { matches: boolean }) => void) | null = null;
    vi.stubGlobal('matchMedia', (media: string) => ({
      media,
      matches: media === '(max-width: 1179.98px)',
      addEventListener: (_: string, callback: (event: { matches: boolean }) => void): void => {
        listener = callback;
      },
      removeEventListener: (): void => {
        listener = null;
      },
    }));
    const { harness, root, settle } = await edit(project('a', 'draft'));
    expect(root.querySelector('ui-resizable-handle')).toBeNull();
    expect(button(root, 'Propriétés').getAttribute('aria-haspopup')).toBe('dialog');

    (listener as ((event: { matches: boolean }) => void) | null)?.({ matches: false });
    await settle();
    expect(root.querySelector('ui-resizable-handle')).not.toBeNull();
    harness.fixture.destroy();
    expect(listener).toBeNull();
  });

  it('uploads a pasted image, shows its figure and saves it without its display URL', async (): Promise<void> => {
    const { backend, root, submit, settle } = await edit(project('a', 'draft'));
    const french: Editor = editorOf(root, 'fr');
    french.view.props.handlePaste?.(
      french.view,
      {
        clipboardData: { files: [new File(['png'], 'ecran.png', { type: 'image/png' })] },
        preventDefault: (): void => undefined,
      } as unknown as ClipboardEvent,
      french.state.doc.slice(0, 0),
    );
    await settle();
    const upload: TestRequest = backend.expectOne('/api/content/admin/media');
    expect(upload.request.method).toBe('POST');
    expect(upload.request.body).toBeInstanceOf(FormData);
    upload.flush(MEDIA);
    await settle();
    expect(root.querySelector('figure[data-media] img')?.getAttribute('src')).toBe(MEDIA.src);
    const end: number = french.state.doc.content.size - 1;
    french.chain().setNodeSelection(end).updateAttributes('figure', { alt: 'Écran' }).run();
    await settle();
    await submit();
    const save: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(save.request.body.article.fr.content.at(-1)).toEqual({
      type: 'figure',
      attrs: { media: MEDIA.id, alt: 'Écran', caption: '' },
    });
  });

  it('toasts the reason of a refused upload', async (): Promise<void> => {
    const { backend, root, settle } = await edit(project('a', 'draft'));
    const french: Editor = editorOf(root, 'fr');
    french.view.props.handlePaste?.(
      french.view,
      {
        clipboardData: { files: [new File(['png'], 'ecran.png', { type: 'image/png' })] },
        preventDefault: (): void => undefined,
      } as unknown as ClipboardEvent,
      french.state.doc.slice(0, 0),
    );
    await settle();
    backend
      .expectOne('/api/content/admin/media')
      .flush({ code: 'content.media-too-large' }, { status: 413, statusText: 'Payload Too Large' });
    await settle();
    const [toast] = TestBed.inject<ToastService>(ToastService).toasts();
    expect([toast?.type, toast?.message, toast?.description]).toEqual([
      'error',
      'L’image n’a pas été envoyée.',
      'L’image dépasse 10 Mo.',
    ]);
  });

  it('uploads, describes and removes the cover in the settings', async (): Promise<void> => {
    const { backend, root, type, showLanguage, submit, settle } = await edit(project('a', 'draft'));
    expect(root.querySelector('#edit-cover-alt-fr')).toBeNull();
    const picker: HTMLInputElement | null =
      root.querySelector<HTMLInputElement>('#edit-cover-file');
    if (!picker) throw new Error('cover picker missing');
    Object.defineProperty(picker, 'files', {
      value: [new File(['png'], 'couverture.png', { type: 'image/png' })],
      configurable: true,
    });
    picker.dispatchEvent(new Event('change'));
    await settle();
    backend.expectOne('/api/content/admin/media').flush(MEDIA);
    await settle();
    expect(
      root.querySelector('[aria-labelledby="edit-cover-label"] img')?.getAttribute('src'),
    ).toBe(MEDIA.src);
    // One field named in full, its language from the toggle joined to it.
    expect(root.querySelector('label[for="edit-cover-alt-fr"]')?.textContent?.trim()).toBe(
      'Texte alternatif',
    );
    expect(root.querySelector('#edit-cover-alt-fr')?.getAttribute('aria-label')).toBe(
      'Texte alternatif en français',
    );
    expect(root.querySelector('#edit-cover-alt-fr')?.nextElementSibling?.tagName).toBe(
      'CONTENT-LOCALE-SWITCH',
    );
    expect(root.querySelector('#edit-cover-alt-en')).toBeNull();
    expect(languageStates(root, 'Texte alternatif')).toEqual([
      'Français, à compléter',
      'English, à compléter',
    ]);
    await showLanguage('Texte alternatif', 'en');
    expect(root.querySelector('#edit-cover-alt-en')?.getAttribute('aria-label')).toBe(
      'Texte alternatif en anglais',
    );
    expect(root.querySelector('label[for="edit-cover-alt-en"]')?.textContent?.trim()).toBe(
      'Texte alternatif',
    );
    await type('edit-cover-alt-fr', 'Couverture');
    expect(shownLanguage(root, 'Texte alternatif')).toBe('Français');
    await submit();
    const save: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(save.request.body.cover).toEqual({ media: MEDIA.id, alt: { fr: 'Couverture' } });
    save.flush({
      ...project('a', 'draft'),
      version: 5,
      cover: { media: MEDIA.id, alt: t('Couverture') },
      media: [MEDIA],
    });
    await settle();
    expect(root.querySelector('aside img')?.getAttribute('src')).toBe(MEDIA.src);
    button(root, 'Retirer').click();
    await settle();
    expect(root.querySelector('#edit-cover-alt-fr')).toBeNull();
    await submit();
    expect(backend.expectOne('/api/content/admin/projects/a').request.body.cover).toBeNull();
  });

  it('lists the missing fields of the properties with readable names', async (): Promise<void> => {
    const { root } = await edit({
      ...project('b', 'draft', ['title.en', 'article.en', 'article.fr.figures', 'cover.alt.en']),
      cover: { media: MEDIA.id, alt: t('Couverture') },
    });
    const aside: string = root.querySelector('aside')?.textContent ?? '';
    expect(aside).toContain('4 à compléter');
    expect(aside).toContain('Titre (anglais)');
    expect(aside).toContain('Article (anglais)');
    expect(aside).toContain('Textes alternatifs des images (français)');
    expect(aside).toContain('Texte alternatif de la couverture (anglais)');
    expect(aside).toContain('Image indisponible');
  });

  it('words the properties like the list and keeps one label column for every row', async (): Promise<void> => {
    const { root, settle } = await edit({
      ...project('a', 'draft'),
      techs: ['angular', 'typescript', 'nestjs', 'postgresql', 'docker'],
    });
    const aside: HTMLElement | null = root.querySelector('aside[aria-label="Propriétés"]');
    // The status and version live in the panel only: the page header carries no meta line.
    expect(root.querySelector('[data-slot="page-header-meta"]')).toBeNull();
    expect(aside?.querySelector('dd [data-slot="badge"]')?.textContent?.trim()).toBe('Brouillon');
    // In the panel's definition list the status reads as plain text after its dot.
    expect(aside?.querySelector('dd [data-slot="badge"]')?.getAttribute('data-appearance')).toBe(
      'ghost',
    );
    expect(aside?.textContent?.replace(/\s+/g, '')).toContain('Version4');
    expect(aside?.textContent).toContain('Complet');
    expect(aside?.textContent).not.toContain('Complètes');
    // One 88 px label column for the properties and the settings alike, whatever the panel width.
    const rows: HTMLElement[] = [...(aside?.querySelectorAll<HTMLElement>('.grid') ?? [])];
    expect(rows.length).toBeGreaterThanOrEqual(7);
    for (const row of rows) {
      expect(row.className).toBe('grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3');
    }
    expect(root.querySelector('#edit-site-url')?.classList).toContain('rounded-sm');
    // The technologies are tags inside the field itself, in the same 32 px box.
    const box: HTMLElement | null =
      root.querySelector('#edit-techs')?.closest('ui-tags-input') ?? null;
    expect(box?.classList).toContain('rounded-sm');
    expect(box?.classList).toContain('min-h-8');
    expect(aside?.querySelector('[data-slot="tech-keys"]')).toBeNull();
    expect(box?.querySelector('[role="list"]')?.getAttribute('aria-label')).toBe('Technos');
    const keys = (): string[] =>
      [...(box?.querySelectorAll('[data-slot="tags-input-tag"]') ?? [])].map(
        (chip: Element): string => chip.textContent?.trim() ?? '',
      );
    expect(keys()).toEqual(['angular', 'typescript', 'nestjs', 'postgresql', 'docker']);
    expect(box?.querySelector('[data-slot="tags-input-tag"]')?.classList).toContain('font-mono');
    expect(box?.querySelector('[data-slot="tags-input-remove"]')?.getAttribute('aria-label')).toBe(
      'Retirer angular',
    );
    const techs: HTMLInputElement | null = root.querySelector<HTMLInputElement>('#edit-techs');
    if (!techs) throw new Error('techs missing');
    // Lowercased, the duplicate and the empty segment refused.
    techs.value = 'Angular, , RxJS,';
    techs.dispatchEvent(new Event('input'));
    await settle();
    expect(keys()).toEqual(['angular', 'typescript', 'nestjs', 'postgresql', 'docker', 'rxjs']);
    expect(techs.value).toBe('');
    expect(
      root.querySelector('[role="group"][aria-labelledby="edit-featured-label"]'),
    ).not.toBeNull();
    const cover: HTMLElement | null = root.querySelector('[data-slot="cover-placeholder"]');
    expect(cover?.querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Aucune couverture',
    );
    // The only content of its 16:9 frame: the panel layout.
    expect(cover?.querySelector<HTMLElement>('[data-slot="empty"]')?.dataset['layout']).toBe(
      'panel',
    );
    expect(cover?.classList).toContain('border-dashed');
    expect(cover?.classList).toContain('rounded-xl');
    expect(cover?.querySelector('ng-icon')).not.toBeNull();
  });

  it('keeps a published project with an English article', async (): Promise<void> => {
    const { backend, root, submit, settle } = await edit(complete('a', 'published'));
    editorOf(root, 'en').commands.clearContent(true);
    await settle();
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    expect(shownLanguage(root, 'Article')).toBe('English');
    expect(root.querySelector('#edit-article-en')?.closest('[hidden]')).toBeNull();
    expect(root.querySelector('#edit-article-en-error')?.textContent).toContain(
      'Obligatoire tant que le projet est publié.',
    );
    // Required in both languages once published: the heading keeps its marker in English.
    expect(root.querySelector('#edit-section-article')?.textContent).toContain('*');
  });

  it('edits the period in the settings, saves it and keeps its refused bound on the picker', async (): Promise<void> => {
    const { backend, root, type, submit, settle } = await edit({
      ...project('a', 'draft'),
      period: { start: { year: 2023, month: 3 }, end: { year: 2023, month: 4 } },
    });
    const aside: HTMLElement | null = root.querySelector('aside[aria-label="Propriétés"]');
    const trigger: HTMLButtonElement | null =
      aside?.querySelector<HTMLButtonElement>('#edit-period') ?? null;
    // Required, first of the settings, and no longer a text of the form.
    expect(aside?.querySelector('#edit-period-label')?.textContent?.replace(/\s+/g, '')).toBe(
      'Période*',
    );
    expect(trigger?.getAttribute('aria-labelledby')).toBe('edit-period-label edit-period');
    // In the application locale (the tests run in Angular's default `en-US`), thin spaces aside.
    expect(trigger?.textContent?.replace(/\s+/g, ' ').trim()).toBe('March – April 2023');
    expect(trigger?.getAttribute('aria-describedby')).toBe('edit-period-hint');
    expect(root.querySelector('form #edit-period')).toBeNull();
    expect(root.querySelector('[id^="edit-periodLabel"]')).toBeNull();

    await type('edit-title-fr', 'Titre revu');
    await submit();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(call.request.body.period).toEqual({
      start: { year: 2023, month: 3 },
      end: { year: 2023, month: 4 },
    });
    expect(call.request.body).not.toHaveProperty('periodLabel');
    call.flush(
      {
        detail: 'Révision refusée',
        errors: [{ field: 'period.end', message: 'La fin précède le début.' }],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await settle();
    expect(root.querySelector('#edit-period-error')?.textContent).toContain(
      'La fin précède le début.',
    );
    expect(trigger?.getAttribute('aria-describedby')).toBe('edit-period-error');
  });

  it('saves the home-page feature from the catalogue checkbox', async (): Promise<void> => {
    const { backend, root, submit } = await edit(project('a', 'draft'));
    const featured: HTMLInputElement | null =
      root.querySelector<HTMLInputElement>('#edit-featured');
    if (!featured) throw new Error('featured checkbox missing');
    featured.click();
    await submit();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(call.request.method).toBe('PUT');
    expect(call.request.body.featured).toBe(true);
  });

  it('discards unsaved changes once confirmed, then reloads the project and focuses the save status', async (): Promise<void> => {
    const { backend, root, type, settle } = await edit(project('a', 'draft'));
    await type('edit-title-fr', 'Brouillon jeté');
    expect(root.textContent).toContain('Modifications non enregistrées');
    // Visible « Abandonner », named in full: not to be mistaken for a dialog's or the editor's « Annuler ».
    const discard: HTMLButtonElement = button(root, 'Abandonner');
    expect(discard.getAttribute('aria-label')).toBe('Abandonner les modifications');
    discard.click();
    await settle();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')?.textContent).toContain(
      'Abandonner les modifications ?',
    );
    answer('Continuer la modification');
    await settle();
    backend.expectNone('/api/content/admin/projects/a');
    expect(root.querySelector<HTMLInputElement>('#edit-title-fr')?.value).toBe('Brouillon jeté');
    discard.click();
    await settle();
    answer('Abandonner');
    await settle();
    expect(root.querySelector<HTMLInputElement>('#edit-title-fr')?.value).toBe('Titre a');
    backend.expectOne('/api/content/admin/projects/a').flush(project('a', 'draft'));
    await settle();
    expect(root.querySelector<HTMLInputElement>('#edit-title-fr')?.value).toBe('Titre a');
    expect(root.textContent).toContain('Tout est enregistré');
    expect(discard.disabled).toBe(true);
    // The disabled button cannot keep the focus: the status that now says so takes it.
    expect(document.activeElement?.getAttribute('data-slot')).toBe('save-status');
  });

  it('names the platform modifier on the save button and hides its cap on a phone', async (): Promise<void> => {
    const { root } = await edit(project('a', 'draft'));
    const cap: HTMLElement | null = root.querySelector('button[type="submit"] kbd');
    expect(cap?.textContent?.trim()).toBe('Ctrl S');
    expect(cap?.classList).toContain('max-sm:hidden');
    expect(root.querySelector('[data-slot="save-status"] .max-sm\\:sr-only')?.textContent).toBe(
      'Tout est enregistré',
    );
  });

  it('says the project cannot be found when it does not load', async (): Promise<void> => {
    const { backend, harness, navigation } = await open('/admin/projects/ghost');
    await navigation;
    await flush();
    backend
      .expectOne('/api/content/admin/projects/ghost')
      .flush({ code: 'content.not-found' }, { status: 404, statusText: 'Not Found' });
    await flush();
    await harness.fixture.whenStable();
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    expect(
      root.querySelector('[role="alert"] [data-slot="alert-title"]')?.textContent?.trim(),
    ).toBe('Projet introuvable');
    expect(
      root.querySelector('[role="alert"] a[href="/admin/projects"]')?.textContent?.trim(),
    ).toBe('Tous les projets');
    expect(root.querySelector('form')).toBeNull();
    expect(TestBed.inject<Title>(Title).getTitle()).toBe(
      'Projet introuvable — Projets — Administration',
    );
  });

  it('keeps the header and first fields in place while loading, and offers to retry a failed load', async (): Promise<void> => {
    const { backend, harness, navigation } = await open('/admin/projects/a');
    await navigation;
    await flush();
    await harness.fixture.whenStable();
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Chargement du projet…',
    );
    const skeleton: HTMLElement | null = root.querySelector('ui-page-header');
    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton?.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    // No language tabs any more: each field switches its own language.
    expect(skeleton?.querySelector('[data-slot="page-header-tabs"]')).toBeNull();
    expect(root.querySelectorAll('[data-slot="skeleton"].h-9')).toHaveLength(2);
    backend
      .expectOne('/api/content/admin/projects/a')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await flush();
    await harness.fixture.whenStable();
    expect(
      root.querySelector('[role="alert"] [data-slot="alert-title"]')?.textContent?.trim(),
    ).toBe('Impossible de charger le projet');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Le service ne répond pas. Réessayez dans un moment.',
    );
    button(root, 'Réessayer').click();
    await flush();
    backend.expectOne('/api/content/admin/projects/a').flush(project('a', 'draft'));
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Titre a');
    expect(TestBed.inject<Title>(Title).getTitle()).toBe('Titre a — Projets — Administration');
  });

  it('announces the public rebuild after saving a published project', async (): Promise<void> => {
    const { backend, type, submit, settle } = await edit(complete('a', 'published'));
    await type('edit-title-fr', 'Titre revu');
    await submit();
    backend.expectOne('/api/content/admin/projects/a').flush({
      ...complete('a', 'published'),
      version: 5,
      title: { fr: 'Titre revu', en: 'Title a' },
    });
    await settle();
    expect(toasts()).toEqual([['success', 'Enregistré.']]);
    expect(descriptions()).toEqual(['Le site public sera mis à jour dans quelques minutes.']);
  });

  it('keeps a published project complete before sending, showing the language in error', async (): Promise<void> => {
    const { backend, root, type, showLanguage, submit } = await edit(complete('a', 'published'));
    await showLanguage('Titre', 'en');
    expect(root.querySelector('#edit-title-en')?.getAttribute('aria-required')).toBe('true');
    expect(root.querySelector('label[for="edit-title-en"]')?.textContent).toContain('*');
    await type('edit-title-en', '');
    expect(languageStates(root, 'Titre')).toEqual(['Français', 'English, à compléter']);
    await showLanguage('Titre', 'fr');
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    expect(shownLanguage(root, 'Titre')).toBe('English');
    expect(languageStates(root, 'Titre')).toEqual(['Français', 'English, à corriger']);
    expect(root.querySelector('#edit-title-en-error')?.textContent).toContain(
      'Obligatoire tant que le projet est publié.',
    );
    expect(root.querySelector('form [data-slot="alert"]')?.textContent).toContain(
      'Un projet publié doit rester complet en français et en anglais',
    );
    expect(toasts()).toEqual([]);
  });

  it('lets a draft leave its English text empty', async (): Promise<void> => {
    const { backend, type, submit } = await edit(complete('a', 'draft'));
    await type('edit-title-en', '');
    await submit();
    expect(backend.expectOne('/api/content/admin/projects/a').request.body.title).toEqual({
      fr: 'Titre a',
    });
  });

  it('explains an incomplete published project refused by the API', async (): Promise<void> => {
    const { backend, type, submit, settle } = await edit(complete('a', 'published'));
    await type('edit-title-fr', 'Titre revu');
    await submit();
    backend
      .expectOne('/api/content/admin/projects/a')
      .flush(
        { code: 'content.project-incomplete', details: ['title.en'] },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await settle();
    expect(toasts()).toEqual([['error', 'Un projet publié doit rester complet.']]);
  });

  it('toasts a refused save while its field errors stay on their fields', async (): Promise<void> => {
    const { backend, root, type, submit, settle } = await edit(project('a', 'draft'));
    await type('edit-title-fr', 'Titre pris');
    await submit();
    backend.expectOne('/api/content/admin/projects/a').flush(
      {
        detail: 'Révision refusée',
        errors: [{ field: 'title.fr', message: 'Titre déjà utilisé.' }],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await settle();
    expect(toasts().map(([type]: [string, string]): string => type)).toEqual(['error']);
    expect(root.querySelector('#edit-title-fr-error')?.textContent).toContain(
      'Titre déjà utilisé.',
    );
  });

  it('unpublishes a published project, then toasts its removal', async (): Promise<void> => {
    const { backend, root, settle } = await edit(project('a', 'published'), [FRENCH_BUILD]);
    expect(root.querySelector('ui-page-header a[href="/projects/a"]')?.textContent).toContain(
      'Voir la page',
    );
    expect(root.querySelector('aside dd.font-mono')?.textContent?.trim()).toBe('/projects/a');
    button(root, 'Dépublier').click();
    await settle();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')?.textContent).toContain(
      'Dépublier « Titre a » ?',
    );
    answer('Dépublier');
    await flush();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a/unpublish');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    call.flush({ ...project('a', 'draft'), version: 5 });
    await settle();
    expect(toasts()).toEqual([['success', 'Retiré du site public.']]);
    expect(descriptions()).toEqual(['Le site public sera mis à jour dans quelques minutes.']);
    expect(button(root, 'Publier')).toBeTruthy();
  });

  it('links the English build to the English public page and names it as the address', async (): Promise<void> => {
    const { root } = await edit(project('a', 'published'), [
      { provide: LOCALE_ID, useValue: 'en' },
    ]);
    expect(root.querySelector('ui-page-header a[target="_blank"]')?.getAttribute('href')).toBe(
      '/en/projects/a',
    );
    expect(root.querySelector('aside dd.font-mono')?.textContent?.trim()).toBe('/en/projects/a');
  });

  it('keeps the project published when the unpublication is declined', async (): Promise<void> => {
    const { backend, root, settle } = await edit(project('a', 'published'), [
      {
        provide: ConfirmDialogService,
        useValue: { confirm: (): Promise<boolean> => Promise.resolve(false) },
      },
    ]);
    button(root, 'Dépublier').click();
    await settle();
    backend.expectNone('/api/content/admin/projects/a/unpublish');
    expect(toasts()).toEqual([]);
  });

  it('keeps the project as it was and toasts the error when publishing fails', async (): Promise<void> => {
    const { backend, root, settle } = await edit(project('a', 'draft'));
    button(root, 'Publier').click();
    backend
      .expectOne('/api/content/admin/projects/a/publish')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await settle();
    expect(toasts()).toEqual([['error', 'Le service ne répond pas. Réessayez dans un moment.']]);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(
      root
        .querySelector('aside[aria-label="Propriétés"] dd [data-slot="badge"]')
        ?.textContent?.trim(),
    ).toBe('Brouillon');
  });

  it('keeps the navigation bar to the breadcrumb and gives the page header the title and actions, without language tabs', async (): Promise<void> => {
    const { root } = await edit(project('a', 'published'));
    const bar: HTMLElement | null = root.querySelector('header');
    expect(bar?.querySelector('a[href]')?.textContent?.trim()).toBe('Tous les projets');
    // The bar starts with the layout's sidebar toggle, which renders nothing outside the layout.
    expect(bar?.firstElementChild?.tagName).toBe('UI-SIDEBAR-TRIGGER');
    expect(bar?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Titre a');
    expect(bar?.querySelector('button, [data-slot="button"]')).toBeNull();
    const header: HTMLElement | null = root.querySelector('ui-page-header');
    expect(header?.querySelector('h1')?.textContent?.trim()).toBe('Titre a');
    expect(header?.querySelector('[data-slot="page-header-meta"]')).toBeNull();
    const actions: string[] = [
      ...(header?.querySelectorAll('[data-slot="page-header-actions"] :is(a, button)') ?? []),
    ].map((action: Element): string => action.textContent?.trim() ?? '');
    expect(actions).toEqual(['Propriétés', 'Voir la page', 'Dépublier']);
    // Each field switches its own language: no page-level tab set, no global language switch.
    expect(header?.querySelector('[data-slot="page-header-tabs"]')).toBeNull();
    expect(root.querySelector('[role="tablist"], [role="tab"], [role="tabpanel"]')).toBeNull();
    expect(header?.querySelector('[role="group"][aria-label^="Langue du champ"]')).toBeNull();
    expect(root.querySelector('form')?.closest('[uiTabs]')).toBeNull();
  });

  it('opens the properties in a right sheet from the page header', async (): Promise<void> => {
    const { root, settle } = await edit({ ...project('a', 'published'), featured: true });
    expect(root.querySelector('aside[aria-label="Propriétés"]')?.textContent).toContain(
      '/projects/a',
    );
    const trigger: HTMLButtonElement = button(root, 'Propriétés');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    trigger.click();
    await settle();
    const sheet: HTMLElement | null = document.querySelector<HTMLElement>(
      '[data-slot="sheet-content"]',
    );
    expect(sheet?.querySelector('[data-slot="sheet-title"]')?.textContent?.trim()).toBe(
      'Propriétés',
    );
    // The title takes the focus first, ahead of the cover button.
    expect(document.activeElement).toBe(sheet?.querySelector('[data-slot="sheet-title"]'));
    // The template's bound classes reach the panel: a narrow, 20 px padded sheet.
    expect(sheet?.classList).toContain('max-w-80');
    expect(sheet?.classList).toContain('p-5');
    expect(sheet?.querySelector('[data-variant="success"]')?.textContent?.trim()).toBe('Publié');
    // The empty cover stays visible on the raised sheet: a dashed, sunk box.
    expect(sheet?.querySelector('[data-slot="cover-placeholder"]')?.className).toContain(
      'bg-surface-sunk',
    );
    expect(sheet?.textContent).toContain('/projects/a');
    // The shared settings travel with the properties, still bound to the form.
    expect(sheet?.querySelector<HTMLInputElement>('[id="edit-featured"]')?.checked).toBe(true);
    expect(sheet?.querySelector('[id="edit-site-url"]')).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    sheet?.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')?.click();
    await settle();
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('AdminProjectsPageComponent', (): void => {
  it('names the section in the navigation bar and titles the page with its count', async (): Promise<void> => {
    const { root } = await list([project('a', 'draft'), project('b', 'published')]);
    expect(root.querySelector('header')?.textContent?.trim()).toBe('Projets');
    expect(root.querySelector('header h1')).toBeNull();
    // The bar starts with the layout's sidebar toggle, which renders nothing outside the layout.
    expect(root.querySelector('header')?.firstElementChild?.tagName).toBe('UI-SIDEBAR-TRIGGER');
    const title: HTMLElement | null = root.querySelector('ui-page-header h1');
    expect(title?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Projets 2 projets');
    // No rebuild note under the title: the header carries the title and its count only.
    expect(root.querySelector('[data-slot="page-header-meta"]')).toBeNull();
  });

  it('counts the projects kept by the search and the facets as "N sur M", in the singular below two', async (): Promise<void> => {
    const { root, settle } = await list(
      [project('a', 'draft'), project('b', 'published'), project('c', 'published')],
      [],
      '/admin/projects?statut=publie',
    );
    expect(projectCount(root)).toBe('2 sur 3 projets');
    const field: HTMLInputElement | null =
      root.querySelector<HTMLInputElement>('input[type="search"]');
    if (!field) throw new Error('search missing');
    field.value = 'zzz';
    field.dispatchEvent(new Event('input'));
    await settle();
    expect(projectCount(root)).toBe('0 sur 3 projets');
    expect(root.querySelector('[data-slot="project-count"] .sr-only')?.textContent?.trim()).toBe(
      'projets',
    );
  });

  it('publishes a complete draft from the row menu without reloading the list', async (): Promise<void> => {
    const { backend, root, settle, action } = await list([project('b', 'draft')]);
    expect(projectCount(root)).toBe('1 projet');
    (await action(0, 'Publier')).click();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/b/publish');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    call.flush({ ...project('b', 'published'), version: 5 });
    await settle();
    backend.expectNone('/api/content/admin/projects');
    expect(root.querySelector('tbody tr')?.textContent).toContain('Publié');
    expect(toasts()).toEqual([['success', '« Titre b » publié.']]);
    expect(descriptions()).toEqual(['Le site public sera mis à jour dans quelques minutes.']);
    expect(await action(0, 'Dépublier')).toBeTruthy();
  });

  it('offers editing, the public page and the publication change in each row menu', async (): Promise<void> => {
    const { root, settle, action } = await list(
      [project('a', 'published'), project('b', 'draft')],
      [FRENCH_BUILD],
    );
    expect(root.querySelector('tbody tr a[href="/admin/projects/a"]')?.textContent?.trim()).toBe(
      'Titre a',
    );
    await action(0, 'Modifier');
    expect(menuItems().map((item: HTMLElement): string => item.textContent?.trim() ?? '')).toEqual([
      'Modifier',
      'Voir la page',
      'Dépublier',
    ]);
    expect(menuItems()[0]?.getAttribute('href')).toBe('/admin/projects/a');
    expect(menuItems()[1]?.getAttribute('href')).toBe('/projects/a');
    expect(menuItems()[1]?.getAttribute('target')).toBe('_blank');
    root.querySelectorAll('tbody tr')[0]?.querySelector<HTMLButtonElement>('button')?.click();
    await settle();
    await action(1, 'Modifier');
    expect(menuItems().map((item: HTMLElement): string => item.textContent?.trim() ?? '')).toEqual([
      'Modifier',
      'Publier',
    ]);
  });

  it('opens the English public page from the row menu of the English build', async (): Promise<void> => {
    const { action } = await list(
      [project('a', 'published')],
      [{ provide: LOCALE_ID, useValue: 'en' }],
    );
    // No translations are loaded here: the build locale only changes the public page opened.
    expect((await action(0, 'Voir la page')).getAttribute('href')).toBe('/en/projects/a');
  });

  it('names the icon-only row menu button and explains it in a tooltip', async (): Promise<void> => {
    const { root, settle } = await list([project('a', 'published')]);
    const trigger: HTMLButtonElement | null = root.querySelector<HTMLButtonElement>(
      'tbody tr button[aria-label="Actions pour « Titre a »"]',
    );
    expect(trigger?.getAttribute('data-slot')).toBe('tooltip-trigger');
    trigger?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    expect(document.querySelector('[role="tooltip"]')?.textContent?.trim()).toBe('Actions');
  });

  it('reloads the list and warns when publishing hits a newer version', async (): Promise<void> => {
    const { backend, root, settle, action } = await list([project('b', 'draft')]);
    (await action(0, 'Publier')).click();
    backend
      .expectOne('/api/content/admin/projects/b/publish')
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await settle();
    backend.expectOne('/api/content/admin/projects').flush({
      member: [{ ...project('b', 'published'), version: 6 }],
      totalItems: 1,
    });
    await settle();
    expect(toasts()).toEqual([
      ['warning', 'Le projet a été modifié entre-temps : la liste a été rechargée, recommencez.'],
    ]);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('tbody tr')?.textContent).toContain('Publié');
  });

  it('toasts the error without reloading when publishing fails otherwise', async (): Promise<void> => {
    const { backend, settle, action } = await list([project('b', 'draft')]);
    (await action(0, 'Publier')).click();
    backend
      .expectOne('/api/content/admin/projects/b/publish')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    await settle();
    backend.expectNone('/api/content/admin/projects');
    expect(toasts()).toEqual([['error', 'Le service ne répond pas. Réessayez dans un moment.']]);
  });

  it('toasts the error when the list does not load', async (): Promise<void> => {
    const { backend, harness, navigation } = await open('/admin/projects');
    await navigation;
    backend
      .expectOne('/api/content/admin/projects')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await flush();
    await harness.fixture.whenStable();
    expect(toasts()).toEqual([['error', 'Le service ne répond pas. Réessayez dans un moment.']]);
  });

  it('unpublishes once confirmed, without reloading the list', async (): Promise<void> => {
    const { backend, root, settle, action } = await list([project('a', 'published')]);
    (await action(0, 'Dépublier')).click();
    await settle();
    answer('Dépublier');
    await flush();
    backend
      .expectOne('/api/content/admin/projects/a/unpublish')
      .flush({ ...project('a', 'draft'), version: 5 });
    await settle();
    backend.expectNone('/api/content/admin/projects');
    expect(root.querySelector('tbody tr')?.textContent).toContain('Brouillon');
    expect(toasts()).toEqual([['success', '« Titre a » retiré du site public.']]);
    expect(descriptions()).toEqual(['Le site public sera mis à jour dans quelques minutes.']);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Actions pour « Titre a »');
  });

  it('asks a danger-toned confirmation naming the project, and keeps it published when declined', async (): Promise<void> => {
    const asked: ConfirmDialogOptions[] = [];
    const confirmations: Pick<ConfirmDialogService, 'confirm'> = {
      confirm: (options: ConfirmDialogOptions): Promise<boolean> => {
        asked.push(options);
        return Promise.resolve(false);
      },
    };
    const { backend, root, settle, action } = await list(
      [project('a', 'published')],
      [{ provide: ConfirmDialogService, useValue: confirmations }],
    );
    (await action(0, 'Dépublier')).click();
    await settle();
    expect(asked).toEqual([
      expect.objectContaining({
        title: 'Dépublier « Titre a » ?',
        confirmLabel: 'Dépublier',
        tone: 'danger',
      }),
    ]);
    backend.expectNone('/api/content/admin/projects/a/unpublish');
    expect(root.querySelector('tbody tr')?.textContent).toContain('Publié');
    // The menu item that opened the dialog is gone: the row's menu button takes the focus back.
    expect(asked[0]?.restoreFocus?.getAttribute('aria-label')).toBe('Actions pour « Titre a »');
  });

  it('marks featured and incomplete projects with their status badges', async (): Promise<void> => {
    const { root } = await list([
      { ...project('a', 'published'), featured: true },
      project('b', 'draft', ['title.en', 'lead.en']),
    ]);
    const [published, draft] = [...root.querySelectorAll('tbody tr')];
    const badges: (row: Element | undefined) => (string | null)[][] = (
      row: Element | undefined,
    ): (string | null)[][] =>
      [...(row?.querySelectorAll('[data-variant]') ?? [])].map(
        (badge: Element): (string | null)[] => [
          badge.getAttribute('data-variant'),
          badge.textContent?.trim().replace(/\s+/g, ' ') ?? null,
        ],
      );
    // The slug has its own column, in a filled badge in the slugs' mono face.
    const slug: HTMLElement | null | undefined = published?.querySelector<HTMLElement>(
      'td[data-column="slug"] [data-slot="badge"]',
    );
    expect(slug?.textContent?.trim()).toBe('/a');
    expect(slug?.classList).toContain('bg-surface-raised');
    expect(slug?.classList).toContain('font-mono');
    expect(badges(published)).toEqual([
      ['outline', '/a'],
      ['success', 'Publié'],
      ['success', 'Complet'],
      ['outline', 'angular'],
    ]);
    // Under the "Mis en avant" header, a star and « Oui »; a project not featured shows the dash.
    const featured: Element | null | undefined = published?.querySelector(
      '[data-slot="project-featured"]',
    );
    expect(featured?.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(featured?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Oui, mis en avant');
    expect(draft?.querySelector('[data-slot="project-featured"]')).toBeNull();
    expect(
      draft?.querySelector('td[data-column="accueil"] [data-slot="data-table-empty-cell"]'),
    ).not.toBeNull();
    expect(badges(draft)).toEqual([
      ['outline', '/b'],
      ['outline', 'Brouillon'],
      ['warning', '2 à compléter'],
      ['outline', 'angular'],
    ]);
    expect(published?.textContent).toContain('v4');
    const incomplete: HTMLElement | null | undefined = draft?.querySelector<HTMLElement>(
      '[data-variant="warning"]',
    );
    incomplete?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await new Promise((resolve: (value: unknown) => void): unknown => setTimeout(resolve, 600));
    expect(document.querySelector('[role="tooltip"]')?.textContent?.trim()).toBe(
      'Titre (anglais), Chapô (anglais)',
    );
  });

  it('orders the rows like the public site, sorts by a column and shows the technologies', async (): Promise<void> => {
    const { root, settle } = await list([
      { ...project('c', 'draft'), position: 2, version: 9 },
      { ...project('b', 'draft'), position: 1, techs: ['angular', 'nestjs', 'postgres', 'docker'] },
      { ...project('a', 'published'), position: 1 },
    ]);
    const titles = (): string[] =>
      [...root.querySelectorAll('tbody tr a')].map((a: Element): string => a.textContent ?? '');
    expect(titles()).toEqual(['Titre a', 'Titre b', 'Titre c']);
    expect(root.querySelectorAll('tbody tr')[1]?.textContent).toContain('+1');
    const version: HTMLButtonElement | undefined = [...root.querySelectorAll('th button')].find(
      (b: Element): b is HTMLButtonElement => b.textContent?.trim() === 'Version',
    );
    version?.click();
    await settle();
    version?.click();
    await settle();
    expect(titles()[0]).toBe('Titre c');
    expect(version?.closest('th')?.getAttribute('aria-sort')).toBe('descending');
    expect(TestBed.inject(Router).url).toBe('/admin/projects?tri=version&ordre=desc');
  });

  it('filters by status from a facet, keeps it in the URL and removes it from its chip', async (): Promise<void> => {
    const { root, settle } = await list([project('a', 'published'), project('b', 'draft')]);
    const facet: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find(
      (b: HTMLButtonElement): boolean => b.textContent?.trim() === 'Statut',
    );
    facet?.click();
    await settle();
    const options: HTMLLabelElement[] = [
      ...document.querySelectorAll<HTMLLabelElement>('[data-slot="popover-content"] label'),
    ];
    expect(options.map((label: HTMLLabelElement): string => label.textContent ?? '')).toEqual([
      expect.stringContaining('Publié'),
      expect.stringContaining('Brouillon'),
    ]);
    options[1]?.click();
    await settle();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.querySelector('tbody tr')?.textContent).toContain('Titre b');
    expect(TestBed.inject(Router).url).toBe('/admin/projects?statut=brouillon');
    root
      .querySelector<HTMLButtonElement>('button[aria-label="Retirer le filtre Statut : Brouillon"]')
      ?.click();
    await settle();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(TestBed.inject(Router).url).toBe('/admin/projects');
    expect(root.textContent).not.toContain('Tous');
  });

  it('restores the search, the facets, the sort and the page from the URL', async (): Promise<void> => {
    const { root, harness, settle } = await list(
      [
        { ...project('a', 'published'), featured: true },
        { ...project('b', 'published'), featured: true },
        project('c', 'draft'),
      ],
      [],
      '/admin/projects?q=titre&statut=publie,inconnu&accueil=oui&tri=titre&ordre=desc&page=1',
    );
    expect(root.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('titre');
    expect(
      [...root.querySelectorAll('[data-slot="data-table-filter-chip"]')].map(
        (chip: Element): string => chip.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      ),
    ).toEqual(['Statut : Publié', 'Mis en avant : Oui']);
    expect(
      [...root.querySelectorAll('tbody tr a')].map((a: Element): string => a.textContent ?? ''),
    ).toEqual(['Titre b', 'Titre a']);
    // Back and forward replay another query: the table follows it.
    await harness.navigateByUrl('/admin/projects?completude=a-completer');
    await settle();
    expect(root.querySelector('[data-slot="data-table-no-results"]')?.textContent).toContain(
      'Aucun projet ne correspond',
    );
  });

  it('opens the editor from the title link, the keyboard way in, but not from the row menu', async (): Promise<void> => {
    const { backend, root, settle, action } = await list([project('a', 'draft')]);
    const link: HTMLAnchorElement | null = root.querySelector<HTMLAnchorElement>(
      'tbody tr a[href="/admin/projects/a"]',
    );
    expect(link?.tabIndex).toBe(0);
    await action(0, 'Modifier');
    backend.expectNone('/api/content/admin/projects/a');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    link?.click();
    await settle();
    expect(TestBed.inject(Router).url).toBe('/admin/projects/a');
    backend.expectOne('/api/content/admin/projects/a').flush(project('a', 'draft'));
    await settle();
  });

  it('opens the editor when a row cell is clicked', async (): Promise<void> => {
    const { backend, root, settle } = await list([project('a', 'draft')]);
    root.querySelectorAll<HTMLElement>('tbody tr td')[1]?.click();
    await settle();
    expect(TestBed.inject(Router).url).toBe('/admin/projects/a');
    backend.expectOne('/api/content/admin/projects/a').flush(project('a', 'draft'));
    await settle();
  });

  it('shows skeleton rows while the list loads', async (): Promise<void> => {
    const { backend, harness, navigation } = await open('/admin/projects');
    await navigation;
    await harness.fixture.whenStable();
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    expect(root.querySelectorAll('[data-slot="data-table-skeleton-row"]').length).toBeGreaterThan(
      0,
    );
    expect(root.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    backend.expectOne('/api/content/admin/projects').flush({ member: [], totalItems: 0 });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('[data-slot="data-table-skeleton-row"]')).toBeNull();
  });

  it('says when there is no project at all', async (): Promise<void> => {
    const { root } = await list([]);
    expect(root.querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Aucun projet',
    );
    // Nothing follows the table on the page (no pagination without rows): the fill layout.
    expect(root.querySelector<HTMLElement>('[data-slot="empty"]')?.dataset['layout']).toBe('fill');
    // French takes the singular for zero and one.
    expect(projectCount(root)).toBe('0 projet');
  });

  it('narrows the list to the projects matching every searched word, ignoring accents', async (): Promise<void> => {
    const { root, settle } = await list([project('a', 'published'), project('b', 'draft')]);
    const search: (value: string) => Promise<void> = async (value: string): Promise<void> => {
      const field: HTMLInputElement | null =
        root.querySelector<HTMLInputElement>('input[type="search"]');
      if (!field) throw new Error('search missing');
      field.value = value;
      field.dispatchEvent(new Event('input'));
      await settle();
    };
    const rows = (): string[] =>
      [...root.querySelectorAll('tbody tr')].map((row: Element): string => row.textContent ?? '');
    await search('TÎTRE b');
    expect(rows()).toEqual([expect.stringContaining('Titre b')]);
    expect(TestBed.inject(Router).url).toBe('/admin/projects?q=T%C3%8ETRE%20b');
    await search('angular');
    expect(rows()).toHaveLength(2);
    await search('title b');
    expect(rows()).toEqual([expect.stringContaining('Titre b')]);
    await search('zzz');
    expect(
      root
        .querySelector('[data-slot="data-table-no-results"] [data-slot="empty-title"]')
        ?.textContent?.trim(),
    ).toBe('Aucun projet trouvé');
    expect(root.textContent).toContain('Aucun projet ne correspond');
    [...root.querySelectorAll('button')]
      .find(
        (b: HTMLButtonElement): boolean =>
          b.textContent?.trim().startsWith('Réinitialiser') ?? false,
      )
      ?.click();
    await settle();
    expect(rows()).toHaveLength(2);
    expect(TestBed.inject(Router).url).toBe('/admin/projects');
  });
  it('selects rows with checkboxes and shows the selection bar, cleared by Escape', async (): Promise<void> => {
    const { root, settle } = await list([project('a', 'published'), project('b', 'draft')]);
    const bar = (): HTMLElement | null => root.querySelector('[data-slot="selection-bar-panel"]');
    const rows = (): HTMLInputElement[] => [
      ...root.querySelectorAll<HTMLInputElement>('tbody ui-checkbox input'),
    ];
    expect(bar()).toBeNull();
    expect(rows()[0]?.getAttribute('aria-label')).toBe('Sélectionner Titre a');
    rows()[0]?.click();
    await settle();
    expect(bar()?.getAttribute('role')).toBe('region');
    expect(bar()?.getAttribute('aria-label')).toBe('Actions sur la sélection');
    expect(root.querySelector('[data-slot="selection-bar-count"]')?.textContent?.trim()).toBe(
      '1 sélectionné',
    );
    const disabled = (action: string): boolean | undefined =>
      root.querySelector<HTMLButtonElement>(`[data-bulk-action="${action}"]`)?.disabled;
    // Only the published project is selected: nothing to publish or to take off the home page.
    expect(disabled('publish')).toBe(true);
    expect(disabled('unpublish')).toBe(false);
    expect(disabled('feature')).toBe(false);
    expect(disabled('unfeature')).toBe(true);
    (root.querySelector('thead ui-checkbox input') as HTMLInputElement).click();
    await settle();
    expect(root.querySelector('[data-slot="selection-bar-count"]')?.textContent?.trim()).toBe(
      '2 sélectionnés',
    );
    expect(disabled('publish')).toBe(false);
    rows()[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await settle();
    expect(bar()).toBeNull();
    expect(rows().some((box: HTMLInputElement): boolean => box.checked)).toBe(false);
  });

  it('publishes the complete selected drafts one by one with If-Match, after one confirmation', async (): Promise<void> => {
    const { backend, root, settle } = await list([
      project('a', 'draft'),
      { ...project('b', 'draft'), version: 7 },
      project('c', 'draft', ['title.en']),
    ]);
    (root.querySelector('thead ui-checkbox input') as HTMLInputElement).click();
    await settle();
    root.querySelector<HTMLButtonElement>('[data-bulk-action="publish"]')?.click();
    await settle();
    const dialog: Element | null = document.querySelector('[data-slot="alert-dialog-content"]');
    expect(dialog?.textContent).toContain('Publier 2 projets ?');
    expect(dialog?.textContent).toContain("1 projet sélectionné n'est pas concerné.");
    answer('Publier');
    await settle();
    const first: TestRequest = backend.expectOne('/api/content/admin/projects/a/publish');
    expect(first.request.headers.get('if-match')).toBe('"4"');
    // Sequential: the second request waits for the first answer.
    backend.expectNone('/api/content/admin/projects/b/publish');
    first.flush({ ...project('a', 'published'), version: 5 });
    await settle();
    const second: TestRequest = backend.expectOne('/api/content/admin/projects/b/publish');
    expect(second.request.headers.get('if-match')).toBe('"7"');
    second.flush({ ...project('b', 'published'), version: 8 });
    await settle();
    backend.expectNone('/api/content/admin/projects/c/publish');
    expect(toasts()).toEqual([['success', '2 projets publiés.']]);
    expect(descriptions()).toEqual(['Le site public sera mis à jour dans quelques minutes.']);
    expect(root.querySelector('[data-slot="selection-bar-panel"]')).toBeNull();
    expect(root.querySelectorAll('tbody tr')[1]?.textContent).toContain('Publié');
  });

  it('reports a partial unpublication and keeps the failed project selected', async (): Promise<void> => {
    const { backend, root, settle } = await list([
      project('a', 'published'),
      project('b', 'published'),
    ]);
    (root.querySelector('thead ui-checkbox input') as HTMLInputElement).click();
    await settle();
    root.querySelector<HTMLButtonElement>('[data-bulk-action="unpublish"]')?.click();
    await settle();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')?.textContent).toContain(
      'Dépublier 2 projets ?',
    );
    answer('Dépublier');
    await settle();
    backend
      .expectOne('/api/content/admin/projects/a/unpublish')
      .flush({ ...project('a', 'draft'), version: 5 });
    await settle();
    backend
      .expectOne('/api/content/admin/projects/b/unpublish')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    await settle();
    backend.expectNone('/api/content/admin/projects');
    expect(toasts()).toEqual([['warning', '1 projet dépublié sur 2.']]);
    expect(TestBed.inject<ToastService>(ToastService).toasts()[0]?.description).toBe(
      '1 échec : Le service ne répond pas. Réessayez dans un moment. Le site public sera mis à jour dans quelques minutes.',
    );
    expect(root.querySelector('[data-slot="selection-bar-count"]')?.textContent?.trim()).toBe(
      '1 sélectionné',
    );
    expect(root.querySelector('tbody tr[data-state="selected"] a')?.textContent).toBe('Titre b');
  });

  it('features drafts without a confirmation, through a revision of each', async (): Promise<void> => {
    const { backend, root, settle } = await list([project('a', 'draft'), project('b', 'draft')]);
    (root.querySelector('thead ui-checkbox input') as HTMLInputElement).click();
    await settle();
    root.querySelector<HTMLButtonElement>('[data-bulk-action="feature"]')?.click();
    await settle();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeNull();
    const first: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(first.request.method).toBe('PUT');
    expect(first.request.headers.get('if-match')).toBe('"4"');
    expect(first.request.body.featured).toBe(true);
    first.flush({ ...project('a', 'draft'), featured: true, version: 5 });
    await settle();
    backend
      .expectOne('/api/content/admin/projects/b')
      .flush({ ...project('b', 'draft'), featured: true, version: 5 });
    await settle();
    expect(toasts()).toEqual([['success', '2 projets mis en avant.']]);
    // A draft is not on the public site: no rebuild announced.
    expect(TestBed.inject<ToastService>(ToastService).toasts()[0]?.description).toBeUndefined();
    expect(root.querySelectorAll('[data-slot="project-featured"]')).toHaveLength(2);
  });

  it('confirms taking a published project off the home page, and reloads after a conflict', async (): Promise<void> => {
    const { backend, root, settle } = await list([
      { ...project('a', 'published'), featured: true },
    ]);
    (root.querySelector('tbody ui-checkbox input') as HTMLInputElement).click();
    await settle();
    root.querySelector<HTMLButtonElement>('[data-bulk-action="unfeature"]')?.click();
    await settle();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')?.textContent).toContain(
      "Retirer « Titre a » de l'accueil ?",
    );
    answer("Retirer de l'accueil");
    await settle();
    backend
      .expectOne('/api/content/admin/projects/a')
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await settle();
    backend.expectOne('/api/content/admin/projects').flush({
      member: [{ ...project('a', 'published'), featured: true, version: 6 }],
      totalItems: 1,
    });
    await settle();
    expect(toasts()).toEqual([['error', 'Aucun projet modifié sur 1.']]);
    expect(descriptions()).toEqual([
      '1 échec : Un projet a été modifié entre-temps : la liste a été rechargée, recommencez.',
    ]);
    // The failed project stays selected, in its reloaded version.
    expect(root.querySelector('[data-slot="selection-bar-count"]')?.textContent?.trim()).toBe(
      '1 sélectionné',
    );
  });
});

describe('ADMIN_CONTENT_ROUTES', (): void => {
  it('rechecks pending writes after an asynchronous discard confirmation', async (): Promise<void> => {
    let approve: (accepted: boolean) => void = () => {
      throw new Error('Confirmation was not created');
    };
    const decision: Promise<boolean> = new Promise<boolean>(
      (resolve: (value: boolean | PromiseLike<boolean>) => void): void => {
        approve = resolve;
      },
    );
    const { backend, harness, type, settle } = await edit(project('a', 'draft'), [
      { provide: ConfirmDialogService, useValue: { confirm: (): Promise<boolean> => decision } },
    ]);
    await type('edit-title-fr', 'Draft');
    const navigation: ReturnType<RouterTestingHarness['navigateByUrl']> =
      harness.navigateByUrl('/admin/projects/b');
    await flush();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true }),
    );
    await flush();
    const write: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    approve(true);
    await navigation;
    backend.expectNone('/api/content/admin/projects/b');
    write.flush({ ...project('a', 'draft'), title: { fr: 'Draft' } });
    await settle();
  });

  it('validates trimmed text lengths using the same boundary as the API', async (): Promise<void> => {
    const { backend, type, submit } = await edit(project('a', 'draft'));
    await type('edit-title-en', ' ' + 'x'.repeat(4000) + ' ');
    await submit();
    const write: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(write.request.body.title.en).toHaveLength(4000);
    write.flush(project('a', 'draft'));
  });
  it('lists the projects at the root and edits one by id', (): void => {
    expect(ADMIN_CONTENT_ROUTES.map((route): string | undefined => route.path)).toEqual([
      '',
      ':id',
    ]);
  });
  it('reuses the editor for another ID but clears its old projection before the new answer', async (): Promise<void> => {
    const { backend, harness } = await edit(project('a', 'draft'));
    const instance: AdminProjectEditPageComponent | undefined =
      harness.routeDebugElement?.componentInstance;
    await harness.navigateByUrl('/admin/projects/b');
    await flush();
    expect(harness.routeDebugElement?.componentInstance).toBe(instance);
    expect(harness.routeNativeElement?.textContent).not.toContain('Titre a');
    backend.expectOne('/api/content/admin/projects/b').flush(project('b', 'draft'));
    await flush();
    await harness.fixture.whenStable();
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#edit-title-fr')?.value,
    ).toBe('Titre b');
  });

  it('protects dirty navigation, browser exit and an accepted pending write', async (): Promise<void> => {
    const confirm: Mock<ConfirmDialogService['confirm']> = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const { backend, harness, root, type, submit, settle } = await edit(project('a', 'draft'), [
      { provide: ConfirmDialogService, useValue: { confirm } },
    ]);
    await type('edit-title-fr', 'Brouillon');
    const exit: Event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(exit);
    expect(exit.defaultPrevented).toBe(true);
    const declined: ReturnType<RouterTestingHarness['navigateByUrl']> =
      harness.navigateByUrl('/admin/projects/b');
    await declined;
    expect(confirm).toHaveBeenCalledTimes(1);
    backend.expectNone('/api/content/admin/projects/b');
    await submit();
    const write: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    const cancel: HTMLButtonElement = button(root, 'Abandonner');
    expect(cancel.disabled).toBe(true);
    cancel.click();
    cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    backend.expectNone('/api/content/admin/projects/a');
    await harness.navigateByUrl('/admin/projects/b');
    backend.expectNone('/api/content/admin/projects/b');
    write.flush({ ...project('a', 'draft'), title: { fr: 'Brouillon' } });
    await settle();
    await type('edit-title-fr', 'Autre brouillon');
    const accepted: ReturnType<RouterTestingHarness['navigateByUrl']> =
      harness.navigateByUrl('/admin/projects/b');
    await accepted;
    expect(confirm).toHaveBeenCalledTimes(2);
    await flush();
    backend.expectOne('/api/content/admin/projects/b').flush(project('b', 'draft'));
    await settle();
  });

  it('blocks URL, technology, text and article bounds and maps server field errors until editing', async (): Promise<void> => {
    const { backend, root, type, submit, settle } = await edit(project('a', 'draft'));
    /**
     * Function techs
     *
     * @description
     * Replaces the technology tags: removes every tag, then types the keys, each followed by a comma.
     *
     * @param {string[]} keys - Keys typed.
     *
     * @returns {Promise<void>} Completion once the form holds them.
     */
    const techs = async (keys: string[]): Promise<void> => {
      let remove: HTMLButtonElement | null;
      while ((remove = root.querySelector('[data-slot="tags-input-remove"]'))) {
        remove.click();
        await settle();
      }
      await type('edit-techs', keys.map((key: string): string => `${key},`).join(''));
    };
    await type('edit-site-url', 'http://example.test');
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    expect(root.querySelector('#edit-site-url-error')?.textContent).toContain('URL HTTPS');
    expect(root.querySelector('#edit-site-url')?.getAttribute('aria-describedby')).toBe(
      'edit-site-url-error',
    );
    expect(root.querySelector('#edit-site-url')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('form [data-slot="alert"]')?.textContent).toContain(
      'Corrigez les champs signalés dans le panneau Propriétés.',
    );
    await type('edit-site-url', 'https://example.test');
    await techs(['Invalid_Key']);
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    expect(root.querySelector('#edit-techs-error')?.textContent).toContain('12 clés maximum');
    expect(root.querySelector('#edit-techs')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#edit-techs')?.getAttribute('aria-describedby')).toBe(
      'edit-techs-error',
    );
    // The thirteenth key is refused by the field itself (the contract's limit).
    await techs(Array.from({ length: 13 }, (_: unknown, i: number): string => `tech-${i}`));
    expect(root.querySelectorAll('[data-slot="tags-input-tag"]')).toHaveLength(12);
    expect(root.querySelector('#edit-techs-error')).toBeNull();
    await techs(['angular']);
    await type('edit-title-en', 'x'.repeat(4001));
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type('edit-title-en', 'English');
    const french: Editor = editorOf(root, 'fr');
    french.commands.insertContentAt(
      french.state.doc.content.size,
      Array.from({ length: 41 }, () => figure('Écran')),
    );
    await settle();
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    expect(root.querySelector('#edit-article-fr-error')?.textContent).toContain('40 images');
    french.commands.undo();
    await settle();
    await submit();
    backend.expectOne('/api/content/admin/projects/a').flush(
      {
        detail: 'Révision refusée',
        errors: [
          { field: 'title.fr', message: 'Titre déjà utilisé.' },
          { field: 'summary.en', message: 'Résumé anglais refusé.' },
          { field: 'article.en.content.0.content.0.text', message: 'Traduction refusée.' },
          { field: 'techs.0', message: 'Technologie refusée.' },
        ],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await settle();
    // Each refused field shows the language in error: the title, shown in English, back in French;
    // the summary and the article in English.
    expect(shownLanguage(root, 'Titre')).toBe('Français');
    expect(root.querySelector('#edit-title-fr-error')?.textContent).toContain(
      'Titre déjà utilisé.',
    );
    expect(shownLanguage(root, 'Résumé')).toBe('English');
    expect(root.querySelector('#edit-summary-en')?.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#edit-summary-en-error')?.textContent).toContain(
      'Résumé anglais refusé.',
    );
    expect(languageStates(root, 'Résumé')).toEqual(['Français', 'English, à corriger']);
    expect(shownLanguage(root, 'Article')).toBe('English');
    expect(root.querySelector('#edit-article-en')?.closest('[hidden]')).toBeNull();
    await type('edit-title-fr', 'Autre titre');
    expect(root.textContent).not.toContain('Titre déjà utilisé.');
    expect(root.textContent).toContain('Traduction refusée.');
    expect(root.textContent).toContain('Technologie refusée.');
    editorOf(root, 'en').commands.insertContent('Another paragraph.');
    await settle();
    expect(root.textContent).not.toContain('Traduction refusée.');
    expect(root.querySelector('#edit-techs')?.getAttribute('aria-invalid')).toBe('true');
    await type('edit-techs', 'typescript,');
    expect(root.textContent).not.toContain('Technologie refusée.');
  });
  it('keeps the destination projection when the previous routed read completes later', async (): Promise<void> => {
    const { backend, harness, navigation } = await open('/admin/projects/a');
    await navigation;
    await flush();
    const previous: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    await harness.navigateByUrl('/admin/projects/b');
    await flush();
    backend.expectOne('/api/content/admin/projects/b').flush(project('b', 'draft'));
    previous.flush(project('a', 'draft'));
    await flush();
    await harness.fixture.whenStable();
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('#edit-title-fr')?.value,
    ).toBe('Titre b');
  });
});
