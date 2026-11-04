import type { Server as NodeHttpServer } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ObservabilityModule } from '@vfortin/backend-observability';
import {
  AlreadyBootstrappedError,
  Login,
  type BootstrapResult,
  type LoginResult,
} from '@vfortin/identity-application';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IdentityModule } from '@internal/identity-composition/lib/identity.module';
import {
  bootstrapAdmin,
  generateSigningKey,
  migrateIdentity,
} from '@internal/identity-composition/lib/tasks/identity/identity.tasks';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Absolute path to the identity migration files used by operational task integration tests.
 *
 * @type {string}
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../../apps/identity-service/migrations', import.meta.url),
);

describe('migrateIdentity, generateSigningKey and bootstrapAdmin', (): void => {
  /**
   * Variable root
   *
   * @description
   * Temporary root for the database files and signing-key directory created by each test.
   *
   * @type {string}
   */
  let root: string;

  beforeEach((): void => {
    root = mkdtempSync(join(tmpdir(), 'identity-tasks-'));
  });

  afterEach((): void => {
    rmSync(root, { recursive: true, force: true });
  });

  it('prepare a password-only account the service then logs in with', async (): Promise<void> => {
    const url: string = `pglite:${join(root, 'db')}`;
    const keysDir: string = join(root, 'keys');
    await migrateIdentity(url, MIGRATIONS);
    await generateSigningKey(keysDir, 'k1');
    const account: BootstrapResult = await bootstrapAdmin(
      url,
      'Moi@Exemple.fr',
      'a-strong-password',
    );
    // Password only: no secret is produced, the code is enrolled later from the admin.
    expect(account).toEqual({ email: 'moi@exemple.fr' });
    await expect(
      bootstrapAdmin(url, 'autre@exemple.fr', 'another-password'),
    ).rejects.toBeInstanceOf(AlreadyBootstrappedError);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ service: 'identity-test', level: 'silent', pretty: false }),
        IdentityModule.register({
          databaseUrl: url,
          keysDir,
          signingKid: 'k1',
          issuer: 'https://exemple.fr/api/auth',
          cookieSecure: true,
        }),
      ],
    }).compile();
    const app: INestApplication<NodeHttpServer> =
      moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
    await app.init();
    const first: LoginResult = await app.get<Login>(Login).execute({
      email: 'moi@exemple.fr',
      password: 'a-strong-password',
      remember: false,
      deviceToken: null,
    });
    expect(first).toMatchObject({
      status: 'authenticated',
      session: { access: { expiresIn: 300 } },
    });
    await app.close();
    // PGlite on disk and scrypt exceed 5 seconds when the workspace tests in parallel.
  }, 30_000);

  it('report a migration failure after closing the database', async (): Promise<void> => {
    await expect(
      migrateIdentity(`pglite:${join(root, 'db')}`, join(root, 'absent')),
    ).rejects.toThrow();
  });
});
