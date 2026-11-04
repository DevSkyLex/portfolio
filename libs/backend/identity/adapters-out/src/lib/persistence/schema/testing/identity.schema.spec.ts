import { getTableConfig, type UpdateDeleteAction } from 'drizzle-orm/pg-core';
import {
  adminAccounts,
  loginChallenges,
  refreshTokenFamilies,
  refreshTokens,
  trustedDevices,
} from '@internal/identity-adapters-out/lib/persistence/schema/identity.schema';

describe('identity schema', (): void => {
  it('deletes the sessions, challenges and devices of a deleted account, and the tokens of a deleted family', (): void => {
    const references: { from: string; to: string; onDelete: UpdateDeleteAction | undefined }[] = [
      refreshTokenFamilies,
      refreshTokens,
      loginChallenges,
      trustedDevices,
    ].flatMap((table): { from: string; to: string; onDelete: UpdateDeleteAction | undefined }[] =>
      getTableConfig(table).foreignKeys.map(
        (key): { from: string; to: string; onDelete: UpdateDeleteAction | undefined } => ({
          from: getTableConfig(table).name,
          to: getTableConfig(key.reference().foreignTable).name,
          onDelete: key.onDelete,
        }),
      ),
    );
    expect(references).toEqual(
      expect.arrayContaining([
        { from: 'refresh_token_families', to: 'admin_accounts', onDelete: 'cascade' },
        { from: 'refresh_tokens', to: 'refresh_token_families', onDelete: 'cascade' },
        { from: 'refresh_tokens', to: 'admin_accounts', onDelete: 'cascade' },
        { from: 'login_challenges', to: 'admin_accounts', onDelete: 'cascade' },
        { from: 'trusted_devices', to: 'admin_accounts', onDelete: 'cascade' },
      ]),
    );
    expect(getTableConfig(adminAccounts).name).toBe('admin_accounts');
  });

  it('allows an account without an active or pending one-time-code secret', (): void => {
    expect([adminAccounts.totpSecret.notNull, adminAccounts.pendingTotpSecret.notNull]).toEqual([
      false,
      false,
    ]);
  });
});
