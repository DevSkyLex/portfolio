import type { Mock } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
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
import type { AdminFaqEntry } from '@vfortin/content-web-data-access/admin';
import { type ConfirmDialogOptions, ConfirmDialogService, ToastService } from '@vfortin/ui';
import { ADMIN_FAQ_ROUTES } from '@internal/content-web-feature-admin/lib/admin-faq.routes';

/**
 * Interface AdminFaqListDto
 *
 * @description
 * List as the API answers it (the feature reads no contract; the entries have the view model's
 * fields).
 */
interface AdminFaqListDto {
  readonly version: number;
  readonly member: AdminFaqEntry[];
  readonly totalItems: number;
}

/**
 * Constant API
 *
 * @description
 * FAQ administration endpoint.
 */
const API: string = '/api/content/admin/faq';

/**
 * Constant REBUILD
 *
 * @description
 * Site rebuild notice every FAQ write merges into its toast, since each one triggers a build.
 */
const REBUILD: string = 'Le site sera mis à jour automatiquement après les modifications.';

/**
 * Function entry
 *
 * @description
 * Builds a FAQ entry DTO.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 * @param {Partial<AdminFaqEntry>} overrides - Changed fields.
 *
 * @returns {AdminFaqEntry} Entry DTO.
 */
const entry = (
  id: string,
  position: number,
  overrides: Partial<AdminFaqEntry> = {},
): AdminFaqEntry => ({
  id,
  position,
  version: 2,
  question: { fr: `Question ${id}`, en: `Question ${id} (en)` },
  answer: { fr: `Réponse ${id}.\nSuite.`, en: `Answer ${id}.` },
  ...overrides,
});

/**
 * Function listOf
 *
 * @description
 * List DTO at the supplied list version.
 *
 * @param {number} version - List version.
 * @param {readonly AdminFaqEntry[]} member - Entries.
 *
 * @returns {AdminFaqListDto} List DTO.
 */
const listOf = (version: number, member: readonly AdminFaqEntry[]): AdminFaqListDto => ({
  version,
  member: [...member],
  totalItems: member.length,
});

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
 * Type and message of the queued toasts.
 *
 * @returns {[string, string][]} Toasts, oldest first.
 */
const toasts: () => [string, string][] = (): [string, string][] =>
  TestBed.inject<ToastService>(ToastService)
    .toasts()
    .map((toast): [string, string] => [toast.type, toast.message]);

/**
 * Function descriptions
 *
 * @description
 * Descriptions of the queued toasts.
 *
 * @returns {(string | undefined)[]} Descriptions, oldest first.
 */
const descriptions: () => (string | undefined)[] = (): (string | undefined)[] =>
  TestBed.inject<ToastService>(ToastService)
    .toasts()
    .map((toast): string | undefined => toast.description);

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
 * Mounts the FAQ routes as the shell will (`/admin/faq`) and opens a URL, in the French source build.
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
      provideRouter(
        [{ path: 'admin/faq', children: ADMIN_FAQ_ROUTES }],
        withComponentInputBinding(),
      ),
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
 * Function list
 *
 * @description
 * Opens the FAQ list and answers its load at list version 4.
 *
 * @param {readonly AdminFaqEntry[]} member - Entries.
 * @param {Provider[]} providers - Extra providers.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function list(member: readonly AdminFaqEntry[], providers: Provider[] = []): Promise<Opened> {
  const opened: Opened = await open('/admin/faq', providers);
  opened.backend.expectOne(`${API}/entries`).flush(listOf(4, member));
  await opened.settle();
  return opened;
}

/**
 * Function edit
 *
 * @description
 * Opens the editor of a question and answers its load.
 *
 * @param {AdminFaqEntry} current - Entry.
 * @param {Provider[]} providers - Extra providers.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function edit(current: AdminFaqEntry, providers: Provider[] = []): Promise<Opened> {
  const opened: Opened = await open(`/admin/faq/${current.id}`, providers);
  opened.backend.expectOne(`${API}/entries/${current.id}`).flush(current);
  await opened.settle();
  return opened;
}

/**
 * Function questions
 *
 * @description
 * Questions of the listed rows, in order.
 *
 * @param {HTMLElement} root - Page.
 *
 * @returns {string[]} Questions.
 */
