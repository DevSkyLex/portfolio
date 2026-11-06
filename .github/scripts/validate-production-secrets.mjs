import { createPrivateKey } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const passwordNames = [
  'POSTGRES_PASSWORD',
  'CONTENT_MIGRATOR_PASSWORD',
  'CONTENT_APP_PASSWORD',
  'CONTACT_MIGRATOR_PASSWORD',
  'CONTACT_APP_PASSWORD',
  'IDENTITY_MIGRATOR_PASSWORD',
  'IDENTITY_APP_PASSWORD',
];

/** Validate the deployment inputs without returning or logging their values. */
export function validateProductionSecrets(env) {
  const errors = [];
  const present = (name) => Boolean(env[name]?.trim()) && env[name] !== 'CHANGE_ME';

  for (const name of passwordNames) {
    if (!/^[A-Za-z0-9]{24,}$/.test(env[name] ?? '')) {
      errors.push(`${name} must contain at least 24 alphanumeric characters`);
    }
  }
  if (new Set(passwordNames.map((name) => env[name])).size !== passwordNames.length) {
    errors.push('Postgres passwords must be distinct');
  }
  for (const name of ['VPS_HOST', 'GHCR_USERNAME', 'GHCR_TOKEN']) {
    if (!present(name)) errors.push(`${name} is required`);
  }
  for (const name of ['BREVO_SMTP_LOGIN', 'BREVO_SMTP_KEY']) {
    if (!present(name) || /\s/.test(env[name] ?? '')) {
      errors.push(`${name} must be nonempty and contain no whitespace`);
    }
  }
  if ((env.CONTACT_CLIENT_KEY_SECRET ?? '').length < 32) {
    errors.push('CONTACT_CLIENT_KEY_SECRET must contain at least 32 characters');
  }

  const kid = env.IDENTITY_SIGNING_KID || 'k1';
  if (!['k1', 'k2'].includes(kid)) {
    errors.push('IDENTITY_SIGNING_KID must be k1 or k2');
  }
  for (const slot of ['k1', 'k2']) {
    const name = `IDENTITY_SIGNING_KEY_${slot.toUpperCase()}`;
    if (!present(name)) {
      if (kid === slot) errors.push(`${name} is required for the active signing key`);
      continue;
    }
    try {
      if (createPrivateKey(env[name]).asymmetricKeyType !== 'ed25519') throw new Error();
    } catch {
      errors.push(`${name} must be an unencrypted Ed25519 private key`);
    }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateProductionSecrets(process.env);
  if (errors.length) {
    for (const error of errors) process.stderr.write(`::error::${error}\n`);
    process.exitCode = 1;
  }
}
