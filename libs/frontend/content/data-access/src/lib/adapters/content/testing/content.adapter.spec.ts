import type { ContentSnapshot, ProjectDto } from '@vfortin/content-contracts';
import type { ProjectArticle, SiteContent } from '@vfortin/content-web-model';
import { toSiteContent } from '@internal/content-web-data-access/lib/adapters/content/content.adapter';

/**
 * Function project
 *
 * @description
 * Builds a contract-shaped project with the given search texts.
 */
const project = (seo: ProjectDto['seo'], siteUrl: string | null = null): ProjectDto => ({
  slug: 'library-trails',
  title: 'Library Trails',
  summary: 'Une application mobile pour suivre ses séries.',
  lead: 'Flutter et Supabase.',
  periodLabel: '2026',
  client: 'Projet personnel',
  role: 'Développement',
  place: 'Android et iOS',
  siteUrl,
  techs: ['flutter'],
  featured: true,
  article: { type: 'doc', content: [{ type: 'paragraph' }] },
  cover: {
    src: '/media/8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f.webp',
    small: null,
    width: 1200,
    height: 630,
    alt: 'Accueil de Library Trails',
  },
  seo,
});

/**
 * Function snapshot
 *
 * @description
 * Wraps projects in a minimal French snapshot.
 */
const snapshot = (projects: ProjectDto[]): ContentSnapshot => ({
  locale: 'fr',
  revision: 7,
  profile: {
    heroIntro: 'Intro',
    aboutStatement: 'Phrase',
    aboutLead: 'Lead',
    facts: [],
    links: [
      { kind: 'email', url: 'mailto:morgan@example.com', label: null },
      { kind: 'github', url: 'https://example.com/demo/code', label: null },
      { kind: 'website', url: 'https://www.blog.example/', label: null },
      { kind: 'malt', url: 'https://www.malt.fr/profile/x', label: 'Mon Malt' },
    ],
  },
  projects,
  timeline: [],
  skills: [],
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
});

describe('toSiteContent', (): void => {
  it('resolves the label of each public link, a written one first', (): void => {
    expect(toSiteContent(snapshot([])).profile.links).toEqual([
      {
        kind: 'email',
        href: 'mailto:morgan@example.com',
        label: 'morgan@example.com',
      },
      { kind: 'github', href: 'https://example.com/demo/code', label: 'GitHub' },
      { kind: 'website', href: 'https://www.blog.example/', label: 'blog.example' },
      { kind: 'malt', href: 'https://www.malt.fr/profile/x', label: 'Mon Malt' },
    ]);
  });

  it('reads a raw snapshot without links as having none', (): void => {
    const older: ContentSnapshot = snapshot([]);
    const profile: Partial<ContentSnapshot['profile']> = { ...older.profile };
    delete profile.links;
    expect(
      toSiteContent({ ...older, profile: profile as ContentSnapshot['profile'] }).profile.links,
    ).toEqual([]);
  });

  it('splits each legal document at its level-2 headings and keeps its date', (): void => {
    const content: SiteContent = toSiteContent(snapshot([]));
    expect(content.legal.notice).toEqual({
      updatedOn: '2026-11-02',
      intro: [{ kind: 'paragraph', content: [{ kind: 'text', text: 'Préambule.' }] }],
      sections: [
        {
          id: 'editeur-du-site',
          label: 'Éditeur du site',
          blocks: [{ kind: 'paragraph', content: [{ kind: 'text', text: 'Valentin Fortin.' }] }],
        },
      ],
    });
    expect(content.legal.privacy.sections).toEqual([]);
  });

  it('keeps the custom search texts of a project', (): void => {
    const content: SiteContent = toSiteContent(
      snapshot([
        project({
          title: 'Library Trails, suivi de séries',
          description: 'Une description.',
          keywords: ['Flutter'],
        }),
      ]),
    );
    expect(content.projects[0]?.seo).toEqual({
      title: 'Library Trails, suivi de séries',
      description: 'Une description.',
      keywords: ['Flutter'],
    });
  });

  it('keeps null search texts so the page falls back on the title and summary', (): void => {
    const article: ProjectArticle | undefined = toSiteContent(
      snapshot([project({ title: null, description: null, keywords: [] })]),
    ).projects[0];
    expect(article?.seo).toEqual({ title: null, description: null, keywords: [] });
    expect(article?.cover?.alt).toBe('Accueil de Library Trails');
  });

  it('labels the external site with its host name without www', (): void => {
    const article: ProjectArticle | undefined = toSiteContent(
      snapshot([
        project({ title: null, description: null, keywords: [] }, 'https://www.example.com/fr/'),
      ]),
    ).projects[0];
    expect(article?.site).toEqual({ url: 'https://www.example.com/fr/', label: 'example.com' });
  });
});
