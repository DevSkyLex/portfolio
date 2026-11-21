import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { ScryptPasswordHasher } from '@internal/identity-adapters-out/lib/crypto/crypto.adapters';
import {
  IDENTITY_FIXTURE_ADMIN,
  loadIdentityFixtures,
} from '@internal/identity-adapters-out/lib/fixtures/identity.fixtures';
import {
  type IdentityDatabaseHandle,
  migrateIdentityDatabase,
  openIdentityDatabase,
} from '@internal/identity-adapters-out/lib/persistence/database/identity-database';
import { adminAccounts } from '@internal/identity-adapters-out/lib/persistence/schema/identity.schema';

/**
 * Constant MIGRATIONS
 *
 * @description
 * Identity service migrations applied to the in-memory database.
 *
 * @type {string}
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../../apps/identity-service/migrations', import.meta.url),
);

describe('loadIdentityFixtures', (): void => {
  let handle: IdentityDatabaseHandle;
  const hasher: ScryptPasswordHasher = new ScryptPasswordHasher();

  beforeEach(async (): Promise<void> => {
    handle = await openIdentityDatabase('pglite:memory');
    await migrateIdentityDatabase(handle, MIGRATIONS);
  });

  afterEach(async (): Promise<void> => {
    await handle.close();
  });

  it('creates the fixture administrator with the documented password', async (): Promise<void> => {
    expect(await loadIdentityFixtures(handle.db, hasher)).toEqual({
      email: 'admin@localhost.test',
    });
    const [row] = await handle.db.select().from(adminAccounts);
    expect(row?.email).toBe(IDENTITY_FIXTURE_ADMIN.email);
    expect(await hasher.verify(IDENTITY_FIXTURE_ADMIN.password, row?.passwordHash ?? '')).toBe(
      true,
    );
    expect(row?.totpSecret).toBeNull();
  });

  it('resets an existing account of that e-mail so the fixture credentials sign in', async (): Promise<void> => {
    await handle.db.insert(adminAccounts).values({
      id: 'existing',
      email: IDENTITY_FIXTURE_ADMIN.email,
      passwordHash: await hasher.hash('another password value'),
      totpSecret: 'JBSWY3DPEHPK3PXP',
      pendingTotpSecret: 'KRSXG5CTMVRXEZLU',
      failedAttempts: 5,
      lockedUntil: new Date('2999-01-01T00:00:00Z'),
    });
    await loadIdentityFixtures(handle.db, hasher);
    const rows: (typeof adminAccounts.$inferSelect)[] = await handle.db
      .select()
      .from(adminAccounts)
      .where(eq(adminAccounts.email, IDENTITY_FIXTURE_ADMIN.email));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'existing',
      totpSecret: null,
      pendingTotpSecret: null,
      failedAttempts: 0,
      lockedUntil: null,
    });
    expect(await hasher.verify(IDENTITY_FIXTURE_ADMIN.password, rows[0]?.passwordHash ?? '')).toBe(
      true,
    );
  });
});
