import { bootstrapAdmin, generateSigningKey, migrateIdentity } from '@vfortin/identity-composition';
import { join } from 'node:path';
import {
  type IdentityServiceConfig,
  loadIdentityServiceConfig,
} from '@internal/identity-service/config';

/**
 * Function run
 *
 * @description
 * Runs explicit identity database and account administration operations outside normal HTTP startup.
 * Bootstrap credentials are read from the environment and generated secrets are printed for operator setup.
 *
 * @param {string[]} command - CLI arguments containing an operation and its optional argument.
 * @returns {Promise<void>} Completion after the selected administrative operation finishes.
 *
 * @example
 * `node cli.js migrate` applies the migrations.
 * `node cli.js generate-key [kid]` creates an Ed25519 key in `IDENTITY_KEYS_DIR`.
 * `node cli.js bootstrap-admin <e-mail>` creates the admin account; the password is read from `IDENTITY_BOOTSTRAP_PASSWORD`.
 */
async function run([command, argument]: string[]): Promise<void> {
  const config: IdentityServiceConfig = loadIdentityServiceConfig();
  switch (command) {
    case 'migrate':
      await migrateIdentity(
        config.IDENTITY_DATABASE_URL,
        config.IDENTITY_MIGRATIONS_DIR ?? join(__dirname, 'migrations'),
      );
      console.log('Identity service migrations applied.');
      return;
    case 'generate-key': {
      const path: string = await generateSigningKey(
        config.IDENTITY_KEYS_DIR,
        argument ?? config.IDENTITY_SIGNING_KID,
      );
      console.log(`Key created: ${path}`);
      return;
    }
    case 'bootstrap-admin': {
      const password: string | undefined = process.env['IDENTITY_BOOTSTRAP_PASSWORD'];
      if (!argument || !password) {
        throw new Error(
          'Usage: IDENTITY_BOOTSTRAP_PASSWORD=… node cli.js bootstrap-admin <e-mail>',
        );
      }
      const result: Awaited<ReturnType<typeof bootstrapAdmin>> = await bootstrapAdmin(
        config.IDENTITY_DATABASE_URL,
        argument,
        password,
      );
      console.log(`Account created for ${result.email}.`);
      console.log('Add this account to an authenticator app (TOTP):');
      console.log(result.provisioningUri);
      console.log(`Secret (manual entry): ${result.totpSecret}`);
      return;
    }
    default:
      throw new Error(
        `Unknown command "${command ?? ''}": migrate, generate-key or bootstrap-admin.`,
      );
  }
}

run(process.argv.slice(2)).catch((error: unknown): never => {
  console.error(error instanceof Error ? error.message : error);

  // Technical cause (Postgres error, network…): essential to diagnose a migration.
  if (error instanceof Error && error.cause) console.error(error.cause);
  process.exit(1);
});
