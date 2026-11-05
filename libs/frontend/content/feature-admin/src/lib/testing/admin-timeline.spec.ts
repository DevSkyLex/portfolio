import { PUBLICATION_TEST_PROVIDER } from '@internal/content-web-feature-admin/lib/testing/publication-test-provider';
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
import type { AdminTimelineEntry } from '@vfortin/content-web-data-access/admin';
import { type ConfirmDialogOptions, ConfirmDialogService, ToastService } from '@vfortin/ui';
import {
  ADMIN_EDUCATION_ROUTES,
  ADMIN_EXPERIENCE_ROUTES,
} from '@internal/content-web-feature-admin/lib/admin-timeline.routes';

/**
 * Type AdminTimelineEntryDto
 *
 * @description
 * Entry as the API answers it (the feature reads no contract; the view model has the same fields).
 */
type AdminTimelineEntryDto = Omit<AdminTimelineEntry, 'techs'> & { techs: string[] };

/**
 * Interface AdminTimelineListDto
 *
 * @description
 * List as the API answers it.
 */
interface AdminTimelineListDto {
  readonly kind: 'education' | 'experience';
  readonly version: number;
  readonly member: AdminTimelineEntryDto[];
  readonly totalItems: number;
}

/**
 * Constant API
 *
 * @description
 * Timeline administration endpoint.
 */
const API: string = '/api/content/admin/timeline';

/**
 * Function entry
 *
 * @description
 * Builds an experience DTO.
 *
 * @param {string} id - Identifier.
 * @param {number} position - Position.
 * @param {Partial<AdminTimelineEntryDto>} overrides - Changed fields.
 *
 * @returns {AdminTimelineEntryDto} Entry DTO.
 */
const entry = (
  id: string,
  position: number,
  overrides: Partial<AdminTimelineEntryDto> = {},
): AdminTimelineEntryDto => ({
  id,
  kind: 'experience',
  position,
  version: 2,
  title: { fr: `Poste ${id}`, en: `Job ${id}` },
  place: { fr: `Lieu ${id}`, en: `Place ${id}` },
  description: { fr: 'Interfaces.', en: 'Interfaces.' },
  start: { year: 2022, month: 1 },
  end: null,
  techs: ['angular', 'django', 'php', 'vue'],
  ...overrides,
});

/**
 * Function listOf
 *
 * @description
 * List DTO of experiences at the supplied list version.
 *
 * @param {number} version - List version.
 * @param {readonly AdminTimelineEntryDto[]} member - Entries.
 *
 * @returns {AdminTimelineListDto} List DTO.
 */
