import { Project, type ProjectProps } from '@internal/content-domain/lib/project/project';
import {
  ArticleDocument,
  type ArticleBlock,
} from '@internal/content-domain/lib/values/article-document/article-document';
import { LocalizedText } from '@internal/content-domain/lib/values/localized-text/localized-text';
import { ProjectPeriod } from '@internal/content-domain/lib/values/project-period/project-period';
import { ProjectSeo } from '@internal/content-domain/lib/values/project-seo/project-seo';
import { Slug } from '@internal/content-domain/lib/values/slug/slug';
import {
  type ProjectSeoAudit,
  SEO_DESCRIPTION_MIN_LENGTH,
  SEO_TITLE_MIN_LENGTH,
  auditProjectSeo,
  fallbackDescription,
} from '@internal/content-domain/lib/seo-audit/seo-audit';

/**
 * Constant MEDIA
 *
 * @description
 * Media identifiers of the cover and figure fixtures.
 */
const MEDIA: readonly [string, string] = [
  '8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f',
  '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
];

/**
 * Constant SUMMARY_FR
 *
 * @description
 * French summary long enough for a description without warning.
 */
const SUMMARY_FR: string =
  'Application mobile de suivi de séries et de films, avec synchronisation entre appareils et recommandations.';

/**
 * Constant SUMMARY_EN
 *
 * @description
 * English summary long enough for a description without warning.
 */
const SUMMARY_EN: string =
  'Mobile application tracking series and films, synchronized across devices, with recommendations.';

/**
 * Function text
 *
 * @description
 * Creates a localized value.
 *
 * @param {string} fr - French text.
 * @param {string} en - Optional English text.
 * @returns {LocalizedText} Value.
 */
const text = (fr: string, en?: string): LocalizedText =>
  LocalizedText.of('test', en === undefined ? { fr } : { fr, en });

/**
 * Function doc
 *
 * @description
 * Builds a document of one paragraph followed by figures with the given alternative texts.
 *
 * @param {readonly string[]} alts - Alternative text of each figure.
 * @returns {ArticleDocument} Document.
 */
function doc(alts: readonly string[] = []): ArticleDocument {
  return ArticleDocument.of('article', {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Paragraphe' }] },
      ...alts.map((alt: string): ArticleBlock => ({
        type: 'figure',
        attrs: { media: MEDIA[1], alt, caption: '' },
      })),
    ],
  });
}

/**
 * Function project
 *
 * @description
 * Builds a published project with custom search texts and keywords in both languages, then applies
 * the overrides.
 *
 * @param {Partial<ProjectProps>} overrides - Fields replacing the defaults.
 * @returns {Project} Project.
 */
function project(overrides: Partial<ProjectProps> = {}): Project {
  return Project.rehydrate({
    id: 'p-1',
    slug: Slug.of('movah'),
    title: text('Movah', 'Movah'),
    summary: text(SUMMARY_FR, SUMMARY_EN),
    lead: text('Intro', 'Lead'),
    period: ProjectPeriod.of({ start: { year: 2026, month: null }, end: null }),
    client: text('Projet personnel', 'Personal project'),
    role: text('Conception', 'Design'),
    place: text('Android et iOS', 'Android and iOS'),
    siteUrl: null,
    techs: ['flutter', 'supabase'],
    featured: true,
    position: 0,
    status: 'published',
    version: 1,
    article: { fr: doc(), en: doc() },
    cover: { media: MEDIA[0], alt: { fr: 'Écran', en: 'Screen' } },
    seo: ProjectSeo.of({
      title: { fr: 'Movah, suivi de séries et de films', en: 'Movah, a series and film tracker' },
      description: { fr: SUMMARY_FR, en: SUMMARY_EN },
      keywords: { fr: ['suivi de séries'], en: ['series tracker'] },
    }),
    ...overrides,
  });
}

