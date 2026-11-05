import { DrizzleTimelineUnitOfWork } from '@internal/content-adapters-out/lib/persistence/repositories/timeline/drizzle-timeline.repositories';
import type { ProfileDraft, Project, TimelineEntry } from '@vfortin/content-domain';
import {
  GetPublishedContent,
  DeleteTimelineEntry,
  ReviseProfile,
  UnpublishProject,
  VersionMismatchError,
  type PublicationStatus,
  type PublishedContent,
} from '@vfortin/content-application';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import { DrizzlePublicationRepository } from '@internal/content-adapters-out/lib/persistence/repositories/publication/drizzle-publication.repository';
import { DrizzleContentSnapshotReader } from '@internal/content-adapters-out/lib/persistence/repositories/content/drizzle-content.repositories';
import { DrizzleContentUnitOfWork } from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';
import { DrizzleSiteTextsUnitOfWork } from '@internal/content-adapters-out/lib/persistence/repositories/site-texts/drizzle-site-texts.repositories';
import { DrizzleMediaRepository } from '@internal/content-adapters-out/lib/persistence/repositories/media/drizzle-media.repository';
import {
  siteBuildRequests,
  media,
  publicationState,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';
import { seedContent } from '@internal/content-adapters-out/lib/seed/content.seed';

const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/content-service/migrations', import.meta.url),
);
const NOW: Date = new Date('2026-11-05T12:00:00Z');
const CLOCK: { now: () => Date } = { now: (): Date => NOW };

