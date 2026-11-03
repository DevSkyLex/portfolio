import type { Mock } from 'vitest';
import type { AdminProjectEditPageComponent } from '@internal/content-web-feature-admin/lib/ui/pages/admin-project-edit-page/admin-project-edit-page.component';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { AdminProject } from '@vfortin/content-web-data-access/admin';
import { type ConfirmDialogOptions, ConfirmDialogService, ToastService } from '@vfortin/ui';
import { ADMIN_CONTENT_ROUTES } from '@internal/content-web-feature-admin/lib/admin-content.routes';

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
  submit: () => Promise<void>;
  settle: () => Promise<void>;
}

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
 * Function project
 *
 * @description
 * Builds an administrator project fixture with the requested publication state and missing-field list;
 * its work list and captions have no paragraph.
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
  periodLabel: t('2026', '2026'),
  client: t('Client', 'Client'),
  role: t('Rôle', 'Role'),
  place: t('Lieu', 'Place'),
  siteUrl: null,
  techs: ['angular'],
  featured: false,
  article: {
    context: [t('Un.', 'One.')],
    work: [t('Deux.', 'Two.')],
    workList: [],
    choices: [t('Trois.', 'Three.')],
    result: [t('Quatre.', 'Four.')],
    lessons: [t('Cinq.', 'Five.')],
    captions: [],
  },
  missing,
});

/**
 * Function complete
 *
 * @description
 * Builds a project fixture whose every section has a translated paragraph, so no field is missing.
 *
 * @param {string} id - Stable fixture identifier and slug.
 * @param {'draft' | 'published'} status - Publication state of the fixture.
 *
 * @returns {AdminProject} Complete administrator project response.
 */
const complete: (id: string, status: 'draft' | 'published') => AdminProject = (
  id: string,
  status: 'draft' | 'published',
): AdminProject => {
  const base: AdminProject = project(id, status);
  return {
    ...base,
    article: { ...base.article, workList: [t('Six.', 'Six.')], captions: [t('Sept.', 'Seven.')] },
  };
};

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
 * Function open
 *
 * @description
 * Configures the administrator routes with HTTP testing providers and starts navigation to the supplied URL.
 *
 * @param {string} url - Administrator URL opened by the router harness.
 * @param {Provider[]} [providers] - Extra providers, such as a confirmation double.
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
   * Function type
   *
   * @description
   * Enters a value into the form control with the given id, whichever language tab holds it.
   *
   * @param {string} id - Control id, such as `edit-title-fr` or `edit-article-context-en`.
   * @param {string} value - Text entered into the control.
   *
   * @returns {Promise<void>} Completion after the form receives and stabilizes the input event.
   */
  const type: (id: string, value: string) => Promise<void> = async (
    id: string,
    value: string,
  ): Promise<void> => {
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
  return { ...opened, root, type, submit, settle };
};

/**
 * Function list
 *
 * @description
 * Opens the project list, responds with the supplied collection, and exposes the row menu items.
 *
 * @param {AdminProject[]} projects - Project collection returned by the list endpoint.
 * @param {Provider[]} [providers] - Extra providers, such as a confirmation double.
 *
 * @returns {Promise<ListHarness>} Harness, rendered list, request controller, and row menu helper.
 */
