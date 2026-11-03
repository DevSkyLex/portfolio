import type { Server as NodeHttpServer } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import { ContactJobs } from '@vfortin/contact-adapters-in';
import { DeliverPendingNotifications } from '@vfortin/contact-application';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateContact } from '@internal/contact-composition/lib/tasks/contact-database/contact-database.tasks';
import { ContactModule } from '@internal/contact-composition/lib/contact.module';

/**
 * Constant MIGRATIONS
 * @readonly
 *
 * @description
 * Migration directory used to verify the explicit database preparation command.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../apps/contact-service/migrations', import.meta.url),
);

describe('migrateContact', (): void => {
  let root: string;

  beforeEach((): void => {
    root = mkdtempSync(join(tmpdir(), 'contact-tasks-'));
  });

  afterEach((): void => {
    rmSync(root, { recursive: true, force: true });
  });

  it('prepares a database the service then starts on, with its workers and SMTP sender', async (): Promise<void> => {
    const url: string = `pglite:${join(root, 'db')}`;
    await migrateContact(url, MIGRATIONS);
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ service: 'contact-test', level: 'silent', pretty: false }),
        AdminAuthModule.forRoot({ issuer: 'https://exemple.fr/api/auth', jwks: { keys: [] } }),
        ContactModule.register({
          databaseUrl: url,
          mail: { url: 'json:', from: 'Portfolio <noreply@exemple.fr>', to: 'moi@exemple.fr' },
          clientKeySecret: 'test-secret',
          workers: true,
        }),
      ],
    }).compile();
    const app: INestApplication<NodeHttpServer> =
      moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
    await app.init();
    expect(app.get<ContactJobs>(ContactJobs)).toBeInstanceOf(ContactJobs);
    await expect(
      app.get<DeliverPendingNotifications>(DeliverPendingNotifications).execute(),
    ).resolves.toEqual({
      sent: 0,
      failed: 0,
      lost: 0,
    });
    await app.close();
    // PGlite on disk, migrations and the Nest application exceed 5 seconds when the workspace tests in parallel.
  }, 30_000);

  it('reports a migration failure after closing the database', async (): Promise<void> => {
    await expect(
      migrateContact(`pglite:${join(root, 'db')}`, join(root, 'absent')),
    ).rejects.toThrow();
  });
});
