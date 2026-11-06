import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test, type TestingModule } from '@nestjs/testing';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import { MediaPurgeJobs } from '@vfortin/content-adapters-in';
import { GetPublishedContent } from '@vfortin/content-application';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  migrateContent,
  seedContentDatabase,
} from '@internal/content-composition/lib/tasks/content-database/content-database.tasks';
import { ContentModule } from '@internal/content-composition/lib/content.module';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute path to the content service's SQL migration directory used by task integration tests.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../apps/content-service/migrations', import.meta.url),
);

describe('migrateContent and seedContentDatabase', (): void => {
  let root: string;

  beforeEach((): void => {
    root = mkdtempSync(join(tmpdir(), 'content-tasks-'));
  });

  afterEach((): void => {
    rmSync(root, { recursive: true, force: true });
  });

  it('prepare a database the service then starts on, with its workers', async (): Promise<void> => {
    const url: string = `pglite:${join(root, 'db')}`;
    await migrateContent(url, MIGRATIONS);
    await seedContentDatabase(url);
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ service: 'content-test', level: 'silent', pretty: false }),
        AdminAuthModule.forRoot({ issuer: 'https://exemple.fr/api/auth', jwks: { keys: [] } }),
        ContentModule.register({
          databaseUrl: url,
          workers: true,
          mediaDirectory: join(root, 'media'),
        }),
      ],
    }).compile();
    const app: INestApplication<Server> =
      moduleRef.createNestApplication<INestApplication<Server>>();
    await app.init();
    expect(app.get<MediaPurgeJobs>(MediaPurgeJobs)).toBeInstanceOf(MediaPurgeJobs);
    await expect(
      app.get<GetPublishedContent>(GetPublishedContent).execute(),
    ).resolves.toMatchObject({ revision: 1 });
    await app.close();
    // PGlite on disk, migrations and the Nest application exceed 5 seconds when the workspace tests in parallel.
  }, 30_000);

  it('report a migration failure after closing the database', async (): Promise<void> => {
    await expect(
      migrateContent(`pglite:${join(root, 'db')}`, join(root, 'absent')),
    ).rejects.toThrow();
  });
});
