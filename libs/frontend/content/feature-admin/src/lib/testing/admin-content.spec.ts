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
import { type ConfirmDialogOptions, ConfirmDialogService } from '@vfortin/ui';
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
  type: (selector: string, value: string) => Promise<void>;
  submit: () => Promise<void>;
  settle: () => Promise<void>;
}

/** Project-list interactions exposed by the route test helper. */
interface ListHarness extends OpenedProjectHarness {
  root: HTMLElement;
  settle: () => Promise<void>;
  button: (row: number, label: string) => HTMLButtonElement;
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
 * Builds an administrator project fixture with the requested publication state and missing-field list.
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
 * Function open
 *
 * @description
 * Configures the administrator routes with HTTP testing providers and starts navigation to the supplied URL.
 *
 * @param {string} url - Administrator URL opened by the router harness.
 * @param {Provider[]} [providers] - Extra providers, such as a confirmation double.
 *
 * @returns {Promise<{ backend: HttpTestingController; harness: RouterTestingHarness; navigation: ReturnType<RouterTestingHarness['navigateByUrl']> }>} Harness, backend controller, and pending navigation.
 */
async function open(
  url: string,
  providers: Provider[] = [],
): Promise<{
  backend: HttpTestingController;
  harness: RouterTestingHarness;
  navigation: ReturnType<RouterTestingHarness['navigateByUrl']>;
}> {
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
 *
 * @returns {Promise<{ backend: HttpTestingController; harness: RouterTestingHarness; navigation: ReturnType<RouterTestingHarness['navigateByUrl']>; root: HTMLElement; type: (selector: string, value: string) => Promise<void>; submit: () => Promise<void>; settle: () => Promise<void> }>} Harness, rendered root, and editor interaction helpers.
 */
const edit = async (current: AdminProject, providers: Provider[] = []): Promise<EditorHarness> => {
  const opened: {
    backend: HttpTestingController;
    harness: RouterTestingHarness;
    navigation: ReturnType<RouterTestingHarness['navigateByUrl']>;
  } = await open(`/admin/projects/${current.id}`, providers);
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
   * Enters a value into a short input or the textarea whose label matches the requested article field.
   *
   * @param {string} selector - Input id or visible article field label.
   * @param {string} value - Text entered into the selected control.
   *
   * @returns {Promise<void>} Completion after the form receives and stabilizes the input event.
   */
  const type: (selector: string, value: string) => Promise<void> = async (
    selector: string,
    value: string,
  ): Promise<void> => {
    const field: HTMLInputElement | HTMLTextAreaElement | null = selector.startsWith('#')
      ? root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)
      : ([...root.querySelectorAll('label')]
          .find((label: HTMLLabelElement): boolean =>
            label.textContent?.trim().startsWith(selector),
          )
          ?.querySelector('textarea') ?? null);
    if (!field) throw new Error(`${selector} missing`);
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
 * Opens the project list, responds with the supplied collection, and exposes row button lookup.
 *
 * @param {AdminProject[]} projects - Project collection returned by the list endpoint.
 * @param {Provider[]} [providers] - Extra providers, such as a confirmation double.
 *
 * @returns {Promise<{ backend: HttpTestingController; harness: RouterTestingHarness; navigation: ReturnType<RouterTestingHarness['navigateByUrl']>; root: HTMLElement; settle: () => Promise<void>; button: (row: number, label: string) => HTMLButtonElement }>} Harness, rendered list, request controller, and row button helper.
 */
const list = async (projects: AdminProject[], providers: Provider[] = []): Promise<ListHarness> => {
  const opened: {
    backend: HttpTestingController;
    harness: RouterTestingHarness;
    navigation: ReturnType<RouterTestingHarness['navigateByUrl']>;
  } = await open('/admin/projects', providers);
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
   * Function button
   *
   * @description
   * Finds a button with the requested label inside one project row and throws if the row or button is absent.
   *
   * @param {number} row - Zero-based project row index.
   * @param {string} label - Visible label to match.
   *
   * @returns {HTMLButtonElement} Matching row button.
   */
  const button: (row: number, label: string) => HTMLButtonElement = (
    row: number,
    label: string,
  ): HTMLButtonElement => {
    const found: HTMLButtonElement | undefined = [
      ...(root.querySelectorAll('li')[row]?.querySelectorAll('button') ?? []),
    ].find((b: HTMLButtonElement): boolean => b.textContent?.trim() === label);
    if (!found) throw new Error(`${label} missing`);
    return found;
  };
  return { ...opened, root, settle, button };
};

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
    const { backend, harness, navigation } = await open('/admin/projects');
    await navigation;
    backend.expectOne('/api/content/admin/projects').flush({
      member: [project('a', 'published'), project('b', 'draft', ['title.en'])],
      totalItems: 2,
    });
    await flush();
    await harness.fixture.whenStable();
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    const items: string[] = [...root.querySelectorAll('li')].map(
      (li: HTMLLIElement): string => li.textContent ?? '',
    );
    expect(items[0]).toContain('Publié');
    expect(items[1]).toContain('1 champ(s) à compléter');
    const publish: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find(
      (b: HTMLButtonElement): boolean => b.textContent?.includes('Publier'),
    );
    expect(publish?.disabled).toBe(true);
  });

