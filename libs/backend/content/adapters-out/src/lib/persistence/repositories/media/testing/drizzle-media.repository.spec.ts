import type { MediaRecord } from '@vfortin/content-application';
import { ArticleDocument, type Project } from '@vfortin/content-domain';
import { fileURLToPath } from 'node:url';
import { seedContent } from '@internal/content-adapters-out/lib/seed/content.seed';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  DrizzleContentUnitOfWork,
  DrizzleProjectRepository,
} from '@internal/content-adapters-out/lib/persistence/repositories/content-admin/drizzle-content-admin.repositories';
import { DrizzleContentRepository } from '@internal/content-adapters-out/lib/persistence/repositories/content/drizzle-content.repositories';
import { DrizzleMediaRepository } from '@internal/content-adapters-out/lib/persistence/repositories/media/drizzle-media.repository';

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
 * Constant IDS
 *
 * @description
 * Media identifiers of the fixtures: cover, French figure, English figure, unreferenced.
 */
const IDS: readonly [string, string, string, string] = [
  '8c9d0e1f-2a3b-4c5d-8e6f-7a8b9c0d1e2f',
  '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
  '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e',
];

/**
 * Constant OLD
 *
 * @description
 * Unlink time far before the grace limit of the tests.
 */
const OLD: Date = new Date('2026-10-01T00:00:00Z');

/**
 * Constant LIMIT
 *
 * @description
 * End of the grace period used by the purge queries of the tests.
 */
const LIMIT: Date = new Date('2026-10-26T00:00:00Z');

/**
 * Function record
 *
 * @description
 * Builds a media row unlinked at `OLD`.
 *
 * @param {string} id - Media identifier.
 * @param {number} index - Distinguishes the SHA-256 of the rows.
 * @returns {MediaRecord} Media row.
 */
const record = (id: string, index: number): MediaRecord => ({
  id,
  width: 1200 + index,
  height: 800,
  bytes: 5000,
  sha256: String(index).repeat(64),
  hasSmall: index % 2 === 0,
  createdAt: new Date('2026-09-30T00:00:00Z'),
  unlinkedAt: OLD,
});

/**
 * Function figureDoc
 *
 * @description
 * Builds a document holding a paragraph and a figure.
 *
 * @param {string} media - Media of the figure.
 * @returns {ArticleDocument} Document value.
 */
const figureDoc = (media: string): ArticleDocument =>
  ArticleDocument.of('article', {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Texte' }] },
      { type: 'figure', attrs: { media, alt: 'Écran', caption: '' } },
    ],
  });

describe('DrizzleMediaRepository (Postgres via PGlite)', (): void => {
  let handle: ContentDatabaseHandle;
  let repository: DrizzleMediaRepository;

  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
    await seedContent(handle.db);
    repository = new DrizzleMediaRepository(handle.db);
    for (const [index, id] of IDS.entries()) {
      await repository.insert(record(id, index));
    }
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('round-trips a row and finds it by SHA-256 or identifier', async (): Promise<void> => {
    await expect(repository.findBySha256('0'.repeat(64))).resolves.toEqual(record(IDS[0], 0));
    await expect(repository.findBySha256('f'.repeat(64))).resolves.toBeNull();
    const found: MediaRecord[] = await repository.existing([
      IDS[1],
      IDS[3],
      IDS[2].replace('5', '6'),
    ]);
    expect(found.map((row: MediaRecord): string => row.id).sort()).toEqual([IDS[1], IDS[3]].sort());
    await expect(repository.existing([])).resolves.toEqual([]);
    await expect(
      repository.insert({ ...record(IDS[3], 9), sha256: '0'.repeat(64) }),
    ).rejects.toThrow();
    await expect(
      new DrizzleContentRepository(handle.db).loadMedia([IDS[0], IDS[2]]),
    ).resolves.toHaveLength(2);
    await expect(new DrizzleContentRepository(handle.db).loadMedia([])).resolves.toEqual([]);
  });

  it('marks media unlinked and relinked', async (): Promise<void> => {
    const at: Date = new Date('2026-11-02T10:00:00Z');
    await repository.relink([IDS[0], IDS[1]]);
    await repository.markUnlinked([IDS[1]], at);
    const rows: MediaRecord[] = await repository.existing([IDS[0], IDS[1]]);
    expect(
      Object.fromEntries(
        rows.map((row: MediaRecord): [string, Date | null] => [row.id, row.unlinkedAt]),
      ),
    ).toEqual({ [IDS[0]]: null, [IDS[1]]: at });
  });

  it('purges only unreferenced media unlinked before the limit', async (): Promise<void> => {
    const uow: DrizzleContentUnitOfWork = new DrizzleContentUnitOfWork(handle.db);
    await uow.run(async ({ projects }): Promise<void> => {
      const project: Project | null = await projects.get('project-library-trails');
      if (!project) throw new Error('project missing');
      project.revise(
        {
          ...project.snapshot(),
          article: { fr: figureDoc(IDS[1]), en: figureDoc(IDS[2]) },
          cover: { media: IDS[0], alt: { fr: 'Accueil', en: 'Home' } },
        },
        ['fr', 'en'],
      );
      await projects.save(project, 1);
    });
    const saved: Project | null = await new DrizzleProjectRepository(handle.db).get(
      'project-library-trails',
    );
    expect(saved?.mediaIds()).toEqual([IDS[0], IDS[1], IDS[2]]);
    expect(saved?.snapshot().cover).toEqual({ media: IDS[0], alt: { fr: 'Accueil', en: 'Home' } });

    expect((await repository.stale(LIMIT)).map((row: MediaRecord): string => row.id)).toEqual([
      IDS[3],
    ]);
    await expect(repository.stale(OLD)).resolves.toEqual([]);
    await expect(repository.delete(IDS[0], LIMIT)).resolves.toBe(false);
    await expect(repository.delete(IDS[3], OLD)).resolves.toBe(false);
    await expect(repository.delete(IDS[3], LIMIT)).resolves.toBe(true);
    await expect(repository.existing([IDS[3]])).resolves.toEqual([]);

    // Relinked rows are no longer stale, even unreferenced.
    await repository.relink([IDS[0]]);
    await uow.run(async ({ projects }): Promise<void> => {
      const project: Project | null = await projects.get('project-library-trails');
      if (!project) throw new Error('project missing');
      project.revise({ ...project.snapshot(), cover: null }, ['fr', 'en']);
      await projects.save(project, 2);
    });
    await expect(repository.stale(LIMIT)).resolves.toEqual([]);
  });
});
