import {
  GetPublishedContent,
  ReviseMaintenance,
  VersionMismatchError,
} from '@vfortin/content-application';
import { MaintenanceMode } from '@vfortin/content-domain';
import { fileURLToPath } from 'node:url';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  contentRevision,
  maintenance,
} from '@internal/content-adapters-out/lib/persistence/schema/content.schema';
import { DrizzleContentSnapshotReader } from '@internal/content-adapters-out/lib/persistence/repositories/content/drizzle-content.repositories';
import { DrizzleMaintenanceRepository } from '@internal/content-adapters-out/lib/persistence/repositories/maintenance/drizzle-maintenance.repository';
import { DrizzlePublicationRepository } from '@internal/content-adapters-out/lib/persistence/repositories/publication/drizzle-publication.repository';
import { seedContent } from '@internal/content-adapters-out/lib/seed/content.seed';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute content-service migration directory.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/content-service/migrations', import.meta.url),
);

/**
 * Function on
 *
 * @description
 * Builds an enabled setting with a French message.
 *
 * @returns {MaintenanceMode} Setting at version 1.
 */
function on(): MaintenanceMode {
  return MaintenanceMode.rehydrate({
    enabled: true,
    message: { fr: 'Retour à 14 h.' },
    version: 1,
  });
}

describe('DrizzleMaintenanceRepository (Postgres via PGlite)', (): void => {
  let handle: ContentDatabaseHandle;
  let repository: DrizzleMaintenanceRepository;

  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
    repository = new DrizzleMaintenanceRepository(handle.db);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('reads a database without the row as disabled at version 1, then creates it on first save', async (): Promise<void> => {
    expect((await repository.load()).snapshot()).toEqual({
      enabled: false,
      message: { fr: '' },
      version: 1,
    });
    await expect(repository.save(on(), 1)).resolves.toBe(2);
    expect((await repository.load()).snapshot()).toEqual({
      enabled: true,
      message: { fr: 'Retour à 14 h.' },
      version: 2,
    });
  });

  it('saves only with the read version', async (): Promise<void> => {
    await expect(repository.save(on(), 3)).rejects.toBeInstanceOf(VersionMismatchError);
    await repository.save(on(), 1);
    await expect(repository.save(on(), 1)).rejects.toBeInstanceOf(VersionMismatchError);
    await expect(repository.save(on(), 2)).resolves.toBe(3);
  });

  it('is switched off by the seed, which moves the version', async (): Promise<void> => {
    await repository.save(on(), 1);
    await seedContent(handle.db);
    expect((await repository.load()).snapshot()).toEqual({
      enabled: false,
      message: { fr: '' },
      version: 3,
    });
  });

  it('reaches the public snapshot at once, without a revision, even while a batch is frozen', async (): Promise<void> => {
    await seedContent(handle.db);
    const read: GetPublishedContent = new GetPublishedContent(
      new DrizzleContentSnapshotReader(handle.db),
    );
    expect((await read.execute()).maintenance.enabled).toBe(false);
    const publication: DrizzlePublicationRepository = new DrizzlePublicationRepository(handle.db);
    await publication.start((await publication.status()).version);
    // The first seed writes the row at version 1.
    const revised: MaintenanceMode = await new ReviseMaintenance(repository).execute(1, {
      enabled: true,
      message: { fr: 'Retour à 14 h.', en: 'Back at 2 pm.' },
    });
    expect(revised.version).toBe(2);
    const content: Awaited<ReturnType<GetPublishedContent['execute']>> = await read.execute();
    expect(content.maintenance.enabled).toBe(true);
    expect(content.maintenance.messageIn('en')).toBe('Back at 2 pm.');
    expect((await handle.db.select().from(contentRevision))[0]?.revision).toBe(1);
    expect(await handle.db.select().from(maintenance)).toHaveLength(1);
  });
});