const questions = (root: HTMLElement): string[] =>
  [...root.querySelectorAll('[data-slot="faq-row"] a')].map(
    (link: Element): string => link.textContent?.trim() ?? '',
  );

/**
 * Function menuItem
 *
 * @description
 * Opens a row's menu and returns its item with the label.
 *
 * @param {Opened} opened - Harness.
 * @param {number} row - Row index.
 * @param {string} label - Item label.
 *
 * @returns {Promise<HTMLButtonElement>} Item.
 */
async function menuItem(opened: Opened, row: number, label: string): Promise<HTMLButtonElement> {
  const trigger: HTMLButtonElement | null | undefined = opened
    .root()
    .querySelectorAll('[data-slot="faq-row"]')
    [row]?.querySelector<HTMLButtonElement>('button[aria-label^="Actions pour"]');
  if (!trigger) throw new Error(`row ${row} menu missing`);
  if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
  await opened.harness.fixture.whenStable();
  const found: HTMLButtonElement | undefined = [
    ...document.querySelectorAll<HTMLButtonElement>(
      '[data-slot="dropdown-menu-content"] [data-slot="dropdown-menu-item"]',
    ),
  ].find((item: HTMLElement): boolean => item.textContent?.trim() === label);
  if (!found) throw new Error(`${label} missing`);
  return found;
}

/**
 * Function button
 *
 * @description
 * Page button by visible label.
 *
 * @param {HTMLElement} root - Page.
 * @param {string} label - Label.
 *
 * @returns {HTMLButtonElement} Button.
 */
const button = (root: HTMLElement, label: string): HTMLButtonElement => {
  const found: HTMLButtonElement | undefined = [...root.querySelectorAll('button')].find(
    (b: HTMLButtonElement): boolean => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`${label} missing`);
  return found;
};

/**
 * Function showLanguage
 *
 * @description
 * Switches a localized field to a language with its joined selector.
 *
 * @param {Opened} opened - Harness.
 * @param {string} label - Field label.
 * @param {'fr' | 'en'} locale - Language.
 *
 * @returns {Promise<void>} Completion.
 */
async function showLanguage(opened: Opened, label: string, locale: 'fr' | 'en'): Promise<void> {
  const group: HTMLElement | null = opened
    .root()
    .querySelector<HTMLElement>(`[role="group"][aria-label="Langue du champ ${label}"]`);
  const found: HTMLButtonElement | undefined = [
    ...(group?.querySelectorAll<HTMLButtonElement>('button') ?? []),
  ].find((candidate: HTMLButtonElement): boolean =>
    (candidate.textContent ?? '').includes(locale === 'en' ? 'English' : 'Français'),
  );
  if (!found) throw new Error(`${label} ${locale} button missing`);
  found.click();
  await opened.settle();
}

/**
 * Function type
 *
 * @description
 * Types into a localized control by id, switching its field to the language first when needed.
 *
 * @param {Opened} opened - Harness.
 * @param {string} id - Control id (`edit-faq-<field>-<locale>`).
 * @param {string} value - Value.
 *
 * @returns {Promise<void>} Completion.
 */
async function type(opened: Opened, id: string, value: string): Promise<void> {
  const localized: RegExpExecArray | null = /^edit-faq-(question|answer)-(fr|en)$/.exec(id);
  if (localized && !opened.root().querySelector(`#${id}`)) {
    await showLanguage(
      opened,
      localized[1] === 'answer' ? 'Réponse' : 'Question',
      localized[2] === 'en' ? 'en' : 'fr',
    );
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
 * Function submit
 *
 * @description
 * Submits the editor form.
 *
 * @param {Opened} opened - Harness.
 *
 * @returns {Promise<void>} Completion.
 */
async function submit(opened: Opened): Promise<void> {
  opened
    .root()
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { cancelable: true }));
  await opened.settle();
}

/**
 * Function confirming
 *
 * @description
 * Confirmation service answering in turn, recording each question asked.
 *
 * @param {boolean[]} answers - Answers, in order (then `false`).
 * @param {ConfirmDialogOptions[]} asked - Receives the options of each confirmation.
 *
 * @returns {Provider} Provider of the confirmation service.
 */
