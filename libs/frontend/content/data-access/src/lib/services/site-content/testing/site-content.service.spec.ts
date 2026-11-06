import type { Mock } from 'vitest';
import type { ContentSnapshot, ProjectDto } from '@vfortin/content-contracts';
import type { ContentSnapshotLoader } from '@internal/content-web-data-access/lib/models/content-snapshot-loader/content-snapshot-loader.type';
import { ApplicationInitStatus, LOCALE_ID, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideContentSnapshotLoader } from '@internal/content-web-data-access/lib/providers/content-snapshot-loader/content-snapshot-loader.provider';
import { provideContentSnapshotValidation } from '@internal/content-web-data-access/lib/providers/content-snapshot-validation/content-snapshot-validation.provider';
import { provideContentSnapshots } from '@internal/content-web-data-access/lib/providers/content-snapshots/content-snapshots.provider';
import { SiteContentService } from '@internal/content-web-data-access/lib/services/site-content/site-content.service';
import { SiteLinksService } from '@internal/content-web-data-access/lib/services/site-links/site-links.service';
import { loadSiteContent } from '@internal/content-web-data-access/lib/providers/content-snapshot-loader/load-site-content';
import { contentSnapshotStateKey } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-state-key';

/**
 * Constant base
 *
 * @description
 * Shared raw snapshot fixture containing profile, timeline, and skills data before locale and project values are added.
 *
 * @type {Omit<import('@vfortin/content-contracts').ContentSnapshot, 'locale' | 'projects'>}
 */
const base: Omit<ContentSnapshot, 'locale' | 'projects'> = {
  revision: 3,
  profile: {
    heroIntro: 'Intro',
    aboutStatement: 'Phrase',
    aboutLead: 'Lead',
    facts: [],
    links: [{ kind: 'email', url: 'mailto:morgan@example.com', label: null }],
  },
  legal: {
    notice: {
      updatedOn: '2026-11-02',
      document: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Préambule.' }] },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Éditeur du site' }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: 'Valentin Fortin.' }] },
        ],
      },
    },
    privacy: {
      updatedOn: '2026-11-03',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  },
  timeline: [
    {
      id: 'job',
      kind: 'experience',
      title: 'Poste',
      place: 'Ville-Exemple',
      description: 'd',
      start: { year: 2023, month: 9 },
      end: null,
      techs: [],
    },
    {
      id: 'bts',
      kind: 'education',
      title: 'Diplôme de création visuelle fictif',
      place: 'Ville-Exemple',
      description: 'd',
      start: { year: 2021, month: 9 },
      end: { year: 2023, month: 6 },
      techs: [],
    },
  ],
  skills: [],
};

/**
 * Function project
 *
 * @description
 * Creates a contract-shaped project fixture with configurable slug and featured status.
 *
 * @param {string} slug - Stable project identifier and fixture title.
 * @param {boolean} featured - Whether the project is grouped as featured.
 *
 * @returns {import('@vfortin/content-contracts').ProjectDto} Project snapshot entry used by service projection tests.
 */
const project = (slug: string, featured: boolean): ProjectDto => ({
  slug,
  title: slug,
  summary: 's',
  lead: 'l',
  periodLabel: '2026',
  client: 'c',
  role: 'r',
  place: 'p',
  siteUrl: slug === 'accessibility-notebook' ? 'https://example.com/fr/' : null,
  techs: ['angular'],
  featured,
  article: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Intro.' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Contexte' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Contexte.' }] },
    ],
  },
  cover:
    slug === 'library-trails'
      ? {
          src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
          small: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f-960.webp',
          width: 2400,
          height: 1350,
          alt: 'Accueil de Library Trails',
        }
      : null,
  seo: { title: null, description: null, keywords: [] },
});

/**
 * Constant HOME
 *
 * @description
 * Default project collection containing one featured project followed by two regular cards.
 *
 * @type {import('@vfortin/content-contracts').ProjectDto[]}
 */
const HOME: ProjectDto[] = [
  project('library-trails', true),
  project('workshop-calendar', false),
  project('accessibility-notebook', false),
];

/**
 * Function setup
 *
 * @description
 * Configures Angular testing providers with the selected locale, raw snapshots, and server-side contract validator, then injects the content service.
 *
 * @param {string} locale - Locale identifier supplied through `LOCALE_ID`.
 * @param {unknown} [en] - English snapshot fixture used by the snapshot provider.
 * @param {unknown[]} [projects] - Project entries included in the French snapshot.
 *
 * @returns {SiteContentService} Service created from the configured test injector.
 */