describe('Grouped publication (migrated PGlite)', (): void => {
  let handle: ContentDatabaseHandle;
  let publication: DrizzlePublicationRepository;
  const read = (): Promise<PublishedContent> =>
    new GetPublishedContent(new DrizzleContentSnapshotReader(handle.db)).execute();
  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
    await seedContent(handle.db);
    publication = new DrizzlePublicationRepository(handle.db);
  });
  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('holds multiple edits across fresh readers, then atomically exposes one revision and queues one rebuild', async (): Promise<void> => {
    const before: PublishedContent = await read();
    const initial: PublicationStatus = await publication.status();
    const batch: PublicationStatus = await publication.start(initial.version);
    expect(batch).toMatchObject({
      batching: true,
      pendingChanges: false,
      publishedRevision: before.revision,
    });
    const draft: ProfileDraft = {
      heroIntro: { fr: 'Nouvelle introduction', en: 'New introduction' },
      aboutStatement: before.profile.aboutStatement.toProps(),
      aboutLead: before.profile.aboutLead.toProps(),
      facts: [],
      links: [],
    };
    await new ReviseProfile(new DrizzleSiteTextsUnitOfWork(handle.db), CLOCK).execute(
      before.profile.version,
      draft,
    );
    await new UnpublishProject(new DrizzleContentUnitOfWork(handle.db), CLOCK).execute(
      'project-movah',
      1,
    );
    const entry: TimelineEntry | undefined = before.timeline[0];
    if (entry === undefined) throw new Error('Missing timeline fixture');
    await new DeleteTimelineEntry(new DrizzleTimelineUnitOfWork(handle.db), CLOCK).execute(
      entry.kind,
      entry.id,
      entry.version,
    );
    expect((await read()).timeline.map((item) => item.id)).toContain(entry.id);
    expect((await read()).profile.heroIntro.fr).toBe(before.profile.heroIntro.fr);
    expect((await read()).projects.map((project) => project.id)).toContain('project-movah');
    expect((await read()).legal.privacy.updatedAt).toBeInstanceOf(Date);
    expect(await handle.db.select().from(siteBuildRequests)).toEqual([]);
    const changed: PublicationStatus = await publication.status();
    expect(changed).toMatchObject({
      batching: true,
      pendingChanges: true,
      revision: before.revision + 3,
      publishedRevision: before.revision,
    });
    await expect(publication.publish(batch.version, NOW)).rejects.toBeInstanceOf(
      VersionMismatchError,
    );
    const result: PublicationStatus = await publication.publish(changed.version, NOW);
    expect(result).toMatchObject({
      batching: false,
      pendingChanges: false,
      publishedRevision: changed.revision,
    });
    const after: PublishedContent = await read();
    expect(after.timeline.map((item) => item.id)).not.toContain(entry.id);
    expect(after.profile.heroIntro.fr).toBe('Nouvelle introduction');
    expect(after.projects.map((project) => project.id)).not.toContain('project-movah');
    expect(await handle.db.select().from(siteBuildRequests)).toEqual([]);
    await expect(publication.publish(result.version, NOW)).rejects.toBeInstanceOf(
      VersionMismatchError,
    );
  });

  it('recovers an existing frozen batch at startup without dispatching a rebuild', async (): Promise<void> => {
    const before: PublishedContent = await read();
    await publication.start((await publication.status()).version);
    const draft: ProfileDraft = {
      heroIntro: { fr: 'Nouvelle introduction', en: 'New introduction' },
      aboutStatement: before.profile.aboutStatement.toProps(),
      aboutLead: before.profile.aboutLead.toProps(),
      facts: [],
      links: [],
    };
    await new ReviseProfile(new DrizzleSiteTextsUnitOfWork(handle.db), CLOCK).execute(
      before.profile.version,
      draft,
    );
    expect((await read()).profile.heroIntro.fr).toBe(before.profile.heroIntro.fr);
    await publication.recover(NOW);
    expect((await read()).profile.heroIntro.fr).toBe('Nouvelle introduction');
    expect(await publication.status()).toMatchObject({
      batching: false,
      revision: before.revision + 1,
    });
    expect(await handle.db.select().from(siteBuildRequests)).toEqual([]);
    await publication.recover(NOW);
    expect((await publication.status()).batching).toBe(false);
  });

  it('restarts the grace period for media retained throughout a legacy batch', async (): Promise<void> => {
    const id: string = '00000000-0000-4000-8000-000000000002';
    await handle.db.insert(media).values({
      id,
      width: 10,
      height: 10,
      bytes: 10,
      sha256: 'retained',
      hasSmall: false,
      createdAt: new Date(0),
      unlinkedAt: new Date(0),
    });
    await publication.start((await publication.status()).version);
    await publication.recover(NOW);
    const mediaRepository: DrizzleMediaRepository = new DrizzleMediaRepository(handle.db);
    expect(await mediaRepository.delete(id, new Date(NOW.getTime() - 7 * 86400000))).toBe(false);
    expect((await handle.db.select().from(media).where(eq(media.id, id)))[0]?.unlinkedAt).toEqual(
      NOW,
    );
  });

  it('rolls back content and revision together and protects media while a batch is open', async (): Promise<void> => {
    const initial: PublicationStatus = await publication.status();
    await publication.start(initial.version);
    await expect(
      new DrizzleContentUnitOfWork(handle.db).run(
        async ({ projects, buildRequests }): Promise<void> => {
          const project: Project | null = await projects.get('project-movah');
          if (project === null) throw new Error('Missing fixture');
          project.unpublish();
          await projects.save(project, 1);
          await buildRequests.request(NOW);
          throw new Error('Rollback');
        },
      ),
    ).rejects.toThrow('Rollback');
    expect((await publication.status()).revision).toBe(initial.revision);
    const id: string = '00000000-0000-4000-8000-000000000001';
    await handle.db.insert(media).values({
      id,
      width: 10,
      height: 10,
      bytes: 10,
      sha256: 'stale',
      hasSmall: false,
      createdAt: new Date(0),
      unlinkedAt: new Date(0),
    });
    const mediaRepository: DrizzleMediaRepository = new DrizzleMediaRepository(handle.db);
    expect(await mediaRepository.delete(id, NOW)).toBe(false);
    const state: PublicationStatus = await publication.status();
    await publication.publish(state.version, NOW);
    expect(await mediaRepository.delete(id, NOW)).toBe(true);
    expect(
      (await handle.db.select().from(publicationState).where(eq(publicationState.id, 1)))[0]
        ?.frozen,
    ).toBeNull();
  });
});
