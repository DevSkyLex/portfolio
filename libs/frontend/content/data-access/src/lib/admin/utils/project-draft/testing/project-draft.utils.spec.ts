import type { ProjectRevisionRequest } from '@vfortin/content-contracts';
import { ProjectRevisionRequestSchema } from '@vfortin/content-contracts';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
import type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';
import {
  toProjectDraft,
  toRevisionRequest,
} from '@internal/content-web-data-access/lib/admin/utils/project-draft/project-draft.utils';

/**
 * Function t
 *
 * @description
 * Creates a localized project fixture field and omits English when no translation is supplied.
 *
 * @param {string} fr - French source text.
 * @param {string} [en] - Optional English translation.
 *
 * @returns {{ fr: string; en?: string }} Localized fixture value.
 */
const t = (fr: string, en?: string): { fr: string; en?: string } =>
  en === undefined ? { fr } : { fr, en };

/**
 * Constant MEDIA
 *
 * @description
 * Media referenced by the figure and the cover of the fixture.
 */
const MEDIA: string = '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90';

/**
 * Constant FRENCH
 *
 * @description
 * French document with a heading, a paragraph and a figure.
 *
 * @type {ArticleDocumentDraft}
 */
const FRENCH: ArticleDocumentDraft = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Contexte' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Un.' }] },
    { type: 'figure', attrs: { media: MEDIA, alt: 'Écran', caption: '' } },
  ],
};

/**
 * Constant project
 *
 * @description
 * Published project fixture without English article, with a cover and its media.
 *
 * @type {AdminProject}
 */
const project: AdminProject = {
  id: 'p1',
  slug: 'library-trails',
  status: 'published',
  version: 3,
  position: 0,
  title: t('Library Trails', 'Library Trails'),
  summary: t('Résumé', 'Summary'),
  lead: t('Chapô'),
  period: { start: { year: 2026, month: null }, end: null },
  client: t('Perso', 'Personal'),
  role: t('Dév', 'Dev'),
  place: t('Ville-Exemple', 'Ville-Exemple'),
  siteUrl: null,
  techs: ['flutter', 'dart'],
  featured: true,
  article: { fr: FRENCH, en: null },
  cover: { media: MEDIA, alt: t('Couverture') },
  media: [{ id: MEDIA, src: `/media/${MEDIA}.webp`, width: 1600, height: 900 }],
  seo: {
    title: { fr: 'Library Trails, app de covoiturage' },
    description: {},
    keywords: { fr: ['covoiturage', 'Flutter'], en: [] },
  },
  missing: ['lead.en', 'article.en', 'cover.alt.en'],
};

describe('toProjectDraft', (): void => {
  it('resolves the figure URLs for display and opens an unwritten English article empty', (): void => {
    const draft: ProjectDraft = toProjectDraft(project);
    expect(draft.article.fr.content[2]).toEqual({
      type: 'figure',
      attrs: { media: MEDIA, alt: 'Écran', caption: '', src: `/media/${MEDIA}.webp` },
    });
    expect(draft.article.en).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(draft.cover).toEqual({ media: MEDIA, alt: { fr: 'Couverture', en: '' } });
    expect(project.article.fr.content[2]).toEqual(FRENCH.content[2]);
  });

  it('opens the absent search texts as empty fields', (): void => {
    expect(toProjectDraft(project).seo).toEqual({
      title: { fr: 'Library Trails, app de covoiturage', en: '' },
      description: { fr: '', en: '' },
      keywords: { fr: ['covoiturage', 'Flutter'], en: [] },
    });
  });

  it('leaves an unknown media without URL and a project without cover with a blank one', (): void => {
    const draft: ProjectDraft = toProjectDraft({
      ...project,
      article: { fr: FRENCH, en: FRENCH },
      cover: null,
      media: [],
    });
    expect(draft.article.en.content[2]).toMatchObject({ attrs: { src: null } });
    expect(draft.cover).toEqual({ media: '', alt: { fr: '', en: '' } });
  });
});

describe('toRevisionRequest', (): void => {
  it('round-trips without the display URL, omitting the empty English article', (): void => {
    const request: ProjectRevisionRequest = toRevisionRequest(toProjectDraft(project));
    expect(ProjectRevisionRequestSchema.safeParse(request).success).toBe(true);
    expect(request.article).toEqual({ fr: FRENCH });
    expect(request.cover).toEqual({ media: MEDIA, alt: { fr: 'Couverture' } });
    expect(request.lead).toEqual({ fr: 'Chapô' });
    expect(request.techs).toEqual(['flutter', 'dart']);
    expect(request.seo).toEqual({
      title: { fr: 'Library Trails, app de covoiturage' },
      description: {},
      keywords: { fr: ['covoiturage', 'Flutter'] },
    });
    expect(request.period).toEqual({ start: { year: 2026, month: null }, end: null });
    expect(request).not.toHaveProperty('periodLabel');
  });

  it('copies the period both ways and refuses a draft without one', (): void => {
    const draft: ProjectDraft = toProjectDraft(project);
    expect(draft.period).toEqual(project.period);
    expect(draft.period?.start).not.toBe(project.period.start);
    draft.period = { start: { year: 2023, month: 3 }, end: { year: 2023, month: 4 } };
    expect(toRevisionRequest(draft).period).toEqual({
      start: { year: 2023, month: 3 },
      end: { year: 2023, month: 4 },
    });
    draft.period = null;
    expect((): ProjectRevisionRequest => toRevisionRequest(draft)).toThrow(
      'A project period is required.',
    );
  });

  it('trims the search values and omits the blank languages, which fall back', (): void => {
    const draft: ProjectDraft = toProjectDraft(project);
    draft.seo = {
      title: { fr: '   ', en: '  Library Trails, carpooling app  ' },
      description: { fr: ' Covoiturage local. ', en: '' },
      keywords: { fr: [], en: [' carpooling ', '  '] },
    };
    const request: ProjectRevisionRequest = toRevisionRequest(draft);
    expect(request.seo).toEqual({
      title: { en: 'Library Trails, carpooling app' },
      description: { fr: 'Covoiturage local.' },
      keywords: { fr: [], en: ['carpooling'] },
    });
    expect(Object.hasOwn(request.seo.title, 'fr')).toBe(false);
    expect(Object.hasOwn(request.seo.description, 'en')).toBe(false);
    expect(ProjectRevisionRequestSchema.safeParse(request).success).toBe(true);
  });

  it('sends a written English article and no cover once removed', (): void => {
    const draft: ProjectDraft = toProjectDraft(project);
    draft.article.en = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One.' }] }],
    };
    draft.cover = { media: '', alt: { fr: 'Couverture', en: 'Cover' } };
    const request: ProjectRevisionRequest = toRevisionRequest(draft);
    expect(request.article.en).toEqual(draft.article.en);
    expect(request.cover).toBeNull();
  });

  it('treats an English document holding only blank text as unwritten', (): void => {
    const draft: ProjectDraft = toProjectDraft(project);
    draft.article.en = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
        { type: 'horizontalRule' },
      ],
    };
    expect(toRevisionRequest(draft).article).not.toHaveProperty('en');
  });
});