  it('saves with If-Match and offers to reload on conflict', async (): Promise<void> => {
    const { backend, harness, navigation } = await open('/admin/projects/a');
    await navigation;
    await flush();
    backend.expectOne('/api/content/admin/projects/a').flush(project('a', 'draft'));
    await flush();
    await harness.fixture.whenStable();
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    const title: HTMLInputElement | null = root.querySelector<HTMLInputElement>('#edit-title-fr');
    if (!title) throw new Error('title field missing');
    expect(title.value).toBe('Titre a');
    title.value = 'Nouveau titre';
    title.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    expect(call.request.body.title).toEqual({ fr: 'Nouveau titre', en: 'Title a' });
    await harness.fixture.whenStable();
    const fieldsets: HTMLFieldSetElement[] = [...root.querySelectorAll('fieldset')];
    expect(fieldsets.map((fieldset: HTMLFieldSetElement): boolean => fieldset.disabled)).toEqual([
      true,
      true,
    ]);
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    backend.expectNone('/api/content/admin/projects/a');
    call.flush(
      { code: 'content.version-mismatch' },
      { status: 412, statusText: 'Precondition Failed' },
    );
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('modifié ailleurs');
    expect(fieldsets.map((fieldset: HTMLFieldSetElement): boolean => fieldset.disabled)).toEqual([
      false,
      false,
    ]);
  });

  it('saves a draft and confirms it, keeping the form in step with the answer', async (): Promise<void> => {
    const { backend, harness, root, type, submit } = await edit(project('a', 'draft'));
    await type('#edit-title-fr', 'Nouveau titre');
    await submit();
    backend.expectOne('/api/content/admin/projects/a').flush({
      ...project('a', 'draft'),
      version: 5,
      title: { fr: 'Nouveau titre', en: 'Title a' },
    });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Enregistré (brouillon).');
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
    await type('#edit-title-fr', 'Titre au clavier');
    expect(press().defaultPrevented).toBe(true);
    await flush();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a');
    expect(call.request.method).toBe('PUT');
    expect(call.request.body.title).toEqual({ fr: 'Titre au clavier', en: 'Title a' });
  });

  it('refuses to save an empty French title or misaligned English paragraphs', async (): Promise<void> => {
    const { backend, root, type, submit } = await edit(project('a', 'draft'));
    await type('#edit-title-fr', '');
    await submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('obligatoires');
    await type('#edit-title-fr', 'Titre');
    await type('Contexte (EN)', 'One.\n\nTwo.');
    await submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Contexte');
    backend.expectNone('/api/content/admin/projects/a');
  });

  it('publishes a complete draft, then confirms', async (): Promise<void> => {
    const { backend, harness, root } = await edit(project('a', 'draft'));
    const toggle: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find(
      (b: HTMLButtonElement): boolean => b.textContent?.trim() === 'Publier',
    );
    toggle?.click();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/a/publish');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    call.flush({ ...project('a', 'published'), version: 5 });
    await flush();
    await harness.fixture.whenStable();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Publié.');
  });

  it('unpublishes from the list only once confirmed, and reloads after a conflict', async (): Promise<void> => {
    const { backend, harness, navigation } = await open('/admin/projects');
    await navigation;
    backend.expectOne('/api/content/admin/projects').flush({
      member: [project('a', 'published'), project('b', 'draft')],
      totalItems: 2,
    });
    await flush();
    await harness.fixture.whenStable();
    const root: HTMLElement = harness.routeNativeElement as HTMLElement;
    const unpublish: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find(
      (b: HTMLButtonElement): boolean => b.textContent?.includes('Dépublier'),
    );
    unpublish?.click();
    await harness.fixture.whenStable();
    expect(document.querySelector('[data-slot="alert-dialog-content"]')?.textContent).toContain(
      'Dépublier « Titre a » ?',
    );
    answer('Annuler');
    await flush();
    backend.expectNone('/api/content/admin/projects/a/unpublish');
    unpublish?.click();
    await harness.fixture.whenStable();
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
    await type('#edit-title-fr', 'Brouillon jeté');
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
    const { backend, root, type, submit, settle } = await edit(project('a', 'published'));
    await type('#edit-title-fr', 'Titre revu');
    await submit();
    backend.expectOne('/api/content/admin/projects/a').flush({
      ...project('a', 'published'),
      version: 5,
      title: { fr: 'Titre revu', en: 'Title a' },
    });
    await settle();
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Enregistré. Le site public sera reconstruit dans quelques minutes.',
    );
  });

  it('unpublishes a published project, then confirms its removal', async (): Promise<void> => {
    const { backend, root, settle } = await edit(project('a', 'published'));
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
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Retiré du site public.',
    );
    expect(button(root, 'Publier')).toBeTruthy();
  });

  it('keeps the project as it was and shows the error when publishing fails', async (): Promise<void> => {
    const { backend, root, settle } = await edit(project('a', 'draft'));
    button(root, 'Publier').click();
    backend
      .expectOne('/api/content/admin/projects/a/publish')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Le service ne répond pas. Réessayez dans un moment.',
    );
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.querySelector('h1 + p')?.textContent).toContain('Brouillon');
  });
});