describe('auditProjectSeo', (): void => {
  it('reports nothing for complete metadata and lists what each page emits', (): void => {
    const audit: ProjectSeoAudit = auditProjectSeo(project());
    expect(audit.issues).toEqual([]);
    expect(audit).toMatchObject({ projectId: 'p-1', slug: 'movah', title: 'Movah' });
    expect(audit.pages.fr).toEqual({
      path: '/fr/projects/movah',
      title: 'Movah, suivi de séries et de films',
      description: SUMMARY_FR,
      keywords: ['suivi de séries'],
      keywordsSource: 'custom',
    });
    expect(audit.pages.en.path).toBe('/en/projects/movah');
  });

  it('reports the fallbacks the page applies and their lengths', (): void => {
    const audit: ProjectSeoAudit = auditProjectSeo(
      project({
        title: text('Movah', 'Movah'),
        summary: text('Suivi de séries.', `${'Series '.repeat(30)}tracker`),
        seo: ProjectSeo.empty(),
      }),
    );
    expect(audit.pages.fr.title).toBe('Movah — Valentin Fortin');
    expect(audit.pages.fr.keywords).toEqual(['flutter', 'supabase']);
    expect(audit.pages.fr.keywordsSource).toBe('techs');
    expect(audit.pages.en.description.length).toBeLessThanOrEqual(160);
    expect(audit.issues).toEqual([
      { code: 'search-title-missing', severity: 'info', locale: 'fr' },
      {
        code: 'search-title-too-short',
        severity: 'warning',
        locale: 'fr',
        length: 23,
        limit: SEO_TITLE_MIN_LENGTH,
      },
      { code: 'search-description-missing', severity: 'info', locale: 'fr' },
      {
        code: 'search-description-too-short',
        severity: 'warning',
        locale: 'fr',
        length: 16,
        limit: SEO_DESCRIPTION_MIN_LENGTH,
      },
      { code: 'keywords-missing', severity: 'info', locale: 'fr' },
      { code: 'search-title-missing', severity: 'info', locale: 'en' },
      {
        code: 'search-title-too-short',
        severity: 'warning',
        locale: 'en',
        length: 23,
        limit: SEO_TITLE_MIN_LENGTH,
      },
      { code: 'search-description-missing', severity: 'info', locale: 'en' },
      { code: 'keywords-missing', severity: 'info', locale: 'en' },
    ]);
  });

  it('reports a fallback title above 70 characters', (): void => {
    const long: string = 'Plateforme de supervision des capteurs connectés industriels';
    const audit: ProjectSeoAudit = auditProjectSeo(
      project({
        title: text(long, long),
        seo: ProjectSeo.of({
          title: { en: 'Industrial sensor platform for factories' },
          description: {},
          keywords: {},
        }),
      }),
    );
    expect(audit.issues).toContainEqual({
      code: 'search-title-too-long',
      severity: 'warning',
      locale: 'fr',
      length: long.length + ' — Valentin Fortin'.length,
      limit: 70,
    });
    expect(
      audit.issues.filter(
        (issue): boolean => issue.locale === 'en' && issue.code.startsWith('search-title'),
      ),
    ).toEqual([]);
  });

  it('warns about a page without keywords, cover or alternative texts', (): void => {
    const audit: ProjectSeoAudit = auditProjectSeo(
      project({
        techs: [],
        cover: null,
        seo: ProjectSeo.of({
          title: {
            fr: 'Movah, suivi de séries et de films',
            en: 'Movah, a series and film tracker',
          },
          description: { fr: SUMMARY_FR, en: SUMMARY_EN },
          keywords: {},
        }),
        status: 'draft',
        article: { fr: doc(['', 'Capture', ' ']), en: doc(['Screen']) },
      }),
    );
    expect(audit.issues).toEqual([
      { code: 'cover-missing', severity: 'warning', locale: null },
      { code: 'keywords-missing', severity: 'warning', locale: 'fr' },
      { code: 'image-alt-missing', severity: 'error', locale: 'fr', count: 2 },
      { code: 'keywords-missing', severity: 'warning', locale: 'en' },
    ]);
    expect(audit.pages.en).toMatchObject({ keywords: [], keywordsSource: 'none' });
  });

  it('reports a missing cover text and the untranslated English fields', (): void => {
    const audit: ProjectSeoAudit = auditProjectSeo(
      project({
        lead: text('Intro'),
        article: { fr: doc() },
        cover: { media: MEDIA[0], alt: { fr: 'Écran' } },
        status: 'draft',
      }),
    );
    expect(audit.issues).toEqual([
      { code: 'cover-alt-missing', severity: 'error', locale: 'en' },
      {
        code: 'translation-missing',
        severity: 'error',
        locale: 'en',
        fields: ['lead.en', 'article.en'],
      },
    ]);
  });
});

describe('fallbackDescription', (): void => {
  it('keeps a short summary and cuts a long one at a word boundary', (): void => {
    expect(fallbackDescription('  Une   application\nmobile.  ')).toBe('Une application mobile.');
    const cut: string = fallbackDescription(`${'mot '.repeat(60)}fin`);
    expect(cut.endsWith('mot…')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(160);
  });

  it('cuts inside a single very long word', (): void => {
    const cut: string = fallbackDescription(`court ${'x'.repeat(300)}`, 40);
    expect(cut).toBe(`court ${'x'.repeat(33)}…`);
  });
});