const listOf = (
  version: number,
  member: readonly AdminTimelineEntryDto[],
): AdminTimelineListDto => ({
  kind: 'experience',
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
 * Constant REBUILD
 *
 * @description
 * Site rebuild notice every timeline write merges into its toast, since each one triggers a build.
 */
const REBUILD: string =
  'Les modifications seront visibles après publication et reconstruction du site.';

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
 * Mounts the timeline routes as the shell will (`/admin/experiences`, `/admin/education`) and opens
 * a URL, in the French source build (`LOCALE_ID` `fr`: plural rules and collation of the source).
 *
 * @param {string} url - URL to open.
 * @param {Provider[]} providers - Extra providers.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function open(url: string, providers: Provider[] = []): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      PUBLICATION_TEST_PROVIDER,
      { provide: LOCALE_ID, useValue: 'fr' },
      ...providers,
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter(
        [
          { path: 'admin/experiences', children: ADMIN_EXPERIENCE_ROUTES },
          { path: 'admin/education', children: ADMIN_EDUCATION_ROUTES },
        ],
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
 * Opens the experience list and answers its load.
 *
 * @param {readonly AdminTimelineEntryDto[]} member - Entries.
 * @param {Provider[]} providers - Extra providers.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function list(
  member: readonly AdminTimelineEntryDto[],
  providers: Provider[] = [],
): Promise<Opened> {
  const opened: Opened = await open('/admin/experiences', providers);
  opened.backend.expectOne(`${API}/experience/entries`).flush(listOf(4, member));
  await opened.settle();
  return opened;
}

/**
 * Function places
 *
 * @description
 * Answers the editor's place loads: the lists of both kinds, which feed the « Lieu » suggestions.
 *
 * @param {Opened} opened - Harness.
 * @param {readonly AdminTimelineEntryDto[]} experience - Experiences.
 * @param {readonly AdminTimelineEntryDto[]} education - Education entries.
 *
 * @returns {Promise<void>} Completion.
 */
async function places(
  opened: Opened,
  experience: readonly AdminTimelineEntryDto[] = [],
  education: readonly AdminTimelineEntryDto[] = [],
): Promise<void> {
  opened.backend
    .expectOne({ method: 'GET', url: `${API}/experience/entries` })
    .flush(listOf(4, experience));
  opened.backend
    .expectOne({ method: 'GET', url: `${API}/education/entries` })
    .flush({ ...listOf(1, education), kind: 'education' });
  await opened.settle();
}

/**
 * Function suggestions
 *
 * @description
 * Options the autocomplete of a field shows, in order; none while its list is closed.
 *
 * @param {Opened} opened - Harness.
 * @param {string} id - Field id.
 *
 * @returns {string[]} Option labels.
 */
function suggestions(opened: Opened, id: string): string[] {
  const listbox: string | null | undefined = opened
    .root()
    .querySelector(`#${id}`)
    ?.getAttribute('aria-controls');
  const list: HTMLElement | null = listbox ? document.getElementById(listbox) : null;
  return [...(list?.querySelectorAll('[role="option"]') ?? [])].map(
    (option: Element): string => option.textContent?.trim() ?? '',
  );
}

/**
 * Function edit
 *
 * @description
 * Opens the editor of an experience and answers its load.
 *
 * @param {AdminTimelineEntryDto} current - Entry.
 * @param {Provider[]} providers - Extra providers.
 *
 * @returns {Promise<Opened>} Harness.
 */
async function edit(current: AdminTimelineEntryDto, providers: Provider[] = []): Promise<Opened> {
  const opened: Opened = await open(`/admin/experiences/${current.id}`, providers);
  opened.backend.expectOne(`${API}/experience/entries/${current.id}`).flush(current);
  await places(opened);
  return opened;
}

/**
 * Function rows
 *
 * @description
 * Text of each table row, whitespace collapsed.
 *
 * @param {HTMLElement} root - Page.
 *
 * @returns {string[]} Rows.
 */
const rows = (root: HTMLElement): string[] =>
  [...root.querySelectorAll('tbody tr')].map(
    (row: Element): string => row.textContent?.replace(/\s+/g, ' ').trim() ?? '',
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
    .querySelectorAll('tbody tr')
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
 * Function boxes
 *
 * @description
 * Row selection checkboxes, in row order.
 *
 * @param {HTMLElement} root - Page.
 *
 * @returns {HTMLInputElement[]} Checkbox inputs.
 */
const boxes = (root: HTMLElement): HTMLInputElement[] => [
  ...root.querySelectorAll<HTMLInputElement>('tbody ui-checkbox input'),
];

/**
 * Function facet
 *
 * @description
 * Opens or closes a facet of the table toolbar by its label.
 *
 * @param {Opened} opened - Harness.
 * @param {string} label - Facet label.
 *
 * @returns {Promise<void>} Completion.
 */
async function facet(opened: Opened, label: string): Promise<void> {
  const trigger: HTMLButtonElement | undefined = [
    ...opened
      .root()
      .querySelectorAll<HTMLButtonElement>('[data-slot="data-table-facet-filter"] button'),
  ].find((candidate: HTMLButtonElement): boolean => candidate.textContent?.trim() === label);
  if (!trigger) throw new Error(`${label} facet missing`);
  trigger.click();
  await opened.settle();
}

/**
 * Function facetOptions
 *
 * @description
 * Options of an open facet panel, as `label count`.
 *
 * @param {string} label - Facet label.
 *
 * @returns {string[]} Options, in panel order.
 */
const facetOptions = (label: string): string[] =>
  [
    ...document.querySelectorAll<HTMLLabelElement>(
      `[data-slot="popover-content"][aria-label="Filtrer par ${label}"] label`,
    ),
  ].map((option: HTMLLabelElement): string =>
    [...option.querySelectorAll('span')]
      .map((part: Element): string => part.textContent?.trim() ?? '')
      .join(' '),
  );

/**
 * Function checkOption
 *
 * @description
 * Checks or unchecks an option of an open facet panel by its label.
 *
 * @param {Opened} opened - Harness.
 * @param {string} label - Facet label.
 * @param {string} option - Option label.
 *
 * @returns {Promise<void>} Completion.
 */
async function checkOption(opened: Opened, label: string, option: string): Promise<void> {
  const found: HTMLLabelElement | undefined = [
    ...document.querySelectorAll<HTMLLabelElement>(
      `[data-slot="popover-content"][aria-label="Filtrer par ${label}"] label`,
    ),
  ].find(
    (candidate: HTMLLabelElement): boolean =>
      candidate.querySelector('span')?.textContent?.trim() === option,
  );
  if (!found) throw new Error(`${label} ${option} missing`);
  found.click();
  await opened.settle();
}

/**
 * Function search
 *
 * @description
 * Types a query into the table search.
 *
 * @param {Opened} opened - Harness.
 * @param {string} query - Query.
 *
 * @returns {Promise<void>} Completion.
 */
async function search(opened: Opened, query: string): Promise<void> {
  const field: HTMLInputElement | null = opened
    .root()
    .querySelector<HTMLInputElement>('input[type="search"]');
  if (!field) throw new Error('search missing');
  field.value = query;
  field.dispatchEvent(new Event('input'));
  await opened.settle();
}

/**
 * Function titles
 *
 * @description
 * Titles of the listed rows, in order.
 *
 * @param {HTMLElement} root - Page.
 *
 * @returns {string[]} Titles.
 */
const titles = (root: HTMLElement): string[] =>
  [...root.querySelectorAll('tbody tr a[href^="/admin/"]')].map(
    (link: Element): string => link.textContent?.trim() ?? '',
  );

/**
 * Function chips
 *
 * @description
 * Active filter chips, whitespace collapsed.
 *
 * @param {HTMLElement} root - Page.
 *
 * @returns {string[]} Chips, in facet order.
 */
const chips = (root: HTMLElement): string[] =>
  [...root.querySelectorAll('[data-slot="data-table-filter-chip"]')].map(
    (chip: Element): string => chip.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );

/**
 * Function confirming
 *
 * @description
 * Confirmation service stub recording the asked options and answering in turn.
 *
 * @param {ConfirmDialogOptions[]} asked - Receives the options of each confirmation.
 * @param {boolean[]} answers - Answers, in order; `false` once exhausted.
 *
 * @returns {Provider} Provider of the stub.
 */
const confirming = (asked: ConfirmDialogOptions[], answers: boolean[]): Provider => ({
  provide: ConfirmDialogService,
  useValue: {
    confirm: (options: ConfirmDialogOptions): Promise<boolean> => {
      asked.push(options);
      return Promise.resolve(answers.shift() ?? false);
    },
  },
});

/**
 * Constant FIELD_LABELS
 *
 * @description
 * Label of each localized field, which names its language selector.
 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  title: 'Intitulé',
  place: 'Lieu',
  description: 'Description',
};

/**
 * Function showLanguage
 *
 * @description
 * Shows a localized field in a language through the flag toggle joined to it.
 *
 * @param {Opened} opened - Harness.
 * @param {string} key - Field (`title`, `place`, `description`).
 * @param {'fr' | 'en'} locale - Language.
 *
 * @returns {Promise<void>} Completion.
 */
async function showLanguage(opened: Opened, key: string, locale: 'fr' | 'en'): Promise<void> {
  const group: HTMLElement | null = opened
    .root()
    .querySelector<HTMLElement>(
      `[role="group"][aria-label="Langue du champ ${FIELD_LABELS[key]}"]`,
    );
  const button: HTMLButtonElement | undefined = [
    ...(group?.querySelectorAll<HTMLButtonElement>('button') ?? []),
  ].find((candidate: HTMLButtonElement): boolean =>
    (candidate.textContent ?? '').includes(locale === 'en' ? 'English' : 'Français'),
  );
  if (!button) throw new Error(`${key} ${locale} button missing`);
  button.click();
  await opened.settle();
}

/**
 * Function type
 *
 * @description
 * Types into a control by id.
 *
 * @param {Opened} opened - Harness.
 * @param {string} id - Control id.
 * @param {string} value - Value.
 *
 * @returns {Promise<void>} Completion.
 */
async function type(opened: Opened, id: string, value: string): Promise<void> {
  // A localized field shows one language: switch it when the other one is shown.
  const localized: RegExpExecArray | null =
    /^edit-timeline-(title|place|description)-(fr|en)$/.exec(id);
  if (localized && !opened.root().querySelector(`#${id}`)) {
    await showLanguage(opened, localized[1] ?? '', localized[2] === 'en' ? 'en' : 'fr');
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
 * Function pickPeriod
 *
 * @description
 * Opens the period picker, sets « En cours » as asked, and chooses each month (`yyyy-mm`),
 * paging through the years until the month shows.
 *
 * @param {Opened} opened - Harness.
 * @param {readonly string[]} months - Months to choose, in order.
 * @param {boolean} ongoing - Wanted state of « En cours » before the choices.
 *
 * @returns {Promise<void>} Completion.
 */
async function pickPeriod(
  opened: Opened,
  months: readonly string[],
  ongoing: boolean = false,
): Promise<void> {
  opened.root().querySelector<HTMLButtonElement>('#edit-timeline-period')?.click();
  await opened.settle();
  const dialog = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
  const option: HTMLInputElement | null | undefined =
    dialog()?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (option && option.checked !== ongoing) {
    option.click();
    await opened.settle();
  }
  for (const month of months) {
    const year: number = Number(month.slice(0, 4));
    for (
      let page: number = 0;
      page < 40 && !dialog()?.querySelector(`[data-cell="${month}"]`);
      page++
    ) {
      const shown: number = Number(dialog()?.querySelector('[aria-live][id]')?.textContent?.trim());
      dialog()
        ?.querySelector<HTMLButtonElement>(
          shown > year ? '[aria-label="Année précédente"]' : '[aria-label="Année suivante"]',
        )
        ?.click();
      await opened.settle();
    }
    const cell: HTMLButtonElement | null | undefined = dialog()?.querySelector<HTMLButtonElement>(
      `[data-cell="${month}"]`,
    );
    if (!cell) throw new Error(`${month} missing`);
    cell.click();
    await opened.settle();
  }
}

/**
 * Function submit
 *
 * @description
 * Submits the entry form.
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

describe('AdminTimelinePageComponent', (): void => {
  it('titles the page with its count and lists period, title, place and technologies', async (): Promise<void> => {
    const opened: Opened = await list([
      entry('oaas', 0),
      entry('kodoka', 1, { start: { year: 2023, month: 3 }, end: { year: 2023, month: 4 } }),
    ]);
    const root: HTMLElement = opened.root();
    expect(root.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Expériences 2 expériences',
    );
    // Most recent start first, whatever the API order (by position).
    expect(rows(root)[0]).toContain('mars 2023 – avr. 2023');
    expect(rows(root)[0]).toContain('Poste kodoka');
    expect(rows(root)[1]).toContain('janv. 2022 – aujourd’hui');
    expect(rows(root)[1]).toContain('Poste oaas');
    expect(rows(root)[1]).toContain('Lieu oaas');
    expect(rows(root)[1]).toContain('+1');
    // No manual order, so no sentence about it under the title.
    expect(root.querySelector('[data-slot="page-header-meta"]')).toBeNull();
    const create: HTMLAnchorElement | null = root.querySelector('a[href="/admin/experiences/new"]');
    expect(create?.textContent?.trim()).toBe('Nouvelle expérience');
    expect(TestBed.inject(Title).getTitle()).toBe('Expériences — Administration');
    // The 48 px bar names the section and starts with the layout's sidebar toggle.
    const bar: HTMLElement | null = root.querySelector('header');
    expect(bar?.firstElementChild?.tagName).toBe('UI-SIDEBAR-TRIGGER');
    expect(bar?.textContent?.trim()).toBe('Expériences');
    opened.backend.verify();
  });

  it('says when the list is empty, in the singular for zero, and offers the creation', async (): Promise<void> => {
    const opened: Opened = await list([]);
    const empty: HTMLElement | null = opened
      .root()
      .querySelector<HTMLElement>('[data-slot="empty"]');
    expect(empty?.querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Aucune expérience',
    );
    expect(empty?.querySelector('[data-slot="empty-description"]')?.textContent?.trim()).toBe(
      'Les expériences ajoutées ici apparaissent sur le site public, placées par date.',
    );
    // Nothing follows the table on the page: the empty state fills the rest of the column, centred.
    expect(empty?.dataset['layout']).toBe('fill');
    expect(empty?.classList).toContain('justify-center');
    expect(empty?.classList).toContain('text-center');
    expect(empty?.querySelector('a[href="/admin/experiences/new"]')?.textContent?.trim()).toBe(
      'Nouvelle expérience',
    );
    expect(opened.root().querySelector('[data-slot="timeline-count"]')?.textContent?.trim()).toBe(
      '0 expérience',
    );
  });

  it('sorts by start date, an ongoing entry first on the same start, then the later end', async (): Promise<void> => {
    const opened: Opened = await list([
      entry('bts', 0, { start: { year: 2021, month: 9 }, end: { year: 2023, month: 6 } }),
      entry('short', 1, { start: { year: 2023, month: 9 }, end: { year: 2023, month: 12 } }),
      entry('long', 2, { start: { year: 2023, month: 9 }, end: { year: 2026, month: 6 } }),
      entry('current', 3, { start: { year: 2023, month: 9 }, end: null }),
      entry('latest', 4, { start: { year: 2024, month: 9 }, end: { year: 2025, month: 6 } }),
    ]);
    expect(
      [...opened.root().querySelectorAll('tbody tr a[href^="/admin/experiences/"]')].map(
        (link: Element): string => link.textContent?.trim() ?? '',
      ),
    ).toEqual(['Poste latest', 'Poste current', 'Poste long', 'Poste short', 'Poste bts']);
  });

  it('selects rows with checkboxes, offering only the deletion, cleared by Escape', async (): Promise<void> => {
    const opened: Opened = await list([entry('a', 0), entry('b', 1), entry('c', 2)]);
    const root: HTMLElement = opened.root();
    const bar = (): HTMLElement | null => root.querySelector('[data-slot="selection-bar-panel"]');
    const count = (): string | undefined =>
      root.querySelector('[data-slot="selection-bar-count"]')?.textContent?.trim();
    expect(bar()).toBeNull();
    expect(boxes(root)[0]?.getAttribute('aria-label')).toBe('Sélectionner Poste a');
    boxes(root)[0]?.click();
    await opened.settle();
    expect(bar()?.getAttribute('aria-label')).toBe('Actions sur la sélection');
    expect(count()).toBe('1 sélectionnée');
    // The list follows the dates: no « Monter en tête » or « Descendre en fin ».
    expect(
      [...root.querySelectorAll<HTMLButtonElement>('[data-bulk-action]')].map(
        (b: HTMLButtonElement): string => `${b.dataset['bulkAction']} ${b.textContent?.trim()}`,
      ),
    ).toEqual(['delete Supprimer']);
    expect(root.querySelector<HTMLButtonElement>('[data-bulk-action="delete"]')?.disabled).toBe(
      false,
    );
    boxes(root)[2]?.click();
    await opened.settle();
    expect(count()).toBe('2 sélectionnées');
    boxes(root)[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await opened.settle();
    expect(bar()).toBeNull();
    expect(boxes(root).some((box: HTMLInputElement): boolean => box.checked)).toBe(false);
  });

  it('deletes the selection one by one with each entry version, after one danger confirmation', async (): Promise<void> => {
    const asked: ConfirmDialogOptions[] = [];
    const opened: Opened = await list(
      [entry('a', 0), entry('b', 1, { version: 7 }), entry('c', 2)],
      [confirming(asked, [false, true])],
    );
    const root: HTMLElement = opened.root();
    boxes(root)[0]?.click();
    boxes(root)[1]?.click();
    await opened.settle();
    root.querySelector<HTMLButtonElement>('[data-bulk-action="delete"]')?.click();
    await opened.settle();
    expect(asked[0]).toMatchObject({
      title: 'Supprimer 2 expériences ?',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    expect(asked[0]?.description).toContain('Elles disparaîtront du site public');
    opened.backend.expectNone(`${API}/experience/entries/a`);

    root.querySelector<HTMLButtonElement>('[data-bulk-action="delete"]')?.click();
    await opened.settle();
    const first: TestRequest = opened.backend.expectOne(`${API}/experience/entries/a`);
    expect(first.request.method).toBe('DELETE');
    expect(first.request.headers.get('if-match')).toBe('"2"');
    // Sequential: the second deletion waits for the first answer.
    opened.backend.expectNone(`${API}/experience/entries/b`);
    first.flush(listOf(5, [entry('b', 0, { version: 7 }), entry('c', 1)]));
    await opened.settle();
    const second: TestRequest = opened.backend.expectOne(`${API}/experience/entries/b`);
    expect(second.request.headers.get('if-match')).toBe('"7"');
    second.flush(listOf(6, [entry('c', 0)]));
    await opened.settle();
    expect(toasts()).toEqual([['success', '2 expériences supprimées.']]);
    expect(descriptions()).toEqual([REBUILD]);
    expect(rows(root)).toHaveLength(1);
    expect(root.querySelector('[data-slot="selection-bar-panel"]')).toBeNull();
  });

  it('confirms a single deletion by its title and counts it in the singular', async (): Promise<void> => {
    const asked: ConfirmDialogOptions[] = [];
    const opened: Opened = await open('/admin/education', [confirming(asked, [true])]);
    opened.backend
      .expectOne(`${API}/education/entries`)
      .flush({ ...listOf(1, [entry('bts', 0, { kind: 'education' })]), kind: 'education' });
    await opened.settle();
    boxes(opened.root())[0]?.click();
    await opened.settle();
    opened.root().querySelector<HTMLButtonElement>('[data-bulk-action="delete"]')?.click();
    await opened.settle();
    expect(asked[0]?.title).toBe('Supprimer « Poste bts » ?');
    expect(asked[0]?.description).toContain('Elle disparaîtra du site public');
    opened.backend
      .expectOne(`${API}/education/entries/bts`)
      .flush({ ...listOf(2, []), kind: 'education' });
    await opened.settle();
    expect(toasts()).toEqual([['success', '1 formation supprimée.']]);
    // The emptied list shows its empty state with the creation.
    expect(opened.root().querySelector('[data-slot="empty-title"]')?.textContent?.trim()).toBe(
      'Aucune formation',
    );
  });

  it('reports a partial deletion, reloads after a conflict and keeps the failed entry selected', async (): Promise<void> => {
    const opened: Opened = await list(
      [entry('a', 0), entry('b', 1), entry('c', 2)],
      [confirming([], [true])],
    );
    const root: HTMLElement = opened.root();
    boxes(root)[0]?.click();
    boxes(root)[1]?.click();
    await opened.settle();
    root.querySelector<HTMLButtonElement>('[data-bulk-action="delete"]')?.click();
    await opened.settle();
    opened.backend
      .expectOne(`${API}/experience/entries/a`)
      .flush(listOf(5, [entry('b', 0), entry('c', 1)]));
    await opened.settle();
    opened.backend
      .expectOne(`${API}/experience/entries/b`)
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await opened.settle();
    opened.backend
      .expectOne(`${API}/experience/entries`)
      .flush(listOf(6, [entry('b', 0, { version: 3 }), entry('c', 1)]));
    await opened.settle();
    expect(toasts()).toEqual([['warning', '1 expérience supprimée sur 2.']]);
    expect(descriptions()).toEqual([
      `1 échec : Une expérience a été modifiée entre-temps : la liste a été rechargée, recommencez. ${REBUILD}`,
    ]);
    expect(root.querySelector('[data-slot="selection-bar-count"]')?.textContent?.trim()).toBe(
      '1 sélectionnée',
    );
    expect(root.querySelector('tbody tr[data-state="selected"] a')?.textContent).toBe('Poste b');
  });

  it('reports a deletion that failed for every entry as an error', async (): Promise<void> => {
    const opened: Opened = await list([entry('a', 0)], [confirming([], [true])]);
    boxes(opened.root())[0]?.click();
    await opened.settle();
    opened.root().querySelector<HTMLButtonElement>('[data-bulk-action="delete"]')?.click();
    await opened.settle();
    opened.backend
      .expectOne(`${API}/experience/entries/a`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await opened.settle();
    expect(toasts()).toEqual([['error', 'Aucune expérience supprimée sur 1.']]);
    expect(descriptions()).toEqual([
      '1 échec : Le service ne répond pas. Réessayez dans un moment.',
    ]);
    opened.backend.expectNone(`${API}/experience/entries`);
  });

  it('offers no manual order: the row menu edits or deletes, Alt+↑ and Alt+↓ send nothing', async (): Promise<void> => {
    const opened: Opened = await list([entry('a', 0), entry('b', 1)]);
    await menuItem(opened, 1, 'Modifier');
    expect(
      [
        ...document.querySelectorAll<HTMLElement>(
          '[data-slot="dropdown-menu-content"] [data-slot="dropdown-menu-item"]',
        ),
      ].map((item: HTMLElement): string => item.textContent?.trim() ?? ''),
    ).toEqual(['Modifier', 'Supprimer']);
    const link: HTMLAnchorElement | null = opened
      .root()
      .querySelector<HTMLAnchorElement>('tbody tr a[href="/admin/experiences/b"]');
    expect(link?.hasAttribute('aria-keyshortcuts')).toBe(false);
    for (const key of ['ArrowUp', 'ArrowDown']) {
      link?.dispatchEvent(new KeyboardEvent('keydown', { key, altKey: true }));
    }
    await opened.settle();
    opened.backend.expectNone(`${API}/experience/order`);
    opened.backend.verify();
  });

  it('deletes a row only once confirmed, with the entry version', async (): Promise<void> => {
    const asked: ConfirmDialogOptions[] = [];
    const answers: boolean[] = [false, true];
    const opened: Opened = await list(
      [entry('a', 0), entry('b', 1)],
      [
        {
          provide: ConfirmDialogService,
          useValue: {
            confirm: (options: ConfirmDialogOptions): Promise<boolean> => {
              asked.push(options);
              return Promise.resolve(answers.shift() ?? false);
            },
          },
        },
      ],
    );
    (await menuItem(opened, 0, 'Supprimer')).click();
    await opened.settle();
    opened.backend.expectNone(`${API}/experience/entries/a`);
    expect(asked[0]).toMatchObject({ title: 'Supprimer « Poste a » ?', tone: 'danger' });

    (await menuItem(opened, 0, 'Supprimer')).click();
    await opened.settle();
    const call: TestRequest = opened.backend.expectOne(`${API}/experience/entries/a`);
    expect(call.request.method).toBe('DELETE');
    expect(call.request.headers.get('if-match')).toBe('"2"');
    call.flush(listOf(5, [entry('b', 0)]));
    await opened.settle();
    expect(rows(opened.root())).toHaveLength(1);
    expect(toasts()).toEqual([['success', '« Poste a » supprimée.']]);
    expect(descriptions()).toEqual([REBUILD]);
  });

  it('offers to retry a failed load, and toasts a refused deletion without reloading', async (): Promise<void> => {
    const opened: Opened = await open('/admin/experiences', [
      {
        provide: ConfirmDialogService,
        useValue: { confirm: (): Promise<boolean> => Promise.resolve(true) },
      },
    ]);
    opened.backend
      .expectOne(`${API}/experience/entries`)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    await opened.settle();
    expect(opened.root().textContent).toContain('Impossible de charger les expériences');
    button(opened.root(), 'Réessayer').click();
    await opened.settle();
    opened.backend.expectOne(`${API}/experience/entries`).flush(listOf(4, [entry('a', 0)]));
    await opened.settle();
    expect(rows(opened.root())).toHaveLength(1);

    (await menuItem(opened, 0, 'Supprimer')).click();
    await opened.settle();
    opened.backend
      .expectOne(`${API}/experience/entries/a`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await opened.settle();
    expect(toasts()).toEqual([['error', 'Le service ne répond pas. Réessayez dans un moment.']]);
    opened.backend.expectNone(`${API}/experience/entries`);
  });

  it('offers « État », « Lieu » and « Technos » facets whose options come from the rows', async (): Promise<void> => {
    const opened: Opened = await list([
      entry('oaas', 0, { place: { fr: 'Tours', en: 'Tours' }, techs: ['php', 'angular'] }),
      entry('kodoka', 1, {
        place: { fr: 'Paris', en: 'Paris' },
        techs: ['vue'],
        end: { year: 2023, month: 6 },
      }),
      entry('bts', 2, {
        place: { fr: ' tours ', en: 'Tours' },
        techs: ['angular'],
        start: { year: 2021, month: 9 },
        end: { year: 2023, month: 6 },
      }),
    ]);
    const root: HTMLElement = opened.root();
    expect(
      [
        ...root.querySelectorAll<HTMLButtonElement>('[data-slot="data-table-facet-filter"] button'),
      ].map((b: HTMLButtonElement): string => b.textContent?.trim() ?? ''),
    ).toEqual(['État', 'Lieu', 'Technos']);
    // The column menu stays off: the facets are the toolbar's only buttons.
    expect(root.querySelector('[data-slot="data-table-toolbar"]')?.textContent).not.toContain(
      'Colonnes',
    );

    await facet(opened, 'État');
    expect(facetOptions('État')).toEqual(['En cours 1', 'Terminée 2']);
    await facet(opened, 'État');
    // One option per place whatever its case or spacing, the first spelling kept, in French order.
    await facet(opened, 'Lieu');
    expect(facetOptions('Lieu')).toEqual(['Paris 1', 'Tours 2']);
    await facet(opened, 'Lieu');
    await facet(opened, 'Technos');
    expect(facetOptions('Technos')).toEqual(['angular 2', 'php 1', 'vue 1']);
  });

  it('filters by the checked facets, combined with the search, and clears them from their chips', async (): Promise<void> => {
    const opened: Opened = await list([
      entry('oaas', 0, { place: { fr: 'Tours', en: 'Tours' }, techs: ['php', 'angular'] }),
      entry('kodoka', 1, {
        place: { fr: 'Paris', en: 'Paris' },
        techs: ['vue'],
        end: { year: 2023, month: 6 },
      }),
      entry('bts', 2, {
        place: { fr: 'tours', en: 'Tours' },
        techs: ['angular'],
        start: { year: 2021, month: 9 },
        end: { year: 2023, month: 6 },
      }),
    ]);
    const root: HTMLElement = opened.root();
    await facet(opened, 'Lieu');
    await checkOption(opened, 'Lieu', 'Tours');
    await facet(opened, 'Lieu');
    expect(titles(root)).toEqual(['Poste oaas', 'Poste bts']);
    expect(chips(root)).toEqual(['Lieu : Tours']);

    await facet(opened, 'État');
    await checkOption(opened, 'État', 'Terminée');
    await facet(opened, 'État');
    expect(titles(root)).toEqual(['Poste bts']);
    expect(chips(root)).toEqual(['État : Terminée', 'Lieu : Tours']);

    // The search narrows within the facets.
    await search(opened, 'angular');
    expect(titles(root)).toEqual(['Poste bts']);
    await search(opened, 'vue');
    expect(titles(root)).toEqual([]);
    expect(root.textContent).toContain('Aucune expérience trouvée');
    expect(root.textContent).toContain(
      'Aucune expérience ne correspond à la recherche ou aux filtres.',
    );
    await search(opened, '');

    // Several technologies: a row matches when it has one of them.
    root
      .querySelector<HTMLButtonElement>('button[aria-label="Retirer le filtre Lieu : Tours"]')
      ?.click();
    await opened.settle();
    root
      .querySelector<HTMLButtonElement>('button[aria-label="Retirer le filtre État : Terminée"]')
      ?.click();
    await opened.settle();
    expect(titles(root)).toEqual(['Poste oaas', 'Poste kodoka', 'Poste bts']);
    await facet(opened, 'Technos');
    await checkOption(opened, 'Technos', 'php');
    await checkOption(opened, 'Technos', 'vue');
    await facet(opened, 'Technos');
    expect(titles(root)).toEqual(['Poste oaas', 'Poste kodoka']);
    expect(chips(root)).toEqual(['Technos : php', 'Technos : vue']);
    await search(opened, 'paris');
    expect(titles(root)).toEqual(['Poste kodoka']);
  });

  it('lists the education entries on its own route', async (): Promise<void> => {
    const opened: Opened = await open('/admin/education');
    opened.backend
      .expectOne(`${API}/education/entries`)
      .flush({ ...listOf(1, []), kind: 'education' });
    await opened.settle();
    expect(opened.root().querySelector('h1')?.textContent).toContain('Formations');
    expect(opened.root().textContent).toContain('Nouvelle formation');
  });
});

describe('AdminTimelineEditPageComponent', (): void => {
  it('shows the entry with its language tabs and properties, then saves it with If-Match', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0));
    const root: HTMLElement = opened.root();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Poste oaas');
    const bar: HTMLElement | null = root.querySelector('header');
    expect(bar?.firstElementChild?.tagName).toBe('UI-SIDEBAR-TRIGGER');
    expect(bar?.querySelector('a[href]')?.textContent?.trim()).toBe('Toutes les expériences');
    expect(root.textContent).toContain('janv. 2022 – aujourd’hui');
    expect(root.textContent).toContain('Version 2');
    // No language tabs: each localized field has its own selector, French first.
    expect(root.querySelector('[role="tab"]')).toBeNull();
    expect(
      [...root.querySelectorAll('[role="group"][aria-label^="Langue du champ"]')].map(
        (group: Element): string =>
          `${group.getAttribute('aria-label')} : ${group.querySelector('[aria-pressed="true"] [lang]')?.textContent}`,
      ),
    ).toEqual([
      'Langue du champ Intitulé : Français',
      'Langue du champ Lieu : Français',
      'Langue du champ Description : Français',
    ]);
    expect(root.querySelector('#edit-timeline-title-en')).toBeNull();
    expect(root.querySelector<HTMLInputElement>('#edit-timeline-title-fr')?.value).toBe(
      'Poste oaas',
    );
    expect(root.querySelector('aside[aria-label="Propriétés"]')).not.toBeNull();
    const period: HTMLButtonElement | null = root.querySelector('#edit-timeline-period');
    expect(period?.getAttribute('aria-labelledby')).toBe(
      'edit-timeline-period-label edit-timeline-period',
    );
    expect(period?.getAttribute('aria-required')).toBe('true');
    expect(period?.textContent).toContain('2022');

    await type(opened, 'edit-timeline-place-fr', 'Paris');
    await submit(opened);
    const call: TestRequest = opened.backend.expectOne(`${API}/experience/entries/oaas`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.headers.get('if-match')).toBe('"2"');
    expect(call.request.body).toMatchObject({
      place: { fr: 'Paris', en: 'Place oaas' },
      start: { year: 2022, month: 1 },
      end: null,
    });
    call.flush(entry('oaas', 0, { version: 3, place: { fr: 'Paris', en: 'Place oaas' } }));
    await opened.settle();
    expect(root.textContent).toContain('Version 3');
    expect(toasts()).toEqual([['success', 'Enregistré.']]);
    expect(descriptions()).toEqual([REBUILD]);
    expect(TestBed.inject(Title).getTitle()).toBe('Poste oaas — Expériences — Administration');
  });

  it('refuses an empty English text before sending, and shows the field in English', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0));
    await type(opened, 'edit-timeline-title-en', '  ');
    await showLanguage(opened, 'title', 'fr');
    await submit(opened);
    opened.backend.expectNone(`${API}/experience/entries/oaas`);
    const field: HTMLInputElement | null = opened
      .root()
      .querySelector<HTMLInputElement>('#edit-timeline-title-en');
    expect(field?.getAttribute('aria-invalid')).toBe('true');
    expect(opened.root().textContent).toContain(
      'Le texte anglais est obligatoire : l’entrée est publiée dès son enregistrement.',
    );
    expect(
      opened
        .root()
        .querySelector('[aria-label="Langue du champ Intitulé"] [aria-pressed="true"] [lang]')
        ?.textContent,
    ).toBe('English');
  });

  it('keeps a refused field error on its field until the value changes', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0));
    await type(opened, 'edit-timeline-title-fr', 'Développeur');
    await submit(opened);
    opened.backend
      .expectOne(`${API}/experience/entries/oaas`)
      .flush(
        { code: 'request.invalid', errors: [{ field: 'title.fr', message: 'Titre refusé.' }] },
        { status: 400, statusText: 'Bad Request' },
      );
    await opened.settle();
    expect(opened.root().textContent).toContain('Titre refusé.');
    await type(opened, 'edit-timeline-title-fr', 'Développeur web');
    expect(opened.root().textContent).not.toContain('Titre refusé.');
  });

  it('offers to reload after a version conflict', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0));
    await type(opened, 'edit-timeline-title-fr', 'Autre');
    await submit(opened);
    opened.backend
      .expectOne(`${API}/experience/entries/oaas`)
      .flush(
        { code: 'content.version-mismatch' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    await opened.settle();
    expect(opened.root().textContent).toContain(
      'L’entrée a été modifiée ailleurs depuis son ouverture.',
    );
    expect(toasts()).toEqual([]);
    button(opened.root(), 'Recharger').click();
    await opened.settle();
    opened.backend
      .expectOne(`${API}/experience/entries/oaas`)
      .flush(entry('oaas', 0, { version: 5 }));
    await opened.settle();
    expect(opened.root().textContent).not.toContain('modifiée ailleurs');
    expect(opened.root().textContent).toContain('Version 5');
  });

  it('asks before leaving a dirty form', async (): Promise<void> => {
    const confirm: Mock<() => Promise<boolean>> = vi.fn((): Promise<boolean> =>
      Promise.resolve(false),
    );
    const opened: Opened = await edit(entry('oaas', 0), [
      { provide: ConfirmDialogService, useValue: { confirm } },
    ]);
    await type(opened, 'edit-timeline-title-fr', 'Autre');
    await TestBed.inject(Router).navigateByUrl('/admin/experiences');
    await opened.settle();
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Quitter sans enregistrer ?' }),
    );
    expect(TestBed.inject(Router).url).toBe('/admin/experiences/oaas');
  });

  it('creates an ongoing education entry, then opens its address', async (): Promise<void> => {
    const opened: Opened = await open('/admin/education/new');
    await places(opened);
    const root: HTMLElement = opened.root();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Nouvelle formation');
    for (const [id, value] of [
      ['edit-timeline-title-fr', 'Licence'],
      ['edit-timeline-title-en', 'Degree'],
      ['edit-timeline-place-fr', 'Tours'],
      ['edit-timeline-place-en', 'Tours'],
      ['edit-timeline-description-fr', 'Informatique.'],
      ['edit-timeline-description-en', 'Computing.'],
    ] as const) {
      await type(opened, id, value);
    }
    await submit(opened);
    // The months are still to choose: nothing is sent.
    opened.backend.expectNone(`${API}/education/entries`);
    expect(root.textContent).toContain('Choisissez le début, puis la fin ou « En cours ».');
    await pickPeriod(opened, ['2024-09'], true);
    await submit(opened);
    const call: TestRequest = opened.backend.expectOne(`${API}/education/entries`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({
      title: { fr: 'Licence', en: 'Degree' },
      place: { fr: 'Tours', en: 'Tours' },
      description: { fr: 'Informatique.', en: 'Computing.' },
      start: { year: 2024, month: 9 },
      end: null,
      techs: [],
    });
    call.flush(
      entry('new-id', 3, {
        kind: 'education',
        version: 1,
        title: { fr: 'Licence', en: 'Degree' },
        start: { year: 2024, month: 9 },
      }),
    );
    await opened.settle();
    expect(TestBed.inject(Router).url).toBe('/admin/education/new-id');
    opened.backend.expectOne(`${API}/education/entries/new-id`);
    expect(toasts()).toEqual([['success', '« Licence » ajoutée.']]);
    expect(descriptions()).toEqual([REBUILD]);
  });

  it('suggests the places of both kinds per language, and saves any other text', async (): Promise<void> => {
    const opened: Opened = await open('/admin/experiences/oaas');
    const current: AdminTimelineEntryDto = entry('oaas', 0, {
      place: { fr: 'Tours', en: 'Tours' },
    });
    opened.backend.expectOne(`${API}/experience/entries/oaas`).flush(current);
    await places(
      opened,
      [current, entry('kodoka', 1, { place: { fr: 'Paris', en: 'Paris' } })],
      [
        entry('bts', 0, {
          kind: 'education',
          place: { fr: 'Joué-lès-Tours', en: 'Joue-les-Tours' },
        }),
      ],
    );
    expect(suggestions(opened, 'edit-timeline-place-fr')).toEqual([]);
    await type(opened, 'edit-timeline-place-fr', 'joue');
    expect(suggestions(opened, 'edit-timeline-place-fr')).toEqual(['Joué-lès-Tours']);
    await type(opened, 'edit-timeline-place-fr', 'tour');
    expect(suggestions(opened, 'edit-timeline-place-fr')).toEqual(['Joué-lès-Tours', 'Tours']);
    await type(opened, 'edit-timeline-place-en', 're');
    expect(suggestions(opened, 'edit-timeline-place-en')).toEqual(['Remote']);
    // A place nobody used yet closes the list and stays the value.
    await type(opened, 'edit-timeline-place-fr', 'Saint-Avertin');
    expect(suggestions(opened, 'edit-timeline-place-fr')).toEqual([]);
    await submit(opened);
    const call: TestRequest = opened.backend.expectOne(`${API}/experience/entries/oaas`);
    expect(call.request.method).toBe('PUT');
    expect(call.request.body.place).toEqual({ fr: 'Saint-Avertin', en: 're' });
  });

  it('keeps the place free text when its suggestions fail to load', async (): Promise<void> => {
    const opened: Opened = await open('/admin/education/new');
    opened.backend
      .expectOne({ method: 'GET', url: `${API}/experience/entries` })
      .flush(null, { status: 500, statusText: 'Server Error' });
    await opened.settle();
    expect(toasts()).toEqual([]);
    await type(opened, 'edit-timeline-place-fr', 'dist');
    expect(suggestions(opened, 'edit-timeline-place-fr')).toEqual(['À distance']);
  });

  it('saves a closed period, and keeps a period refused by the API on the picker until it changes', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0));
    // Unchecking « En cours » keeps the start: the next month ends the period.
    await pickPeriod(opened, ['2024-06']);
    await submit(opened);
    const call: TestRequest = opened.backend.expectOne(`${API}/experience/entries/oaas`);
    expect(call.request.body).toMatchObject({
      start: { year: 2022, month: 1 },
      end: { year: 2024, month: 6 },
    });
    call.flush(
      { code: 'content.validation', errors: [{ field: 'end.year', message: 'Fin refusée.' }] },
      { status: 400, statusText: 'Bad Request' },
    );
    await opened.settle();
    expect(opened.root().querySelector('#edit-timeline-period-error')?.textContent?.trim()).toBe(
      'Fin refusée.',
    );
    expect(
      opened.root().querySelector('#edit-timeline-period')?.getAttribute('aria-describedby'),
    ).toBe('edit-timeline-period-error');
    await pickPeriod(opened, ['2023-09', '2024-07']);
    expect(opened.root().querySelector('#edit-timeline-period-error')).toBeNull();
  });

  it('deletes the entry once confirmed, then returns to the list', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0), [
      {
        provide: ConfirmDialogService,
        useValue: { confirm: (): Promise<boolean> => Promise.resolve(true) },
      },
    ]);
    button(opened.root(), 'Supprimer').click();
    await opened.settle();
    const call: TestRequest = opened.backend.expectOne(`${API}/experience/entries/oaas`);
    expect(call.request.method).toBe('DELETE');
    call.flush(listOf(5, []));
    await opened.settle();
    expect(TestBed.inject(Router).url).toBe('/admin/experiences');
    expect(toasts()).toEqual([['success', '« Poste oaas » supprimée.']]);
    expect(descriptions()).toEqual([REBUILD]);
    opened.backend.expectOne(`${API}/experience/entries`);
  });

  it('saves with Ctrl+S only once something changed, and warns before unloading a dirty form', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0));
    const save = (): KeyboardEvent => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
      return event;
    };
    expect(save().defaultPrevented).toBe(true);
    await opened.settle();
    opened.backend.expectNone(`${API}/experience/entries/oaas`);
    const unload: Event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);

    await type(opened, 'edit-timeline-description-en', 'Angular front ends.');
    const dirtyUnload: Event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyUnload);
    expect(dirtyUnload.defaultPrevented).toBe(true);
    save();
    await opened.settle();
    expect(
      opened.backend.expectOne(`${API}/experience/entries/oaas`).request.body.description,
    ).toEqual({ fr: 'Interfaces.', en: 'Angular front ends.' });
  });

  it('discards the changes once confirmed and focuses the save status', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0), [
      {
        provide: ConfirmDialogService,
        useValue: { confirm: (): Promise<boolean> => Promise.resolve(true) },
      },
    ]);
    await type(opened, 'edit-timeline-title-fr', 'Autre');
    expect(opened.root().textContent).toContain('Modifications non enregistrées');
    button(opened.root(), 'Abandonner').click();
    await opened.settle();
    expect(opened.root().querySelector<HTMLInputElement>('#edit-timeline-title-fr')?.value).toBe(
      'Poste oaas',
    );
    expect(document.activeElement?.getAttribute('data-slot')).toBe('save-status');
  });

  it('explains an English text refused by the API and keeps its error on the field', async (): Promise<void> => {
    const opened: Opened = await edit(entry('oaas', 0, { techs: [] }));
    await type(opened, 'edit-timeline-title-fr', 'Autre');
    await submit(opened);
    opened.backend.expectOne(`${API}/experience/entries/oaas`).flush(
      {
        code: 'content.timeline-entry-incomplete',
        errors: [{ field: 'title.en', message: 'English required.' }],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await opened.settle();
    expect(toasts()).toEqual([['error', 'Complétez les deux langues.']]);
    expect(opened.root().textContent).toContain('English required.');
  });

  it('shows the properties below the form on a narrow page', async (): Promise<void> => {
    const matchMedia: typeof window.matchMedia = window.matchMedia;
    window.matchMedia = ((query: string): MediaQueryList =>
      ({
        matches: true,
        media: query,
        addEventListener: (): void => undefined,
        removeEventListener: (): void => undefined,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const opened: Opened = await edit(entry('oaas', 0));
      expect(opened.root().querySelector('aside')).toBeNull();
      expect(opened.root().querySelector('section[aria-label="Propriétés"]')).not.toBeNull();
      expect(opened.root().querySelector('#edit-timeline-period')).not.toBeNull();
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it('offers to retry an entry that failed to load', async (): Promise<void> => {
    const opened: Opened = await open('/admin/experiences/oaas');
    opened.backend
      .expectOne(`${API}/experience/entries/oaas`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await opened.settle();
    expect(opened.root().textContent).toContain('Impossible de charger l’entrée');
    button(opened.root(), 'Réessayer').click();
    await opened.settle();
    opened.backend.expectOne(`${API}/experience/entries/oaas`).flush(entry('oaas', 0));
    await opened.settle();
    expect(opened.root().querySelector('h1')?.textContent?.trim()).toBe('Poste oaas');
  });

  it('says the entry cannot be found, or that another kind does not have it', async (): Promise<void> => {
    const opened: Opened = await open('/admin/experiences/bts');
    opened.backend
      .expectOne(`${API}/experience/entries/bts`)
      .flush({ code: 'content.not-found' }, { status: 404, statusText: 'Not Found' });
    await opened.settle();
    expect(opened.root().textContent).toContain('Entrée introuvable');
    expect(opened.root().querySelector('a[href="/admin/experiences"]')?.textContent?.trim()).toBe(
      'Toutes les expériences',
    );
  });
});