function setup(
  locale: string,
  en: unknown = { ...base, locale: 'en', projects: [] },
  projects: unknown[] = HOME,
): SiteContentService {
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: locale },
      provideContentSnapshotValidation(),
      provideContentSnapshots({
        fr: {
          ...base,
          locale: 'fr',
          projects,
        },
        en,
      }),
    ],
  });
  return TestBed.inject<SiteContentService>(SiteContentService);
}

describe('SiteContentService', (): void => {
  it('serves the legal documents and hands the links over to the layout', (): void => {
    const service: SiteContentService = setup('fr');
    const links: SiteLinksService = TestBed.inject<SiteLinksService>(SiteLinksService);
    expect(service.legal('notice').sections.map((section): string => section.label)).toEqual([
      'Éditeur du site',
    ]);
    expect(service.legal('privacy').updatedOn).toBe('2026-11-03');
    expect(links.email()).toEqual({
      kind: 'email',
      href: 'mailto:morgan@example.com',
      label: 'morgan@example.com',
    });
    expect(links.profiles()).toEqual([]);
  });

  it('separates the featured project from the others', (): void => {
    const service: SiteContentService = setup('fr');
    expect(service.featuredProject()?.slug).toBe('library-trails');
    expect(service.otherProjects().map((p): string => p.slug)).toEqual([
      'workshop-calendar',
      'accessibility-notebook',
    ]);
  });

  it('links the case studies in reading order, wrapping around (mockup Article order)', (): void => {
    const service: SiteContentService = setup('fr', undefined, [
      project('library-trails', true),
      project('workshop-calendar', false),
      project('neighborhood-atlas', false),
      project('accessibility-notebook', false),
    ]);
    const around: (slug: string) => (string | undefined)[] = (
      slug: string,
    ): (string | undefined)[] => {
      const neighbours: ReturnType<SiteContentService['neighbours']> = service.neighbours(slug);
      return [neighbours?.previous.slug, neighbours?.next.slug];
    };
    expect(around('library-trails')).toEqual(['neighborhood-atlas', 'accessibility-notebook']);
    expect(around('accessibility-notebook')).toEqual(['library-trails', 'workshop-calendar']);
    expect(around('workshop-calendar')).toEqual(['accessibility-notebook', 'neighborhood-atlas']);
    expect(around('neighborhood-atlas')).toEqual(['workshop-calendar', 'library-trails']);
    expect(service.neighbours('unknown')).toBeNull();
  });

  it('has no neighbours with a single project', (): void => {
    expect(
      setup('fr', undefined, [project('library-trails', true)]).neighbours('library-trails'),
    ).toBeNull();
  });

  it('derives the date labels and the site name', (): void => {
    const service: SiteContentService = setup('fr');
    expect(service.timeline().map((s): string => s.dateLabel)).toEqual([
      'Depuis 2023',
      '2021 — 2023',
    ]);
    expect(service.project('accessibility-notebook')?.site).toEqual({
      url: 'https://example.com/fr/',
      label: 'example.com',
    });
  });

  it('splits the article at its level-2 headings and keeps the cover', (): void => {
    const service: SiteContentService = setup('fr');
    const libraryTrails: ReturnType<SiteContentService['project']> =
      service.project('library-trails');
    expect(libraryTrails?.intro).toEqual([
      { kind: 'paragraph', content: [{ kind: 'text', text: 'Intro.' }] },
    ]);
    expect(libraryTrails?.sections).toEqual([
      {
        id: 'contexte',
        label: 'Contexte',
        blocks: [{ kind: 'paragraph', content: [{ kind: 'text', text: 'Contexte.' }] }],
      },
    ]);
    expect(libraryTrails?.cover).toEqual({
      src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
      small: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f-960.webp',
      width: 2400,
      height: 1350,
      alt: 'Accueil de Library Trails',
    });
    expect(service.otherProjects()[0]?.cover).toBeNull();
  });

  it("reads the snapshot of the build's locale", (): void => {
    expect(setup('en-US').locale()).toBe('en');
  });

  it('rejects an invalid snapshot', (): void => {
    expect((): SiteContentService => setup('en', { locale: 'en' })).toThrow();
  });
});