const list = async (projects: AdminProject[], providers: Provider[] = []): Promise<ListHarness> => {
  const opened: OpenedProjectHarness = await open('/admin/projects', providers);
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
      .querySelectorAll('li')
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
 * Function tab
 *
 * @description
 * Finds a language tab trigger of the project form by the start of its text.
 *
 * @param {HTMLElement} root - Rendered page root to search.
 * @param {string} label - Language name at the start of the trigger text.
 *
 * @returns {HTMLButtonElement} Matching tab trigger.
 */
const tab: (root: HTMLElement, label: string) => HTMLButtonElement = (
  root: HTMLElement,
  label: string,
): HTMLButtonElement => {
  const found: HTMLButtonElement | undefined = [
    ...root.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ].find((b: HTMLButtonElement): boolean => b.textContent?.trim().startsWith(label) ?? false);
  if (!found) throw new Error(`${label} tab missing`);
  return found;
};

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
    const items: string[] = [...root.querySelectorAll('li')].map(
      (li: HTMLLIElement): string => li.textContent ?? '',
    );
    expect(items[0]).toContain('Publié');
    expect(items[1]).toContain('1 champ(s) à compléter');
    expect((await action(1, 'Publier')).getAttribute('aria-disabled')).toBe('true');
  });

  it('saves with If-Match and offers to reload on conflict', async (): Promise<void> => {
    const { backend, harness, root, type, submit, settle } = await edit(project('a', 'draft'));
    expect(root.querySelector<HTMLInputElement>('#edit-title-fr')?.value).toBe('Titre a');
    await type('edit-title-fr', 'Nouveau titre');
    await submit();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    expect(call.request.body.title).toEqual({ fr: 'Nouveau titre', en: 'Title a' });
    await harness.fixture.whenStable();
    const fieldsets: HTMLFieldSetElement[] = [...root.querySelectorAll('fieldset')];
    expect(fieldsets).toHaveLength(5);
    expect(fieldsets.every((fieldset: HTMLFieldSetElement): boolean => fieldset.disabled)).toBe(
      true,
    );
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
    expect(root.textContent).toContain('version 6');
  });

  it('saves a draft and toasts it, keeping the form in step with the answer', async (): Promise<void> => {
    const { backend, root, type, submit, settle } = await edit(project('a', 'draft'));
    await type('edit-title-fr', 'Nouveau titre');
    await submit();
    backend.expectOne('/api/content/admin/projects/a').flush({
      ...project('a', 'draft'),
      version: 5,
      title: { fr: 'Nouveau titre', en: 'Title a' },
    });
    await settle();
    expect(toasts()).toEqual([['success', 'Enregistré (brouillon).']]);
    expect(root.querySelector('h1')?.textContent).toContain('Nouveau titre');
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

  it('refuses to save an empty French title or misaligned English paragraphs, showing the tab in error', async (): Promise<void> => {
    const { backend, root, type, submit } = await edit(project('a', 'draft'));
    await type('edit-title-fr', '');
    await submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('obligatoires');
    expect(tab(root, 'Français').getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('#edit-title-fr-error')?.textContent).toContain(
      'Le texte français est obligatoire.',
    );
    expect(root.querySelector('#edit-title-fr')?.getAttribute('aria-describedby')).toBe(
      'edit-title-fr-error',
    );
    await type('edit-title-fr', 'Titre');
    await type('edit-article-context-en', 'One.\n\nTwo.');
    await submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Même nombre de paragraphes attendu en anglais : Contexte.',
    );
    expect(tab(root, 'English').getAttribute('aria-selected')).toBe('true');
    await type('edit-article-context-en', 'One.');
    await type('edit-title-fr', '');
    await submit();
    expect(tab(root, 'Français').getAttribute('aria-selected')).toBe('true');
    backend.expectNone('/api/content/admin/projects/a');
  });

  it('publishes a complete draft, then toasts it', async (): Promise<void> => {
    const { backend, root, settle } = await edit(project('a', 'draft'));
    button(root, 'Publier').click();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a/publish');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    call.flush({ ...project('a', 'published'), version: 5 });
    await settle();
    expect(toasts()).toEqual([
      ['success', 'Publié. Le site public sera reconstruit dans quelques minutes.'],
    ]);
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
  it('edits one language at a time in tabs, the shared settings outside them', async (): Promise<void> => {
    const { root, settle } = await edit(complete('a', 'draft'));
    const panel: (id: string) => HTMLElement | null = (id: string): HTMLElement | null =>
      root.querySelector<HTMLElement>(`#${id}`)?.closest<HTMLElement>('[role="tabpanel"]') ?? null;
    expect(tab(root, 'Français').getAttribute('aria-selected')).toBe('true');
    expect(panel('edit-title-fr')?.hidden).toBe(false);
    expect(panel('edit-title-en')?.hidden).toBe(true);
    expect(panel('edit-article-context-en')?.hidden).toBe(true);
    expect(panel('edit-site-url')).toBeNull();
    expect(panel('edit-techs')).toBeNull();
    expect(panel('edit-featured')).toBeNull();
    tab(root, 'English').click();
    await settle();
    expect(tab(root, 'English').getAttribute('aria-selected')).toBe('true');
    expect(panel('edit-title-fr')?.hidden).toBe(true);
    expect(panel('edit-title-en')?.hidden).toBe(false);
    expect(panel('edit-title-en')?.textContent).toContain('[à traduire]');
    expect(
      [...root.querySelectorAll('legend')].map((legend: HTMLLegendElement): string =>
        legend.textContent.trim(),
      ),
    ).toEqual(['Présentation', 'Étude de cas', 'Présentation', 'Étude de cas', 'Paramètres']);
    expect(root.querySelector('#edit-title-fr')?.getAttribute('aria-required')).toBe('true');
    expect(root.querySelector('#edit-title-en')?.getAttribute('aria-required')).toBeNull();
    expect(root.querySelector('#edit-site-url')?.getAttribute('aria-describedby')).toBe(
      'edit-site-url-hint',
    );
  });

  it('counts the fields still to complete on each language tab, following the edits', async (): Promise<void> => {
    const { root, type } = await edit({
      ...project('a', 'draft', ['title.en', 'article.workList.fr', 'article.captions.fr']),
      title: t('Titre a'),
    });
    const badge: (label: string) => string | null = (label: string): string | null =>
      tab(root, label).querySelector('[data-slot="badge"]')?.textContent?.trim() ?? null;
    expect(badge('Français')).toBe('2 champ(s) à compléter');
    expect(badge('English')).toBe('3 champ(s) à compléter');
    expect(
      tab(root, 'English').querySelector('[data-slot="badge"]')?.getAttribute('data-variant'),
    ).toBe('warning');
    await type('edit-article-workList-fr', 'Liste.');
    await type('edit-article-captions-fr', 'Légende.');
    expect(badge('Français')).toBeNull();
    expect(badge('English')).toBe('3 champ(s) à compléter');
    await type('edit-title-en', 'Title a');
    await type('edit-article-workList-en', 'List.');
    await type('edit-article-captions-en', '[à traduire]');
    expect(badge('English')).toBe('1 champ(s) à compléter');
    await type('edit-article-captions-en', 'Caption.');
    expect(badge('English')).toBeNull();
    await type('edit-article-context-en', 'One.\n\nTwo.');
    expect(badge('English')).toBe('1 champ(s) à compléter');
    await type('edit-title-fr', '');
    expect(badge('Français')).toBe('1 champ(s) à compléter');
  });
});

describe('AdminProjectEditPageComponent', (): void => {
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

  it('discards unsaved changes by reloading the project', async (): Promise<void> => {
    const { backend, root, type, settle } = await edit(project('a', 'draft'));
    await type('edit-title-fr', 'Brouillon jeté');
    expect(root.textContent).toContain('Modifications non enregistrées');
    button(root, 'Annuler').click();
    await settle();
    backend.expectOne('/api/content/admin/projects/a').flush(project('a', 'draft'));
    await settle();
    expect(root.querySelector<HTMLInputElement>('#edit-title-fr')?.value).toBe('Titre a');
    expect(root.textContent).toContain('Tout est enregistré');
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
    expect(root.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Projet introuvable.');
    expect(root.querySelector('form')).toBeNull();
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
    expect(toasts()).toEqual([
      ['success', 'Enregistré. Le site public sera reconstruit dans quelques minutes.'],
    ]);
  });

  it('keeps a published project complete before sending, showing the language in error', async (): Promise<void> => {
    const { backend, root, type, submit } = await edit(complete('a', 'published'));
    expect(root.querySelector('#edit-title-en')?.getAttribute('aria-required')).toBe('true');
    await type('edit-title-en', '');
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    expect(tab(root, 'English').getAttribute('aria-selected')).toBe('true');
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
    const { backend, root, settle } = await edit(project('a', 'published'));
    expect(root.querySelector('header a[href="/projects/a"]')?.textContent).toContain(
      'Voir la page',
    );
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
    expect(button(root, 'Publier')).toBeTruthy();
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
    expect(root.querySelector('h1 + p')?.textContent).toContain('Brouillon');
  });

  it('opens the properties in a right sheet from the title bar', async (): Promise<void> => {
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
    expect(sheet?.textContent).toContain('En ligne');
    expect(sheet?.textContent).toContain('Mis en avant');
    expect(sheet?.textContent).toContain('/projects/a');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    sheet?.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')?.click();
    await settle();
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('AdminProjectsPageComponent', (): void => {
  it('publishes a complete draft from the row menu without reloading the list', async (): Promise<void> => {
    const { backend, root, settle, action } = await list([project('b', 'draft')]);
    (await action(0, 'Publier')).click();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/b/publish');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    call.flush({ ...project('b', 'published'), version: 5 });
    await settle();
    backend.expectNone('/api/content/admin/projects');
    expect(root.querySelector('li')?.textContent).toContain('Publié');
    expect(toasts()).toEqual([['success', '« Titre b » publié.']]);
    expect(await action(0, 'Dépublier')).toBeTruthy();
  });

  it('offers editing, the public page and the publication change in each row menu', async (): Promise<void> => {
    const { root, settle, action } = await list([project('a', 'published'), project('b', 'draft')]);
    expect(root.querySelector('li a[href="/admin/projects/a"]')?.textContent?.trim()).toBe(
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
    root.querySelectorAll('li')[0]?.querySelector<HTMLButtonElement>('button')?.click();
    await settle();
    await action(1, 'Modifier');
    expect(menuItems().map((item: HTMLElement): string => item.textContent?.trim() ?? '')).toEqual([
      'Modifier',
      'Publier',
    ]);
  });

  it('names the icon-only row menu button and explains it in a tooltip', async (): Promise<void> => {
    const { root, settle } = await list([project('a', 'published')]);
    const trigger: HTMLButtonElement | null = root.querySelector<HTMLButtonElement>(
      'li button[aria-label="Actions pour « Titre a »"]',
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
    expect(root.querySelector('li')?.textContent).toContain('Publié');
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
    expect(root.querySelector('li')?.textContent).toContain('Brouillon');
    expect(toasts()).toEqual([['success', '« Titre a » retiré du site public.']]);
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
    expect(root.querySelector('li')?.textContent).toContain('Publié');
  });

  it('marks featured and incomplete projects with their status badges', async (): Promise<void> => {
    const { root } = await list([
      { ...project('a', 'published'), featured: true },
      project('b', 'draft', ['title.en', 'lead.en']),
    ]);
    const [published, draft] = [...root.querySelectorAll('li')];
    const badges: (row: Element | undefined) => (string | null)[][] = (
      row: Element | undefined,
    ): (string | null)[][] =>
      [...(row?.querySelectorAll('[data-slot="badge"]') ?? [])].map(
        (badge: Element): (string | null)[] => [
          badge.getAttribute('data-variant'),
          badge.textContent?.trim(),
        ],
      );
    expect(badges(published)).toEqual([['info', 'Accueil']]);
    expect(published?.textContent).toContain('Complet en français et en anglais');
    expect(badges(draft)).toEqual([['warning', '2 champ(s) à compléter avant publication']]);
  });

  it('switches the status filter from the title bar', async (): Promise<void> => {
    const { root, settle } = await list([project('a', 'published'), project('b', 'draft')]);
    const filter: (label: string) => HTMLButtonElement = (label: string): HTMLButtonElement => {
      const found: Element | undefined = [...root.querySelectorAll('[role="group"] button')].find(
        (b: Element): boolean => b.textContent?.trim() === label,
      );
      if (!(found instanceof HTMLButtonElement)) throw new Error(`${label} missing`);
      return found;
    };
    filter('Brouillons').click();
    await settle();
    expect(filter('Brouillons').getAttribute('aria-pressed')).toBe('true');
    expect(
      [...root.querySelectorAll('section')].map((s: HTMLElement): string | null =>
        s.getAttribute('aria-label'),
      ),
    ).toEqual(['Brouillons']);
    filter('Tous').click();
    await settle();
    expect(root.querySelectorAll('section')).toHaveLength(2);
  });

  it('says when there is no project at all', async (): Promise<void> => {
    const { root } = await list([]);
    expect(root.querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Aucun projet',
    );
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
    await search('TÎTRE b');
    expect(
      [...root.querySelectorAll('li')].map((li: HTMLLIElement): string => li.textContent),
    ).toEqual([expect.stringContaining('Titre b')]);
    await search('zzz');
    expect(root.querySelector('li')).toBeNull();
    expect(root.textContent).toContain('Aucun projet ne correspond');
    await search('');
    expect(root.querySelectorAll('li')).toHaveLength(2);
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
    const cancel: HTMLButtonElement = button(root, 'Annuler');
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
    await type('edit-site-url', 'http://example.test');
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    expect(root.querySelector('#edit-site-url-error')?.textContent).toContain('URL HTTPS');
    expect(root.querySelector('#edit-site-url')?.getAttribute('aria-describedby')).toBe(
      'edit-site-url-error',
    );
    await type('edit-site-url', 'https://example.test');
    await type('edit-techs', 'Invalid_Key');
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type(
      'edit-techs',
      Array.from({ length: 13 }, (_: unknown, i: number): string => `tech-${i}`).join(','),
    );
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type('edit-techs', 'angular');
    await type('edit-title-en', 'x'.repeat(4001));
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type('edit-title-en', 'English');
    await type(
      'edit-article-context-fr',
      Array.from({ length: 31 }, (): string => 'Paragraphe').join('\n\n'),
    );
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type('edit-article-context-fr', 'x'.repeat(4001));
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type('edit-article-context-fr', 'Un.');
    await submit();
    backend.expectOne('/api/content/admin/projects/a').flush(
      {
        detail: 'Révision refusée',
        errors: [
          { field: 'title.fr', message: 'Titre déjà utilisé.' },
          { field: 'article.context.0.en', message: 'Traduction refusée.' },
          { field: 'techs.0', message: 'Technologie refusée.' },
        ],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await settle();
    expect(root.textContent).toContain('Titre déjà utilisé.');
    await type('edit-title-fr', 'Autre titre');
    expect(root.textContent).not.toContain('Titre déjà utilisé.');
    expect(root.textContent).toContain('Traduction refusée.');
    expect(root.textContent).toContain('Technologie refusée.');
    await type('edit-article-context-en', 'Another paragraph.');
    expect(root.textContent).not.toContain('Traduction refusée.');
    await type('edit-techs', 'angular,typescript');
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
