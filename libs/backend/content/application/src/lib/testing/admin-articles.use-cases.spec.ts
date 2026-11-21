import {
  DomainError,
  LocalizedText,
  Article,
  ProjectPeriod,
  type ArticleProps,
  type ArticleRevision,
  ArticleSeo,
  Slug,
} from '@vfortin/content-domain';
import {
  MediaNotFoundError,
  NotFoundError,
  VersionMismatchError,
} from '@internal/content-application/lib/errors/application-error';
import type {
  ContentUnitOfWork,
  ContentRepositories,
  Clock,
  MediaRecord,
  SiteBuildDispatcher,
  ArticleRepository,
  SiteBuildRequestRepository,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { MockInstance } from 'vitest';
import type { ArticleChangeResult } from '@internal/content-application/lib/use-cases/change-article/change-article';
import { DispatchSiteBuild } from '@internal/content-application/lib/use-cases/dispatch-site-build/dispatch-site-build.use-case';
import {
  type AdminArticleView,
  GetAdminArticle,
} from '@internal/content-application/lib/use-cases/get-admin-article/get-admin-article.use-case';
import { ListAdminArticles } from '@internal/content-application/lib/use-cases/list-admin-articles/list-admin-articles.use-case';
import { PublishArticle } from '@internal/content-application/lib/use-cases/publish-article/publish-article.use-case';
import { CreateArticle } from '@internal/content-application/lib/use-cases/create-article/create-article.use-case';
import { ReviseArticle } from '@internal/content-application/lib/use-cases/revise-article/revise-article.use-case';
import { UnpublishArticle } from '@internal/content-application/lib/use-cases/unpublish-article/unpublish-article.use-case';
import {
  FixedClock,
  InMemoryMediaRepository,
  articleDoc,
  mediaRecord,
} from '@internal/content-application/lib/testing/content.fakes';

/**
 * Constant M
 *
 * @description
 * Media identifiers of the fixtures.
 */
const M: readonly [string, string, string] = [
  '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
  '8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f',
  '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
];

/**
 * Constant text
 *
 * @description
 * Creates a normalized localized value for project command fixtures.
 *
 * @param {string} fr - French source content.
 * @param {string} en - Optional English translation.
 * @returns {LocalizedText} Domain localized text.
 */
const text: (fr: string, en?: string) => LocalizedText = (fr: string, en?: string): LocalizedText =>
  LocalizedText.of('t', en === undefined ? { fr } : { fr, en });

/**
 * Function project
 *
 * @description
 * Builds a complete project aggregate with optional English text for publication tests.
 *
 * @param {string} id - Identifier and valid slug for the project.
 * @param {'draft' | 'published'} status - Initial publication state.
 * @param {boolean} en - Whether fixture text includes English translations; defaults to `true`.
 * @param {readonly string[]} figures - Media shown by figures of both documents.
 * @returns {Article} Rehydrated project aggregate.
 */
function project(
  id: string,
  status: 'draft' | 'published',
  en: boolean = true,
  figures: readonly string[] = [],
): Article {
  const t: (value: string) => LocalizedText = (value: string): LocalizedText =>
    text(value, en ? `${value} (en)` : undefined);
  return Article.rehydrate({
    id,
    slug: Slug.of(id),
    title: t('Titre'),
    summary: t('Résumé'),
    lead: t('Chapô'),
    period: ProjectPeriod.of({ start: { year: 2026, month: null }, end: null }),
    client: t('Client'),
    role: t('Rôle'),
    place: t('Lieu'),
    siteUrl: null,
    techs: ['angular'],
    featured: false,
    position: 0,
    status,
    version: 1,
    article: en
      ? { fr: articleDoc('Texte', figures), en: articleDoc('Text', figures) }
      : { fr: articleDoc('Texte', figures) },
    cover: null,
    seo: ArticleSeo.empty(),
  });
}

/**
 * Interface ProjectTestHarness
 *
 * @description
 * In-memory ports, recorded rebuild requests and configured project administration use cases.
 */
interface ProjectTestHarness {
  readonly requests: { revision: number; status: string; attempts: number }[];
  readonly stored: Map<string, Article>;
  readonly media: InMemoryMediaRepository;
  readonly create: CreateArticle;
  readonly revise: ReviseArticle;
  readonly publish: PublishArticle;
  readonly unpublish: UnpublishArticle;
  readonly list: ListAdminArticles;
  readonly get: GetAdminArticle;
  readonly buildRequests: SiteBuildRequestRepository;
  readonly clock: Clock;
}

/**
 * Function setup
 *
 * @description
 * Creates in-memory project, media and outbox ports, a fixed clock and administration use cases for
 * each test. Its fake transaction executes writes directly; database rollback behavior has separate
 * tests.
 *
 * @param {Article[]} initial - Initial aggregate state.
 * @param {readonly MediaRecord[]} media - Initial media rows.
 * @returns {ProjectTestHarness} Fake repositories, state, clock and configured use cases.
 */
function setup(initial: Article[], media: readonly MediaRecord[] = []): ProjectTestHarness {
  const versions: Map<string, number> = new Map(
    initial.map((p: Article): [string, number] => [p.id, p.version]),
  );
  const stored: Map<string, Article> = new Map(
    initial.map((p: Article): [string, Article] => [p.id, p]),
  );
  const requests: { revision: number; status: string; attempts: number }[] = [];
  let revision: number = 1;
  const projects: ArticleRepository = {
    list: async (): Promise<Article[]> => [...stored.values()],
    get: async (id: string): Promise<Article | null> => {
      const p: Article | undefined = stored.get(id);
      return p ? Article.rehydrate({ ...p.snapshot(), version: versions.get(id) ?? 1 }) : null;
    },
    save: async (p: Article, expected: number): Promise<number> => {
      if (versions.get(p.id) !== expected) throw new VersionMismatchError();
      versions.set(p.id, expected + 1);
      stored.set(p.id, p);
      return expected + 1;
    },
    insert: async (p: Article): Promise<void> => {
      versions.set(p.id, p.version);
      stored.set(p.id, p);
    },
  };
  const buildRequests: SiteBuildRequestRepository = {
    request: async (): Promise<number> => {
      revision++;
      requests.push({ revision, status: 'pending', attempts: 0 });
      return revision;
    },
    claimLatest: async (): Promise<{ revision: number; attempts: number } | null> => {
      const pending: { revision: number; status: string; attempts: number }[] = requests.filter(
        (r: { revision: number; status: string; attempts: number }): boolean =>
          r.status === 'pending',
      );
      const latest: { revision: number; status: string; attempts: number } | undefined =
        pending.at(-1);
      return latest ? { revision: latest.revision, attempts: latest.attempts } : null;
    },
    markDispatched: async (upTo: number): Promise<void> => {
      for (const r of requests) if (r.revision <= upTo) r.status = 'dispatched';
    },
    markFailed: async (rev: number): Promise<void> => {
      const r: { revision: number; status: string; attempts: number } | undefined = requests.find(
        (x: { revision: number; status: string; attempts: number }): boolean => x.revision === rev,
      );
      if (r) r.attempts++;
    },
  };
  const mediaRepository: InMemoryMediaRepository = new InMemoryMediaRepository(media);

  // Test transaction: writes are direct (rollback is tested with PGlite).
  const unitOfWork: ContentUnitOfWork = {
    run: <T>(work: (repositories: ContentRepositories) => Promise<T>): Promise<T> =>
      work({ projects, buildRequests, media: mediaRepository }),
  };
  const clock: Clock = new FixedClock();
  return {
    requests,
    stored,
    media: mediaRepository,
    create: new CreateArticle(unitOfWork, { next: (): string => `new-${stored.size}` }),
    revise: new ReviseArticle(unitOfWork, clock),
    publish: new PublishArticle(unitOfWork, clock),
    unpublish: new UnpublishArticle(unitOfWork, clock),
    list: new ListAdminArticles(projects, mediaRepository),
    get: new GetAdminArticle(projects, mediaRepository),
    buildRequests,
    clock,
  };
}

/**
 * Constant revision
 *
 * @description
 * Copies a project's editable fields and replaces its title with complete bilingual text.
 *
 * @param {Article} p - Aggregate whose editable fields seed the revision.
 * @param {string} title - French title for the revised project.
 * @param {Partial<ArticleRevision>} overrides - Other editable fields to replace.
 * @returns {ArticleRevision} Editable project fields with the supplied bilingual title.
 */
const revision = (
  p: Article,
  title: string,
  overrides: Partial<ArticleRevision> = {},
): ArticleRevision => {
  const s: ArticleProps = p.snapshot();
  return { ...s, title: text(title, `${title} (en)`), ...overrides };
};

describe('project administration', (): void => {
  it('creates a draft after the last project with a free slug from the French title', async (): Promise<void> => {
    const existing: Article = Article.rehydrate({
      ...project('etude-de-cas', 'published').snapshot(),
      position: 3,
    });
    const { create, stored, requests } = setup([existing]);
    const result: ArticleChangeResult = await create.execute(
      revision(existing, 'Étude de cas', { title: text('Étude de cas') }),
    );
    expect(result).toMatchObject({ version: 1, revision: null, media: [] });
    expect(result.article.snapshot()).toMatchObject({
      id: 'new-1',
      status: 'draft',
      position: 4,
    });
    expect(result.article.slug.value).toBe('etude-de-cas-2');
    expect(stored.get('new-1')).toBe(result.article);
    expect(requests).toEqual([]);
  });

  it('refuses to create a project referencing an unknown media', async (): Promise<void> => {
    const { create, stored } = setup([]);
    const base: Article = project('p1', 'draft', true, [M[0]]);
    await expect(create.execute(revision(base, 'Titre'))).rejects.toBeInstanceOf(
      MediaNotFoundError,
    );
    expect(stored.size).toBe(0);
  });

  it('edits a draft without rebuilding the site', async (): Promise<void> => {
    const draft: Article = project('p1', 'draft');
    const { revise, requests } = setup([draft]);
    const result: ArticleChangeResult = await revise.execute('p1', 1, revision(draft, 'Nouveau'));
    expect(result).toMatchObject({ version: 2, revision: null, media: [] });
    expect(requests).toEqual([]);
  });

  it('requests a rebuild when the public site changes', async (): Promise<void> => {
    const published: Article = project('p1', 'published');
    const { revise, unpublish, requests } = setup([published]);
    await expect(revise.execute('p1', 1, revision(published, 'Nouveau'))).resolves.toMatchObject({
      revision: 2,
    });
    await expect(unpublish.execute('p1', 2)).resolves.toMatchObject({ revision: 3 });
    expect(
      requests.map(
        (r: { revision: number; status: string; attempts: number }): number => r.revision,
      ),
    ).toEqual([2, 3]);
  });

  it('rejects a stale version', async (): Promise<void> => {
    const draft: Article = project('p1', 'draft');
    const { revise } = setup([draft]);
    await revise.execute('p1', 1, revision(draft, 'A'));
    await expect(revise.execute('p1', 1, revision(draft, 'B'))).rejects.toBeInstanceOf(
      VersionMismatchError,
    );
  });

  it('refuses to publish a project without English', async (): Promise<void> => {
    const { publish } = setup([project('p1', 'draft', false)]);
    await expect(publish.execute('p1', 1)).rejects.toBeInstanceOf(DomainError);
  });

  it('reports an unknown project', async (): Promise<void> => {
    const { publish, get } = setup([]);
    await expect(publish.execute('absent', 1)).rejects.toBeInstanceOf(NotFoundError);
    await expect(get.execute('absent')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('publishes a complete draft and requests a rebuild', async (): Promise<void> => {
    const { publish, requests } = setup([project('p1', 'draft')]);
    await expect(publish.execute('p1', 1)).resolves.toMatchObject({ version: 2, revision: 2 });
    expect(requests).toHaveLength(1);
  });

  it('lists every project in display order with its media, and reads one', async (): Promise<void> => {
    const second: Article = Article.rehydrate({
      ...project('p2', 'draft', true, [M[1], M[2]]).snapshot(),
      position: 1,
    });
    const first: Article = Article.rehydrate({
      ...project('p1', 'published', true, [M[0]]).snapshot(),
      position: 0,
    });
    const { list, get } = setup([second, first], [mediaRecord(M[0]), mediaRecord(M[1])]);
    const views: AdminArticleView[] = await list.execute();
    expect(
      views.map((view: AdminArticleView): [string, string[]] => [
        view.article.id,
        view.media.map((record: MediaRecord): string => record.id),
      ]),
    ).toEqual([
      ['p1', [M[0]]],
      ['p2', [M[1]]],
    ]);
    const one: AdminArticleView = await get.execute('p2');
    expect(one.article.id).toBe('p2');
    expect(one.media.map((record: MediaRecord): string => record.id)).toEqual([M[1]]);
  });

  it('saves the search texts of a published project, which never block it', async (): Promise<void> => {
    const published: Article = project('p1', 'published');
    const { revise, get, requests } = setup([published]);
    const seo: ArticleSeo = ArticleSeo.of({
      title: { fr: 'Titre de recherche' },
      description: { en: 'Search description' },
      keywords: { fr: ['Flutter', 'suivi de séries'] },
    });
    await expect(
      revise.execute('p1', 1, revision(published, 'Titre', { seo })),
    ).resolves.toMatchObject({ version: 2, revision: 2 });
    const read: AdminArticleView = await get.execute('p1');
    expect(read.article.snapshot().seo.toProps()).toEqual({
      title: { fr: 'Titre de recherche' },
      description: { en: 'Search description' },
      keywords: { fr: ['Flutter', 'suivi de séries'] },
    });
    expect(read.article.missingFor(['fr', 'en'])).toEqual([]);
    expect(requests).toHaveLength(1);
  });

  it('keeps the identity and status of a project whatever the revision carries', async (): Promise<void> => {
    const draft: Article = project('p1', 'draft');
    const { revise, stored } = setup([draft]);
    await revise.execute('p1', 1, {
      ...revision(draft, 'Nouveau'),
      status: 'published',
      id: 'x',
    } as never);
    expect(stored.get('p1')?.snapshot()).toMatchObject({ id: 'p1', status: 'draft' });
  });
});

describe('ReviseArticle', (): void => {
  it('refuses unknown media of the figures and the cover, before saving', async (): Promise<void> => {
    const draft: Article = project('p1', 'draft');
    const { revise, stored } = setup([draft], [mediaRecord(M[0])]);
    const rejection: Promise<ArticleChangeResult> = revise.execute(
      'p1',
      1,
      revision(draft, 'Nouveau', {
        article: { fr: articleDoc('Texte', [M[0], M[1]]) },
        cover: { media: M[2], alt: { fr: 'Accueil' } },
      }),
    );
    await expect(rejection).rejects.toBeInstanceOf(MediaNotFoundError);
    await expect(rejection).rejects.toMatchObject({
      code: 'content.media-not-found',
      details: [M[2], M[1]],
    });
    expect(stored.get('p1')?.snapshot().title.fr).toBe('Titre');
  });

  it('unlinks the media it no longer references and relinks those it references again', async (): Promise<void> => {
    const draft: Article = project('p1', 'draft', true, [M[0], M[1]]);
    const earlier: Date = new Date('2026-10-20T00:00:00Z');
    const { revise, media, clock } = setup(
      [draft],
      [mediaRecord(M[0]), mediaRecord(M[1]), mediaRecord(M[2], { unlinkedAt: earlier })],
    );
    const result: ArticleChangeResult = await revise.execute(
      'p1',
      1,
      revision(draft, 'Nouveau', {
        article: { fr: articleDoc('Texte', [M[0]]), en: articleDoc('Text', [M[0]]) },
        cover: { media: M[2], alt: { fr: 'Accueil', en: 'Home' } },
      }),
    );
    expect(media.rows.get(M[0])?.unlinkedAt).toBeNull();
    expect(media.rows.get(M[1])?.unlinkedAt).toEqual(clock.now());
    expect(media.rows.get(M[2])?.unlinkedAt).toBeNull();
    expect(result.media.map((record: MediaRecord): string => record.id).sort()).toEqual(
      [M[0], M[2]].sort(),
    );
  });

  it('leaves the media untouched when the references do not change', async (): Promise<void> => {
    const draft: Article = project('p1', 'draft', true, [M[0]]);
    const { revise, media } = setup([draft], [mediaRecord(M[0])]);
    const markUnlinked: MockInstance<InMemoryMediaRepository['markUnlinked']> = vi.spyOn(
      media,
      'markUnlinked',
    );
    const relink: MockInstance<InMemoryMediaRepository['relink']> = vi.spyOn(media, 'relink');
    await revise.execute('p1', 1, revision(draft, 'Nouveau'));
    expect(markUnlinked).not.toHaveBeenCalled();
    expect(relink).not.toHaveBeenCalled();
  });
});

describe('DispatchSiteBuild', (): void => {
  it('sends only the most recent revision', async (): Promise<void> => {
    const published: Article = project('p1', 'published');
    const { revise, requests, buildRequests, clock } = setup([published]);
    await revise.execute('p1', 1, revision(published, 'A'));
    await revise.execute('p1', 2, revision(published, 'B'));
    const dispatcher = {
      dispatch: vi.fn<SiteBuildDispatcher['dispatch']>().mockResolvedValue(undefined),
    } satisfies SiteBuildDispatcher;
    const worker: DispatchSiteBuild = new DispatchSiteBuild(buildRequests, dispatcher, clock);
    await expect(worker.execute()).resolves.toEqual({ dispatched: 3 });
    expect(dispatcher.dispatch).toHaveBeenCalledOnce();
    expect(
      requests.every(
        (r: { revision: number; status: string; attempts: number }): boolean =>
          r.status === 'dispatched',
      ),
    ).toBe(true);
    await expect(worker.execute()).resolves.toEqual({ dispatched: null });
  });

  it('keeps the request pending if sending fails', async (): Promise<void> => {
    const published: Article = project('p1', 'published');
    const { revise, requests, buildRequests, clock } = setup([published]);
    await revise.execute('p1', 1, revision(published, 'A'));
    const worker: DispatchSiteBuild = new DispatchSiteBuild(
      buildRequests,
      { dispatch: vi.fn().mockRejectedValue(new Error('GitHub 502')) },
      clock,
    );
    await expect(worker.execute()).rejects.toThrow('GitHub 502');
    expect(requests[0]).toMatchObject({ status: 'pending', attempts: 1 });
  });

  it('records a non-Error rejection as text', async (): Promise<void> => {
    const published: Article = project('p1', 'published');
    const { revise, buildRequests, clock } = setup([published]);
    await revise.execute('p1', 1, revision(published, 'A'));
    const markFailed: MockInstance<SiteBuildRequestRepository['markFailed']> = vi.spyOn(
      buildRequests,
      'markFailed',
    );
    const worker: DispatchSiteBuild = new DispatchSiteBuild(
      buildRequests,
      { dispatch: vi.fn().mockRejectedValue('timeout') },
      clock,
    );
    await expect(worker.execute()).rejects.toBe('timeout');
    expect(markFailed).toHaveBeenCalledWith(2, 'timeout', new Date('2026-11-02T10:01:00Z'));
  });
});

describe('article collection boundaries', (): void => {
  it('creates an article with an independent position and a globally unique slug', async (): Promise<void> => {
    const seed: Article = project('existing', 'draft');
    const h: ProjectTestHarness = setup([seed]);
    const article: ArticleChangeResult = await h.create.execute(
      revision(seed, 'existing', {
        taxonomy: {
          category: { key: 'architecture', label: text('Architecture', 'Architecture') },
          tags: [],
        },
      }),
      'article',
    );
    expect(article.article.kind).toBe('article');
    expect(article.article.position).toBe(0);
    expect(article.article.slug.value).not.toBe('existing');
    expect((await h.list.execute()).map((x) => x.article.id)).toEqual(
      expect.arrayContaining(['existing', article.article.id]),
    );
    expect((await h.list.execute('project')).map((x) => x.article.id)).toEqual(['existing']);
    expect((await h.list.execute('article')).map((x) => x.article.id)).toEqual([
      article.article.id,
    ]);
    await expect(h.get.execute(article.article.id, 'project')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(h.publish.execute(article.article.id, 1, 'project')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      h.revise.execute(article.article.id, 1, revision(seed, 'changed'), 'project'),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(h.unpublish.execute(article.article.id, 1, 'project')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const published: ArticleChangeResult = await h.publish.execute(article.article.id, 1);
    expect(published.article.isPublished()).toBe(true);
    expect((await h.get.execute(article.article.id, 'article')).article.kind).toBe('article');
    const hidden: ArticleChangeResult = await h.unpublish.execute(
      article.article.id,
      published.version,
      'article',
    );
    expect(hidden.article.isPublished()).toBe(false);
  });
});
