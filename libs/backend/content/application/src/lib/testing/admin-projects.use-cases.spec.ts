import {
  DomainError,
  LocalizedText,
  Project,
  ProjectPeriod,
  type ProjectProps,
  type ProjectRevision,
  ProjectSeo,
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
  ProjectRepository,
  SiteBuildRequestRepository,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { MockInstance } from 'vitest';
import type { ProjectChangeResult } from '@internal/content-application/lib/use-cases/change-project/change-project';
import { DispatchSiteBuild } from '@internal/content-application/lib/use-cases/dispatch-site-build/dispatch-site-build.use-case';
import {
  type AdminProjectView,
  GetAdminProject,
} from '@internal/content-application/lib/use-cases/get-admin-project/get-admin-project.use-case';
import { ListAdminProjects } from '@internal/content-application/lib/use-cases/list-admin-projects/list-admin-projects.use-case';
import { PublishProject } from '@internal/content-application/lib/use-cases/publish-project/publish-project.use-case';
import { ReviseProject } from '@internal/content-application/lib/use-cases/revise-project/revise-project.use-case';
import { UnpublishProject } from '@internal/content-application/lib/use-cases/unpublish-project/unpublish-project.use-case';
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
 * @returns {Project} Rehydrated project aggregate.
 */
function project(
  id: string,
  status: 'draft' | 'published',
  en: boolean = true,
  figures: readonly string[] = [],
): Project {
  const t: (value: string) => LocalizedText = (value: string): LocalizedText =>
    text(value, en ? `${value} (en)` : undefined);
  return Project.rehydrate({
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
    seo: ProjectSeo.empty(),
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
  readonly stored: Map<string, Project>;
  readonly media: InMemoryMediaRepository;
  readonly revise: ReviseProject;
  readonly publish: PublishProject;
  readonly unpublish: UnpublishProject;
  readonly list: ListAdminProjects;
  readonly get: GetAdminProject;
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
 * @param {Project[]} initial - Initial aggregate state.
 * @param {readonly MediaRecord[]} media - Initial media rows.
 * @returns {ProjectTestHarness} Fake repositories, state, clock and configured use cases.
 */
function setup(initial: Project[], media: readonly MediaRecord[] = []): ProjectTestHarness {
  const versions: Map<string, number> = new Map(
    initial.map((p: Project): [string, number] => [p.id, p.version]),
  );
  const stored: Map<string, Project> = new Map(
    initial.map((p: Project): [string, Project] => [p.id, p]),
  );
  const requests: { revision: number; status: string; attempts: number }[] = [];
  let revision: number = 1;
  const projects: ProjectRepository = {
    list: async (): Promise<Project[]> => [...stored.values()],
    get: async (id: string): Promise<Project | null> => {
      const p: Project | undefined = stored.get(id);
      return p ? Project.rehydrate({ ...p.snapshot(), version: versions.get(id) ?? 1 }) : null;
    },
    save: async (p: Project, expected: number): Promise<number> => {
      if (versions.get(p.id) !== expected) throw new VersionMismatchError();
      versions.set(p.id, expected + 1);
      stored.set(p.id, p);
      return expected + 1;
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
    revise: new ReviseProject(unitOfWork, clock),
    publish: new PublishProject(unitOfWork, clock),
    unpublish: new UnpublishProject(unitOfWork, clock),
    list: new ListAdminProjects(projects, mediaRepository),
    get: new GetAdminProject(projects, mediaRepository),
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
 * @param {Project} p - Aggregate whose editable fields seed the revision.
 * @param {string} title - French title for the revised project.
 * @param {Partial<ProjectRevision>} overrides - Other editable fields to replace.
 * @returns {ProjectRevision} Editable project fields with the supplied bilingual title.
 */
const revision = (
  p: Project,
  title: string,
  overrides: Partial<ProjectRevision> = {},
): ProjectRevision => {
  const s: ProjectProps = p.snapshot();
  return { ...s, title: text(title, `${title} (en)`), ...overrides };
};

describe('project administration', (): void => {
  it('edits a draft without rebuilding the site', async (): Promise<void> => {
    const draft: Project = project('p1', 'draft');
    const { revise, requests } = setup([draft]);
    const result: ProjectChangeResult = await revise.execute('p1', 1, revision(draft, 'Nouveau'));
    expect(result).toMatchObject({ version: 2, revision: null, media: [] });
    expect(requests).toEqual([]);
  });

  it('requests a rebuild when the public site changes', async (): Promise<void> => {
    const published: Project = project('p1', 'published');
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
    const draft: Project = project('p1', 'draft');
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
    const second: Project = Project.rehydrate({
      ...project('p2', 'draft', true, [M[1], M[2]]).snapshot(),
      position: 1,
    });
    const first: Project = Project.rehydrate({
      ...project('p1', 'published', true, [M[0]]).snapshot(),
      position: 0,
    });
    const { list, get } = setup([second, first], [mediaRecord(M[0]), mediaRecord(M[1])]);
    const views: AdminProjectView[] = await list.execute();
    expect(
      views.map((view: AdminProjectView): [string, string[]] => [
        view.project.id,
        view.media.map((record: MediaRecord): string => record.id),
      ]),
    ).toEqual([
      ['p1', [M[0]]],
      ['p2', [M[1]]],
    ]);
    const one: AdminProjectView = await get.execute('p2');
    expect(one.project.id).toBe('p2');
    expect(one.media.map((record: MediaRecord): string => record.id)).toEqual([M[1]]);
  });

  it('saves the search texts of a published project, which never block it', async (): Promise<void> => {
    const published: Project = project('p1', 'published');
    const { revise, get, requests } = setup([published]);
    const seo: ProjectSeo = ProjectSeo.of({
      title: { fr: 'Titre de recherche' },
      description: { en: 'Search description' },
      keywords: { fr: ['Flutter', 'suivi de séries'] },
    });
    await expect(
      revise.execute('p1', 1, revision(published, 'Titre', { seo })),
    ).resolves.toMatchObject({ version: 2, revision: 2 });
    const read: AdminProjectView = await get.execute('p1');
    expect(read.project.snapshot().seo.toProps()).toEqual({
      title: { fr: 'Titre de recherche' },
      description: { en: 'Search description' },
      keywords: { fr: ['Flutter', 'suivi de séries'] },
    });
    expect(read.project.missingFor(['fr', 'en'])).toEqual([]);
    expect(requests).toHaveLength(1);
  });

  it('keeps the identity and status of a project whatever the revision carries', async (): Promise<void> => {
    const draft: Project = project('p1', 'draft');
    const { revise, stored } = setup([draft]);
    await revise.execute('p1', 1, {
      ...revision(draft, 'Nouveau'),
      status: 'published',
      id: 'x',
    } as never);
    expect(stored.get('p1')?.snapshot()).toMatchObject({ id: 'p1', status: 'draft' });
  });
});

describe('ReviseProject', (): void => {
  it('refuses unknown media of the figures and the cover, before saving', async (): Promise<void> => {
    const draft: Project = project('p1', 'draft');
    const { revise, stored } = setup([draft], [mediaRecord(M[0])]);
    const rejection: Promise<ProjectChangeResult> = revise.execute(
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
    const draft: Project = project('p1', 'draft', true, [M[0], M[1]]);
    const earlier: Date = new Date('2026-10-20T00:00:00Z');
    const { revise, media, clock } = setup(
      [draft],
      [mediaRecord(M[0]), mediaRecord(M[1]), mediaRecord(M[2], { unlinkedAt: earlier })],
    );
    const result: ProjectChangeResult = await revise.execute(
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
    const draft: Project = project('p1', 'draft', true, [M[0]]);
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
    const published: Project = project('p1', 'published');
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
    const published: Project = project('p1', 'published');
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
    const published: Project = project('p1', 'published');
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