const confirming = (answers: boolean[], asked: ConfirmDialogOptions[] = []): Provider => ({
  provide: ConfirmDialogService,
  useValue: {
    confirm: (options: ConfirmDialogOptions): Promise<boolean> => {
      asked.push(options);
      return Promise.resolve(answers.shift() ?? false);
    },
  },
});

describe('AdminFaqPageComponent', (): void => {
  it('titles the page with its count and lists the questions in their public order', async (): Promise<void> => {
    const opened: Opened = await list([entry('b', 1), entry('a', 0)]);
    const root: HTMLElement = opened.root();
    expect(root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'FAQ 2 questions',
    );
    expect(questions(root)).toEqual(['Question a', 'Question b']);
    expect(root.querySelector('[data-slot="faq-row"] p')?.textContent).toBe('Réponse a.\nSuite.');
    expect(root.querySelector('[data-slot="page-header-meta"]')?.textContent?.trim()).toBe(
      'Le site public affiche les questions dans cet ordre.',
    );
    expect(root.querySelector('a[href="/admin/faq/new"]')?.textContent?.trim()).toBe(
      'Nouvelle question',
    );
    expect(root.querySelector('a[href="/admin/faq/a"]')).not.toBeNull();
    expect(TestBed.inject(Title).getTitle()).toBe('FAQ — Administration');
    const bar: HTMLElement | null = root.querySelector('header');
    expect(bar?.firstElementChild?.tagName).toBe('UI-SIDEBAR-TRIGGER');
    expect(bar?.textContent?.trim()).toBe('FAQ');
    const grip: HTMLButtonElement | null = root.querySelector('button[uiSortableHandle]');
    expect(grip?.getAttribute('aria-label')).toBe('Déplacer « Question a »');
  });

  it('says when the FAQ is empty and offers the creation', async (): Promise<void> => {
    const opened: Opened = await list([]);
    const empty: HTMLElement | null = opened
      .root()
      .querySelector<HTMLElement>('[data-slot="empty"]');
    expect(empty?.querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Aucune question',
    );
    expect(empty?.querySelector('a[href="/admin/faq/new"]')?.textContent?.trim()).toBe(
      'Nouvelle question',
    );
    expect(opened.root().querySelector('[data-slot="faq-count"]')?.textContent?.trim()).toBe(
      '0 question',
    );
  });

  it('stores a keyboard move with the list version and keeps the focus on the moved grip', async (): Promise<void> => {
    const opened: Opened = await list([entry('a', 0), entry('b', 1), entry('c', 2)]);
    const grip: HTMLButtonElement | null = opened
      .root()
      .querySelector<HTMLButtonElement>('button[data-entry-handle="a"]');
    grip?.focus();
    grip?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await opened.settle();
    expect(questions(opened.root())).toEqual(['Question b', 'Question a', 'Question c']);
    const call: TestRequest = opened.backend.expectOne(`${API}/order`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"4"');
    expect(call.request.body).toEqual({ ids: ['b', 'a', 'c'] });
    call.flush(listOf(5, [entry('b', 0), entry('a', 1), entry('c', 2)]));
    await opened.settle();
    expect(document.activeElement?.getAttribute('data-entry-handle')).toBe('a');
    expect(toasts()).toEqual([['success', 'Ordre enregistré.']]);
    expect(descriptions()).toEqual([REBUILD]);
  });

  it('restores the order and reloads the list after a conflicting move', async (): Promise<void> => {
    const opened: Opened = await list([entry('a', 0), entry('b', 1)]);
    opened
      .root()
      .querySelector<HTMLButtonElement>('button[data-entry-handle="b"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await opened.settle();
    opened.backend
      .expectOne(`${API}/order`)
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await opened.settle();
    expect(toasts()).toEqual([
      ['warning', 'La liste a été modifiée entre-temps : elle a été rechargée, recommencez.'],
    ]);
    opened.backend.expectOne(`${API}/entries`).flush(listOf(6, [entry('c', 0), entry('a', 1)]));
    await opened.settle();
    expect(questions(opened.root())).toEqual(['Question c', 'Question a']);
  });

  it('deletes a row only once confirmed, with the entry version', async (): Promise<void> => {
    const asked: ConfirmDialogOptions[] = [];
    const opened: Opened = await list(
      [entry('a', 0), entry('b', 1)],
      [confirming([false, true], asked)],
    );
    (await menuItem(opened, 0, 'Supprimer')).click();
    await opened.settle();
    opened.backend.expectNone(`${API}/entries/a`);
    expect(asked[0]).toMatchObject({ title: 'Supprimer « Question a » ?', tone: 'danger' });

    (await menuItem(opened, 0, 'Supprimer')).click();
    await opened.settle();
    const call: TestRequest = opened.backend.expectOne(`${API}/entries/a`);
    expect(call.request.method).toBe('DELETE');
    expect(call.request.headers.get('if-match')).toBe('"2"');
    call.flush(listOf(5, [entry('b', 0)]));
    await opened.settle();
    expect(questions(opened.root())).toEqual(['Question b']);
    expect(toasts()).toEqual([['success', '« Question a » supprimée.']]);
    expect(descriptions()).toEqual([REBUILD]);
  });

  it('offers to retry a failed load', async (): Promise<void> => {
    const opened: Opened = await open('/admin/faq');
    opened.backend
      .expectOne(`${API}/entries`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await opened.settle();
    expect(opened.root().textContent).toContain('Impossible de charger les questions');
    button(opened.root(), 'Réessayer').click();
    await opened.settle();
    opened.backend.expectOne(`${API}/entries`).flush(listOf(4, [entry('a', 0)]));
    await opened.settle();
    expect(questions(opened.root())).toEqual(['Question a']);
  });
});

describe('AdminFaqEditPageComponent', (): void => {
  it('shows the question with a language selector per field, then saves it with If-Match', async (): Promise<void> => {
    const opened: Opened = await edit(entry('a', 0));
    const root: HTMLElement = opened.root();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Question a');
    expect(root.querySelector('header a[href]')?.textContent?.trim()).toBe('Toutes les questions');
    expect(root.textContent).toContain('Version 2');
    expect(
      [...root.querySelectorAll('[role="group"][aria-label^="Langue du champ"]')].map(
        (group: Element): string | null => group.getAttribute('aria-label'),
      ),
    ).toEqual(['Langue du champ Question', 'Langue du champ Réponse']);
    expect(root.querySelector<HTMLInputElement>('input#edit-faq-question-fr')?.value).toBe(
      'Question a',
    );
    expect(root.querySelector<HTMLTextAreaElement>('textarea#edit-faq-answer-fr')?.value).toBe(
      'Réponse a.\nSuite.',
    );
    expect(TestBed.inject(Title).getTitle()).toBe('Question a — FAQ — Administration');

    await type(opened, 'edit-faq-answer-fr', ' Oui.\nDès janvier. ');
    await submit(opened);
    const call: TestRequest = opened.backend.expectOne(`${API}/entries/a`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"2"');
    expect(call.request.body).toEqual({
      question: { fr: 'Question a', en: 'Question a (en)' },
      answer: { fr: 'Oui.\nDès janvier.', en: 'Answer a.' },
    });
    call.flush(
      entry('a', 0, { version: 3, answer: { fr: 'Oui.\nDès janvier.', en: 'Answer a.' } }),
    );
    await opened.settle();
    expect(root.textContent).toContain('Version 3');
    expect(toasts()).toEqual([['success', 'Enregistré.']]);
    expect(descriptions()).toEqual([REBUILD]);
  });

  it('refuses an empty English text before sending, and shows the field in English', async (): Promise<void> => {
    const opened: Opened = await edit(entry('a', 0));
    await type(opened, 'edit-faq-question-en', '  ');
    await showLanguage(opened, 'Question', 'fr');
    await submit(opened);
    opened.backend.expectNone(`${API}/entries/a`);
    expect(opened.root().querySelector('#edit-faq-question-en')?.getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(opened.root().textContent).toContain(
      'Le texte anglais est obligatoire : la question est publiée dès son enregistrement.',
    );
  });

  it('explains an English text refused by the API and keeps its error until it changes', async (): Promise<void> => {
    const opened: Opened = await edit(entry('a', 0));
    await type(opened, 'edit-faq-answer-en', 'Yes.');
    await submit(opened);
    opened.backend.expectOne(`${API}/entries/a`).flush(
      {
        code: 'content.faq-entry-incomplete',
        errors: [{ field: 'answer.en', message: 'Texte anglais refusé.' }],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await opened.settle();
    expect(toasts()).toEqual([['error', 'Complétez les deux langues.']]);
    expect(opened.root().textContent).toContain('Texte anglais refusé.');
    await type(opened, 'edit-faq-answer-en', 'Yes, from January.');
    expect(opened.root().textContent).not.toContain('Texte anglais refusé.');
  });

  it('offers to reload after a version conflict', async (): Promise<void> => {
    const opened: Opened = await edit(entry('a', 0));
    await type(opened, 'edit-faq-question-fr', 'Autre');
    await submit(opened);
    opened.backend
      .expectOne(`${API}/entries/a`)
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await opened.settle();
    expect(opened.root().textContent).toContain(
      'La question a été modifiée ailleurs depuis son ouverture.',
    );
    button(opened.root(), 'Recharger').click();
    await opened.settle();
    opened.backend.expectOne(`${API}/entries/a`).flush(entry('a', 0, { version: 5 }));
    await opened.settle();
    expect(opened.root().textContent).not.toContain('modifiée ailleurs');
    expect(opened.root().textContent).toContain('Version 5');
  });

  it('asks before leaving a dirty form', async (): Promise<void> => {
    const confirm: Mock<() => Promise<boolean>> = vi.fn((): Promise<boolean> =>
      Promise.resolve(false),
    );
    const opened: Opened = await edit(entry('a', 0), [
      { provide: ConfirmDialogService, useValue: { confirm } },
    ]);
    await type(opened, 'edit-faq-question-fr', 'Autre');
    await TestBed.inject(Router).navigateByUrl('/admin/faq');
    await opened.settle();
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Quitter sans enregistrer ?' }),
    );
    expect(TestBed.inject(Router).url).toBe('/admin/faq/a');
  });

  it('creates a question, then opens its address', async (): Promise<void> => {
    const opened: Opened = await open('/admin/faq/new');
    expect(opened.root().querySelector('h1')?.textContent?.trim()).toBe('Nouvelle question');
    expect(TestBed.inject(Title).getTitle()).toBe('Nouvelle question — FAQ — Administration');
    await type(opened, 'edit-faq-question-fr', 'Disponible ?');
    await type(opened, 'edit-faq-question-en', 'Available?');
    await type(opened, 'edit-faq-answer-fr', 'Oui.');
    await type(opened, 'edit-faq-answer-en', 'Yes.');
    await submit(opened);
    const call: TestRequest = opened.backend.expectOne(`${API}/entries`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({
      question: { fr: 'Disponible ?', en: 'Available?' },
      answer: { fr: 'Oui.', en: 'Yes.' },
    });
    call.flush(
      entry('n', 3, {
        version: 1,
        question: { fr: 'Disponible ?', en: 'Available?' },
        answer: { fr: 'Oui.', en: 'Yes.' },
      }),
    );
    await opened.settle();
    opened.backend
      .expectOne(`${API}/entries/n`)
      .flush(entry('n', 3, { version: 1, question: { fr: 'Disponible ?', en: 'Available?' } }));
    await opened.settle();
    expect(TestBed.inject(Router).url).toBe('/admin/faq/n');
    expect(toasts()).toEqual([['success', '« Disponible ? » ajoutée.']]);
  });

  it('deletes the question once confirmed, then returns to the list', async (): Promise<void> => {
    const opened: Opened = await edit(entry('a', 0), [confirming([true])]);
    button(opened.root(), 'Supprimer').click();
    await opened.settle();
    const call: TestRequest = opened.backend.expectOne(`${API}/entries/a`);
    expect(call.request.method).toBe('DELETE');
    call.flush(listOf(5, []));
    await opened.settle();
    expect(TestBed.inject(Router).url).toBe('/admin/faq');
    opened.backend.expectOne(`${API}/entries`).flush(listOf(5, []));
    expect(toasts()).toEqual([['success', '« Question a » supprimée.']]);
  });

  it('says the question cannot be found', async (): Promise<void> => {
    const opened: Opened = await open('/admin/faq/x');
    opened.backend
      .expectOne(`${API}/entries/x`)
      .flush({ code: 'content.not-found' }, { status: 404, statusText: 'Not Found' });
    await opened.settle();
    expect(opened.root().textContent).toContain('Question introuvable');
    expect(TestBed.inject(Title).getTitle()).toBe('Question introuvable — FAQ — Administration');
  });
});