describe('AdminProjectsPageComponent', (): void => {
  it('publishes a complete draft from the list without reloading it', async (): Promise<void> => {
    const { backend, root, settle, button: rowButton } = await list([project('b', 'draft')]);
    rowButton(0, 'Publier').click();
    const call: TestRequest = backend.expectOne('/api/content/admin/projects/b/publish');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    call.flush({ ...project('b', 'published'), version: 5 });
    await settle();
    backend.expectNone('/api/content/admin/projects');
    expect(root.querySelector('li')?.textContent).toContain('Publié');
    expect(rowButton(0, 'Dépublier')).toBeTruthy();
  });

  it('reloads the list when publishing hits a newer version', async (): Promise<void> => {
    const { backend, root, settle, button: rowButton } = await list([project('b', 'draft')]);
    rowButton(0, 'Publier').click();
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
    expect(root.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Le projet a été modifié entre-temps : la liste a été rechargée, recommencez.',
    );
    expect(root.querySelector('li')?.textContent).toContain('Publié');
  });

  it('shows the error without reloading when publishing fails otherwise', async (): Promise<void> => {
    const { backend, root, settle, button: rowButton } = await list([project('b', 'draft')]);
    rowButton(0, 'Publier').click();
    backend
      .expectOne('/api/content/admin/projects/b/publish')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    await settle();
    backend.expectNone('/api/content/admin/projects');
    expect(root.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Le service ne répond pas. Réessayez dans un moment.',
    );
  });

  it('unpublishes once confirmed, without reloading the list', async (): Promise<void> => {
    const { backend, root, settle, button: rowButton } = await list([project('a', 'published')]);
    rowButton(0, 'Dépublier').click();
    await settle();
    answer('Dépublier');
    await flush();
    backend
      .expectOne('/api/content/admin/projects/a/unpublish')
      .flush({ ...project('a', 'draft'), version: 5 });
    await settle();
    backend.expectNone('/api/content/admin/projects');
    expect(root.querySelector('li')?.textContent).toContain('Brouillon');
  });

  it('asks a danger-toned confirmation naming the project, and keeps it published when declined', async (): Promise<void> => {
    const asked: ConfirmDialogOptions[] = [];
    const confirmations: Pick<ConfirmDialogService, 'confirm'> = {
      confirm: (options: ConfirmDialogOptions): Promise<boolean> => {
        asked.push(options);
        return Promise.resolve(false);
      },
    };
    const {
      backend,
      root,
      settle,
      button: rowButton,
    } = await list(
      [project('a', 'published')],
      [{ provide: ConfirmDialogService, useValue: confirmations }],
    );
    rowButton(0, 'Dépublier').click();
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
    await type('#edit-title-fr', 'Draft');
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
    await type('#edit-title-en', ' ' + 'x'.repeat(4000) + ' ');
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
    await type('#edit-title-fr', 'Brouillon');
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
    await type('#edit-title-fr', 'Autre brouillon');
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
    const url: HTMLInputElement | null = root.querySelector<HTMLInputElement>('input[type=url]');
    const tech: HTMLInputElement | null = root.querySelector<HTMLInputElement>('input.font-mono');
    if (!url || !tech) throw new Error('Editor controls missing');
    const enter: (field: HTMLInputElement, value: string) => Promise<void> = async (
      field: HTMLInputElement,
      value: string,
    ): Promise<void> => {
      field.value = value;
      field.dispatchEvent(new Event('input'));
      await settle();
    };
    await enter(url, 'http://example.test');
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    expect(root.textContent).toContain('URL HTTPS');
    await enter(url, 'https://example.test');
    await enter(tech, 'Invalid_Key');
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await enter(
      tech,
      Array.from({ length: 13 }, (_: unknown, i: number): string => `tech-${i}`).join(','),
    );
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await enter(tech, 'angular');
    await type('#edit-title-en', 'x'.repeat(4001));
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type('#edit-title-en', 'English');
    await type(
      'Contexte (FR)',
      Array.from({ length: 31 }, (): string => 'Paragraphe').join('\n\n'),
    );
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type('Contexte (FR)', 'x'.repeat(4001));
    await submit();
    backend.expectNone('/api/content/admin/projects/a');
    await type('Contexte (FR)', 'Un.');
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
    await type('#edit-title-fr', 'Autre titre');
    expect(root.textContent).not.toContain('Titre déjà utilisé.');
    expect(root.textContent).toContain('Traduction refusée.');
    expect(root.textContent).toContain('Technologie refusée.');
    await type('Contexte (EN)', 'Another paragraph.');
    expect(root.textContent).not.toContain('Traduction refusée.');
    await enter(tech, 'angular,typescript');
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
