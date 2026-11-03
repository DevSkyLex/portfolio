import type { Mock } from 'vitest';
import type { ContentSnapshot, ProjectDto } from '@vfortin/content-contracts';
import type { ContentSnapshotLoader } from '@internal/content-web-data-access/lib/models/content-snapshot-loader/content-snapshot-loader.type';
import { ApplicationInitStatus, LOCALE_ID, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideContentSnapshotLoader } from '@internal/content-web-data-access/lib/providers/content-snapshot-loader/content-snapshot-loader.provider';
import { provideContentSnapshotValidation } from '@internal/content-web-data-access/lib/providers/content-snapshot-validation/content-snapshot-validation.provider';
import { provideContentSnapshots } from '@internal/content-web-data-access/lib/providers/content-snapshots/content-snapshots.provider';
import { SiteContentService } from '@internal/content-web-data-access/lib/services/site-content/site-content.service';
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
  profile: { heroIntro: 'Intro', aboutStatement: 'Phrase', aboutLead: 'Lead', facts: [] },
  timeline: [
    {
      id: 'job',
      kind: 'experience',
      title: 'Poste',
      place: 'Blois',
      description: 'd',
      start: { year: 2023, month: 9 },
      end: null,
      techs: [],
    },
    {
      id: 'bts',
      kind: 'education',
      title: 'BTS',
      place: 'Tours',
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
  siteUrl: slug === 'iotplatform' ? 'https://www.iotplatform.fr/fr/' : null,
  techs: ['angular'],
  featured,
  article: {
    context: [],
    work: [],
    workList: [],
    choices: [],
    result: [],
    lessons: [],
    captions: [],
  },
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
  project('movah', true),
  project('rdi-manager', false),
  project('iotplatform', false),
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
  it('separates the featured project from the others', (): void => {
    const service: SiteContentService = setup('fr');
    expect(service.featuredProject()?.slug).toBe('movah');
    expect(service.otherProjects().map((p): string => p.slug)).toEqual([
      'rdi-manager',
      'iotplatform',
    ]);
  });

  it('links the case studies in reading order, wrapping around (mockup Article order)', (): void => {
    const service: SiteContentService = setup('fr', undefined, [
      project('movah', true),
      project('rdi-manager', false),
      project('crm-kodoka', false),
      project('iotplatform', false),
    ]);
    const around: (slug: string) => (string | undefined)[] = (
      slug: string,
    ): (string | undefined)[] => {
      const neighbours: ReturnType<SiteContentService['neighbours']> = service.neighbours(slug);
      return [neighbours?.previous.slug, neighbours?.next.slug];
    };
    expect(around('movah')).toEqual(['crm-kodoka', 'iotplatform']);
    expect(around('iotplatform')).toEqual(['movah', 'rdi-manager']);
    expect(around('rdi-manager')).toEqual(['iotplatform', 'crm-kodoka']);
    expect(around('crm-kodoka')).toEqual(['rdi-manager', 'movah']);
    expect(service.neighbours('unknown')).toBeNull();
  });

  it('has no neighbours with a single project', (): void => {
    expect(setup('fr', undefined, [project('movah', true)]).neighbours('movah')).toBeNull();
  });

  it('derives the date labels and the site name', (): void => {
    const service: SiteContentService = setup('fr');
    expect(service.timeline().map((s): string => s.dateLabel)).toEqual([
      'Depuis 2023',
      '2021 — 2023',
    ]);
    expect(service.project('iotplatform')?.site).toEqual({
      url: 'https://www.iotplatform.fr/fr/',
      label: 'iotplatform.fr',
    });
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
    expect(service.project('movah')?.title).toBe('movah');
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

  it('serializes a cached chunk into every prerender application rather than only the first page', async (): Promise<void> => {
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
    expect(load).toHaveBeenCalledOnce();
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
