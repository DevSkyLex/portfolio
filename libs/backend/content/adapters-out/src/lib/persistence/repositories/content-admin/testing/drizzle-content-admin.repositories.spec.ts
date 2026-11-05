import { Project, ProjectSeo, Slug } from '@vfortin/content-domain';
import { eq } from 'drizzle-orm';
import { PUBLISHED_LOCALES, VersionMismatchError } from '@vfortin/content-application';
import { fileURLToPath } from 'node:url';
import { seedContent } from '@internal/content-adapters-out/lib/seed/content.seed';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  projects as projectRows,
  siteBuildRequests,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';
import {
  DrizzleContentUnitOfWork,
  DrizzleProjectRepository,
  DrizzleSiteBuildRequestRepository,
} from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute content-service migration directory used to prepare the in-memory database.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Constant now
 *
 * @description
 * Fixed instant used by repository tests for deterministic outbox timestamps.
 */
const now: Date = new Date('2026-11-02T10:00:00Z');

/**
 * Function later
 *
 * @description
 * Returns a timestamp offset from the fixed test instant.
 * @param {number} ms - Milliseconds added to `now`.
 * @returns {Date} Offset timestamp.
 */
const later: (ms: number) => Date = (ms: number): Date => new Date(now.getTime() + ms);

describe('Content administration (Postgres via PGlite)', (): void => {
  let handle: ContentDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
    await seedContent(handle.db);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('saves a change and increments the version, only once per version read', async (): Promise<void> => {
    const repository: DrizzleProjectRepository = new DrizzleProjectRepository(handle.db);
    const project: Project | null = await repository.get('project-movah');
    if (!project) throw new Error('project missing');
    project.unpublish();
    await expect(repository.save(project, 1)).resolves.toBe(2);
    await expect(repository.save(project, 1)).rejects.toBeInstanceOf(VersionMismatchError);
    expect((await repository.get('project-movah'))?.status).toBe('draft');
    await expect(repository.get('absent')).resolves.toBeNull();
    expect((await repository.list()).map((p): string => p.id)).toContain('project-movah');
  });

  it('inserts a new project at version 1 and refuses a slug already used', async (): Promise<void> => {
    const repository: DrizzleProjectRepository = new DrizzleProjectRepository(handle.db);
    const source: Project | null = await repository.get('project-movah');
    if (!source) throw new Error('project missing');
    const created: Project = Project.create(
      { id: 'project-new', slug: Slug.of('nouveau'), position: 99 },
      source.snapshot(),
    );
    await repository.insert(created);
    const read: Project | null = await repository.get('project-new');
    expect(read?.snapshot()).toMatchObject({ status: 'draft', version: 1, position: 99 });
    expect(read?.slug.value).toBe('nouveau');
    expect(read?.snapshot().title.toProps()).toEqual(source.snapshot().title.toProps());
    await expect(
      repository.insert(
        Project.create(
          { id: 'project-other', slug: Slug.of('nouveau'), position: 100 },
          source.snapshot(),
        ),
      ),
    ).rejects.toThrow();
  });

  it('stores the search texts as trimmed jsonb, seeded rows starting from the empty default', async (): Promise<void> => {
    const repository: DrizzleProjectRepository = new DrizzleProjectRepository(handle.db);
    const project: Project | null = await repository.get('project-movah');
    if (!project) throw new Error('project missing');
    expect(project.snapshot().seo.toProps()).toEqual({ title: {}, description: {}, keywords: {} });
    project.revise(
      {
        ...project.snapshot(),
        seo: ProjectSeo.of({
          title: { fr: ' Movah, suivi de séries en Flutter ', en: '' },
          description: { en: 'A Flutter app to track series.' },
          keywords: { fr: [' Flutter ', 'suivi de séries'], en: [] },
        }),
      },
      PUBLISHED_LOCALES,
    );
    await expect(repository.save(project, 1)).resolves.toBe(2);
    const [row] = await handle.db
      .select({ seo: projectRows.seo, seoKeywords: projectRows.seoKeywords })
      .from(projectRows)
      .where(eq(projectRows.id, 'project-movah'));
    expect(row?.seo).toEqual({
      title: { fr: 'Movah, suivi de séries en Flutter' },
      description: { en: 'A Flutter app to track series.' },
    });
    expect(row?.seoKeywords).toEqual({ fr: ['Flutter', 'suivi de séries'] });
    const reread: Project | null = await repository.get('project-movah');
    expect(reread?.snapshot().seo.in('en')).toEqual({
      title: null,
      description: 'A Flutter app to track series.',
      keywords: [],
    });
    expect(reread?.snapshot().seo.in('fr').keywords).toEqual(['Flutter', 'suivi de séries']);
  });

  it('rolls back the change if the rebuild request fails (same transaction)', async (): Promise<void> => {
    const uow: DrizzleContentUnitOfWork = new DrizzleContentUnitOfWork(handle.db);
    await expect(
      uow.run(async ({ projects }) => {
        const project: Project | null = await projects.get('project-movah');
        if (!project) throw new Error('project missing');
        project.revise({ ...project.snapshot() }, PUBLISHED_LOCALES);
        project.unpublish();
        await projects.save(project, 1);
        throw new Error('failure after write');
      }),
    ).rejects.toThrow('failure after write');
    const reread: Project | null = await new DrizzleProjectRepository(handle.db).get(
      'project-movah',
    );
    expect(reread?.snapshot()).toMatchObject({ status: 'published', version: 1 });
  });

  it('claims only the most recent request, and sending covers the previous ones', async (): Promise<void> => {
    const requests: DrizzleSiteBuildRequestRepository = new DrizzleSiteBuildRequestRepository(
      handle.db,
    );
    const r2: number = await requests.request(now);
    const r3: number = await requests.request(now);
    expect([r2, r3]).toEqual([2, 3]);
    await expect(requests.claimLatest(now, later(60_000))).resolves.toEqual({
      revision: 3,
      attempts: 0,
    });
    await expect(requests.claimLatest(now, later(60_000))).resolves.toBeNull();
    await requests.markDispatched(3, now);
    const rows: {
      revision: number;
      status: 'pending' | 'dispatched';
      attempts: number;
      requestedAt: Date;
      nextAttemptAt: Date;
      claimedUntil: Date | null;
      dispatchedAt: Date | null;
      lastError: string | null;
    }[] = await handle.db.select().from(siteBuildRequests);
    expect(
      rows.every(
        (row: {
          revision: number;
          status: 'pending' | 'dispatched';
          attempts: number;
          requestedAt: Date;
          nextAttemptAt: Date;
          claimedUntil: Date | null;
          dispatchedAt: Date | null;
          lastError: string | null;
        }): boolean => row.status === 'dispatched',
      ),
    ).toBe(true);
  });

  it('claims nothing while another request is being sent, even a newer one', async (): Promise<void> => {
    const requests: DrizzleSiteBuildRequestRepository = new DrizzleSiteBuildRequestRepository(
      handle.db,
    );
    await requests.request(now);
    await expect(requests.claimLatest(now, later(60_000))).resolves.toMatchObject({ revision: 2 });
    await requests.request(now);
    await expect(requests.claimLatest(now, later(60_000))).resolves.toBeNull();
    await requests.markDispatched(2, later(1_000));
    await expect(requests.claimLatest(later(1_000), later(60_000))).resolves.toMatchObject({
      revision: 3,
    });
  });

  it('takes over a request whose lease expired', async (): Promise<void> => {
    const requests: DrizzleSiteBuildRequestRepository = new DrizzleSiteBuildRequestRepository(
      handle.db,
    );
    await requests.request(now);
    await requests.claimLatest(now, later(60_000));
    await expect(requests.claimLatest(later(60_000), later(120_000))).resolves.toEqual({
      revision: 2,
      attempts: 0,
    });
  });

  it('retries a failed send after its delay', async (): Promise<void> => {
    const requests: DrizzleSiteBuildRequestRepository = new DrizzleSiteBuildRequestRepository(
      handle.db,
    );
    await requests.request(now);
    await requests.claimLatest(now, later(60_000));
    await requests.markFailed(2, 'GitHub 502', later(120_000));
    await expect(requests.claimLatest(later(60_000), later(90_000))).resolves.toBeNull();
    await expect(requests.claimLatest(later(120_000), later(180_000))).resolves.toEqual({
      revision: 2,
      attempts: 1,
    });
  });
});