describe('provideContentSnapshotLoader', (): void => {
  it("loads only the public route's locale on demand, independently of application startup", async (): Promise<void> => {
    const load: Mock<ContentSnapshotLoader> = vi.fn(async (locale: string) => ({
      ...base,
      locale,
      projects: [],
    }));
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'en-GB' }, provideContentSnapshotLoader(load)],
    });
    await TestBed.inject<ApplicationInitStatus>(ApplicationInitStatus).donePromise;
    expect(load).not.toHaveBeenCalled();
    await TestBed.runInInjectionContext(loadSiteContent);
    expect(load).toHaveBeenCalledExactlyOnceWith('en');
    expect(TestBed.inject<SiteContentService>(SiteContentService).locale()).toBe('en');
  });

  it('shares an in-flight public load and retries after failure without caching the rejection', async (): Promise<void> => {
    const failure: Error = new Error('Snapshot unavailable');
    const load: Mock<ContentSnapshotLoader> = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValue({
        ...base,
        locale: 'fr',
        projects: [],
      });
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'fr' }, provideContentSnapshotLoader(load)],
    });
    const first: Promise<SiteContentService> = TestBed.runInInjectionContext(loadSiteContent);
    const second: Promise<SiteContentService> = TestBed.runInInjectionContext(loadSiteContent);
    await expect(first).rejects.toBe(failure);
    await expect(second).rejects.toBe(failure);
    expect(load).toHaveBeenCalledTimes(1);
    const content: SiteContentService = await TestBed.runInInjectionContext(loadSiteContent);
    expect(content.locale()).toBe('fr');
    await TestBed.runInInjectionContext(loadSiteContent);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('hydrates from the active locale transfer entry without downloading the snapshot again', async (): Promise<void> => {
    const load: Mock<ContentSnapshotLoader> = vi.fn(() =>
      Promise.reject(new Error('Snapshot chunk must not be requested')),
    );
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'fr' }, provideContentSnapshotLoader(load)],
    });
    const transfer: TransferState = TestBed.inject<TransferState>(TransferState);
    transfer.set(contentSnapshotStateKey('fr'), { ...base, locale: 'fr', projects: HOME });
    transfer.set(contentSnapshotStateKey('en'), { ...base, locale: 'en', projects: [] });
    const service: SiteContentService = await TestBed.runInInjectionContext(loadSiteContent);
    expect(service.project('library-trails')?.title).toBe('library-trails');
    expect(load).not.toHaveBeenCalled();
    expect(transfer.hasKey(contentSnapshotStateKey('fr'))).toBe(false);
    expect(transfer.hasKey(contentSnapshotStateKey('en'))).toBe(true);
    await TestBed.runInInjectionContext(loadSiteContent);
    expect(load).not.toHaveBeenCalled();
  });

  it('transfers only validated public fields for the active server locale', async (): Promise<void> => {
    const load: Mock<ContentSnapshotLoader> = vi.fn(async () => ({
      ...base,
      locale: 'fr',
      projects: HOME,
      sessionToken: 'must-not-be-serialized',
    }));
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: PLATFORM_ID, useValue: 'server' },
        provideContentSnapshotLoader(load),
        provideContentSnapshotValidation(),
      ],
    });
    await TestBed.runInInjectionContext(loadSiteContent);
    const transfer: TransferState = TestBed.inject<TransferState>(TransferState);
    expect(transfer.get(contentSnapshotStateKey('fr'), null)).toEqual({
      ...base,
      locale: 'fr',
      projects: HOME,
    });
    expect(transfer.hasKey(contentSnapshotStateKey('en'))).toBe(false);
  });

  it('loads fresh content for each server application even when providers are reused', async (): Promise<void> => {
    const load: Mock<ContentSnapshotLoader> = vi.fn(async () => ({
      ...base,
      locale: 'fr',
      projects: HOME,
    }));
    const contentProviders: ReturnType<typeof provideContentSnapshotLoader> =
      provideContentSnapshotLoader(load);
    const configureServer: () => void = (): void => {
      TestBed.configureTestingModule({
        providers: [
          { provide: LOCALE_ID, useValue: 'fr' },
          { provide: PLATFORM_ID, useValue: 'server' },
          contentProviders,
          provideContentSnapshotValidation(),
        ],
      });
    };
    configureServer();
    await TestBed.runInInjectionContext(loadSiteContent);
    TestBed.resetTestingModule();
    configureServer();
    await TestBed.runInInjectionContext(loadSiteContent);
    expect(load).toHaveBeenCalledTimes(2);
    expect(TestBed.inject<TransferState>(TransferState).hasKey(contentSnapshotStateKey('fr'))).toBe(
      true,
    );
  });

  it('rejects invalid server content before anything can be transferred', async (): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: PLATFORM_ID, useValue: 'server' },
        provideContentSnapshotLoader(async (): Promise<{ locale: string }> => ({ locale: 'fr' })),
        provideContentSnapshotValidation(),
      ],
    });
    await expect(TestBed.runInInjectionContext(loadSiteContent)).rejects.toThrow();
    expect(TestBed.inject<TransferState>(TransferState).hasKey(contentSnapshotStateKey('fr'))).toBe(
      false,
    );
  });
});
