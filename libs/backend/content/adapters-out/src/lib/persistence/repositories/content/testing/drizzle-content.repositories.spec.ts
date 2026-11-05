import { GetPublishedContent, type PublishedContent } from '@vfortin/content-application';
import type { Profile } from '@vfortin/content-domain';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toTimelineEntry } from '@internal/content-adapters-out/lib/persistence/mappers/content/content.mappers';
import { seedContent } from '@internal/content-adapters-out/lib/seed/content.seed';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  openContentDatabase,
} from '@internal/content-adapters-out/lib/persistence/database/content-database';
import {
  DrizzleContentRepository,
  DrizzleContentSnapshotReader,
} from '@internal/content-adapters-out/lib/persistence/repositories/content/drizzle-content.repositories';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute content-service migration directory used to prepare the in-memory database.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../../apps/content-service/migrations', import.meta.url),
);

describe('DrizzleContentRepository (Postgres via PGlite)', (): void => {
  let handle: ContentDatabaseHandle;

  beforeEach(async (): Promise<void> => {
    handle = await openContentDatabase('pglite:memory');
    await migrateContentDatabase(handle, MIGRATIONS);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('publishes a minimal profile without sample collections on a fresh database', async (): Promise<void> => {
    const content: PublishedContent = await new GetPublishedContent(
      new DrizzleContentSnapshotReader(handle.db),
    ).execute();
    expect(content.revision).toBe(0);
    expect(content.profile.heroIntro.fr).toBe('Portfolio de Valentin Fortin.');
    expect(content.profile.heroIntro.en).toBe("Valentin Fortin's portfolio.");
    expect(content.projects).toEqual([]);
    expect(content.timeline).toEqual([]);
    expect(content.skills).toEqual([]);
    expect(JSON.stringify(content.legal.privacy.body)).toContain('Brevo');
  });

  it('does not replace an existing profile when the initialization SQL is repeated', async (): Promise<void> => {
    await seedContent(handle.db);
    const repository: DrizzleContentRepository = new DrizzleContentRepository(handle.db);
    const original: Profile = await repository.loadProfile();
    const migration: string = readFileSync(
      new URL(
        '../../../../../../../../../../apps/content-service/migrations/0014_initial_profile.sql',
        import.meta.url,
      ),
      'utf8',
    );
    await handle.db.execute(sql.raw(migration));
    expect(await repository.loadProfile()).toEqual(original);
    expect(await repository.currentRevision()).toBe(1);
  });

  it('reads the mockup content back as domain objects', async (): Promise<void> => {
    await seedContent(handle.db);
    const content: PublishedContent = await new GetPublishedContent(
      new DrizzleContentSnapshotReader(handle.db),
    ).execute();

    expect(content.revision).toBe(1);
    expect(content.projects.map((p): string => p.slug.value)).toEqual([
      'movah',
      'rdi-manager',
      'crm-kodoka',
      'iotplatform',
    ]);
    expect(content.timeline.map((e): string => e.id)).toEqual([
      'bts-sio',
      'bachelor-cefii',
      'mastere-ynov',
      'utopia',
      'kodoka',
      'object-as-a-service',
    ]);
    expect(content.skills.map((s): string => s.id)).toEqual([
      'front-end',
      'back-end',
      'cms',
      'outils',
    ]);
    expect(content.profile.facts).toHaveLength(3);
  });

  it('increments the revision on each new load', async (): Promise<void> => {
    await seedContent(handle.db);
    await seedContent(handle.db);
    expect(await new DrizzleContentRepository(handle.db).currentRevision()).toBe(2);
  });
});

describe('toTimelineEntry', (): void => {
  const row: {
    id: string;
    kind: 'experience';
    title: { fr: string };
    place: { fr: string };
    description: { fr: string };
    startYear: number;
    startMonth: number;
    endYear: number;
    endMonth: number;
    techs: string[];
    position: number;
    version: number;
  } = {
    id: 'poste',
    kind: 'experience' as const,
    title: { fr: 'Développeur' },
    place: { fr: 'Tours' },
    description: { fr: 'Interfaces IoT.' },
    startYear: 2023,
    startMonth: 9,
    endYear: 2026,
    endMonth: 6,
    techs: ['angular'],
    position: 2,
    version: 3,
  };

  it('reads an ended period, and an ongoing one when the end is incomplete', (): void => {
    expect(toTimelineEntry(row).period.end).toEqual({ year: 2026, month: 6 });
    expect(toTimelineEntry({ ...row, endMonth: null }).period.isOngoing()).toBe(true);
    expect(toTimelineEntry({ ...row, endYear: null }).period.isOngoing()).toBe(true);
  });

  it('keeps the position and version', (): void => {
    expect(toTimelineEntry(row)).toMatchObject({ position: 2, version: 3 });
  });
});
