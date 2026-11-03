import {
  DomainError,
  LocalizedText,
  Project,
  type ProjectProps,
  type ProjectRevision,
  Slug,
} from '@vfortin/content-domain';
import {
  NotFoundError,
  VersionMismatchError,
} from '@internal/content-application/lib/errors/application-error';
import type {
  ContentUnitOfWork,
  ContentRepositories,
  Clock,
  SiteBuildDispatcher,
  ProjectRepository,
  SiteBuildRequestRepository,
} from '@internal/content-application/lib/ports/content/content.ports';
import type { MockInstance } from 'vitest';
import type { ProjectChangeResult } from '@internal/content-application/lib/use-cases/change-project/change-project';
import { DispatchSiteBuild } from '@internal/content-application/lib/use-cases/dispatch-site-build/dispatch-site-build.use-case';
import { GetAdminProject } from '@internal/content-application/lib/use-cases/get-admin-project/get-admin-project.use-case';
import { ListAdminProjects } from '@internal/content-application/lib/use-cases/list-admin-projects/list-admin-projects.use-case';
import { PublishProject } from '@internal/content-application/lib/use-cases/publish-project/publish-project.use-case';
import { ReviseProject } from '@internal/content-application/lib/use-cases/revise-project/revise-project.use-case';
import { UnpublishProject } from '@internal/content-application/lib/use-cases/unpublish-project/unpublish-project.use-case';

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
 * @returns {Project} Rehydrated project aggregate.
 */
function project(id: string, status: 'draft' | 'published', en: boolean = true): Project {
  const t: (value: string) => LocalizedText = (value: string): LocalizedText =>
    text(value, en ? `${value} (en)` : undefined);
  return Project.rehydrate({
    id,
    slug: Slug.of(id),
    title: t('Titre'),
    summary: t('Résumé'),
    lead: t('Chapô'),
    periodLabel: t('2026'),
    client: t('Client'),
    role: t('Rôle'),
    place: t('Lieu'),
    siteUrl: null,
    techs: ['angular'],
    featured: false,
    position: 0,
    status,
    version: 1,
    article: {
      context: [t('c')],
      work: [t('w')],
      workList: [],
      choices: [t('ch')],
      result: [t('r')],
      lessons: [t('l')],
      captions: [],
    },
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
 * Creates in-memory project and outbox ports, a fixed clock and administration use cases for each
 * test. Its fake transaction executes writes directly; database rollback behavior has separate tests.
 *
 * @param {Project[]} initial - Initial aggregate state.
 * @returns {ProjectTestHarness} Fake repositories, state, clock and configured use cases.
 */
function setup(initial: Project[]): ProjectTestHarness {
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

  // Test transaction: writes are direct (rollback is tested with PGlite).
  const unitOfWork: ContentUnitOfWork = {
    run: <T>(work: (repositories: ContentRepositories) => Promise<T>): Promise<T> =>
      work({ projects, buildRequests }),
  };
  const clock: Clock = { now: (): Date => new Date('2026-11-02T10:00:00Z') };
  return {
    requests,
    stored,
    revise: new ReviseProject(unitOfWork, clock),
    publish: new PublishProject(unitOfWork, clock),
    unpublish: new UnpublishProject(unitOfWork, clock),
    list: new ListAdminProjects(projects),
    get: new GetAdminProject(projects),
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
 * @returns {ProjectRevision} Editable project fields with the supplied bilingual title.
 */
const revision = (p: Project, title: string): ProjectRevision => {
  const s: ProjectProps = p.snapshot();
  return { ...s, title: text(title, `${title} (en)`) };
};

describe('project administration', (): void => {
  it('edits a draft without rebuilding the site', async (): Promise<void> => {
    const draft: Project = project('p1', 'draft');
    const { revise, requests } = setup([draft]);
    const result: ProjectChangeResult = await revise.execute('p1', 1, revision(draft, 'Nouveau'));
    expect(result).toMatchObject({ version: 2, revision: null });
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

  it('lists every project in display order and reads one', async (): Promise<void> => {
    const second: Project = Project.rehydrate({
      ...project('p2', 'draft').snapshot(),
      position: 1,
    });
    const first: Project = Project.rehydrate({
      ...project('p1', 'published').snapshot(),
      position: 0,
    });
    const { list, get } = setup([second, first]);
    expect((await list.execute()).map((p: Project): string => p.id)).toEqual(['p1', 'p2']);
    await expect(get.execute('p2')).resolves.toMatchObject({ id: 'p2' });
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
