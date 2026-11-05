import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import nodemailer from 'nodemailer';
import { validateProductionSecrets } from './validate-production-secrets.mjs';

const signingKey = generateKeyPairSync('ed25519').privateKey.export({
  type: 'pkcs8',
  format: 'pem',
});
const valid = {
  VPS_HOST: 'example.invalid',
  GHCR_USERNAME: 'example',
  GHCR_TOKEN: 'example-token',
  SITE_BUILD_TOKEN: 'example-token',
  BREVO_SMTP_LOGIN: 'user@example.invalid',
  BREVO_SMTP_KEY: 'example-smtp-key',
  CONTACT_CLIENT_KEY_SECRET: 'x'.repeat(32),
  IDENTITY_SIGNING_KEY_K1: signingKey,
  ...Object.fromEntries(
    [
      'POSTGRES_PASSWORD',
      'CONTENT_MIGRATOR_PASSWORD',
      'CONTENT_APP_PASSWORD',
      'CONTACT_MIGRATOR_PASSWORD',
      'CONTACT_APP_PASSWORD',
      'IDENTITY_MIGRATOR_PASSWORD',
      'IDENTITY_APP_PASSWORD',
    ].map((name, index) => [name, String(index).repeat(24)]),
  ),
};

test('accepts complete credentials and a two-key rotation', () => {
  assert.deepEqual(validateProductionSecrets(valid), []);
  assert.deepEqual(
    validateProductionSecrets({
      ...valid,
      IDENTITY_SIGNING_KID: 'k2',
      IDENTITY_SIGNING_KEY_K2: signingKey,
    }),
    [],
  );
});

test('rejects absent, malformed and wrong active credentials without revealing values', () => {
  const marker = 'private-test-value';
  const errors = validateProductionSecrets({
    ...valid,
    POSTGRES_PASSWORD: marker,
    GHCR_TOKEN: '',
    BREVO_SMTP_LOGIN: '',
    BREVO_SMTP_KEY: '',
    CONTACT_CLIENT_KEY_SECRET: 'short',
    IDENTITY_SIGNING_KID: 'k2',
    IDENTITY_SIGNING_KEY_K1: marker,
  });
  for (const name of [
    'POSTGRES_PASSWORD',
    'GHCR_TOKEN',
    'BREVO_SMTP_LOGIN',
    'BREVO_SMTP_KEY',
    'CONTACT_CLIENT_KEY_SECRET',
    'IDENTITY_SIGNING_KEY_K1',
    'IDENTITY_SIGNING_KEY_K2',
  ]) {
    assert.ok(
      errors.some((error) => error.includes(name)),
      name,
    );
  }
  assert.ok(errors.every((error) => !error.includes(marker)));
});

test('rejects reuse of database passwords', () => {
  assert.ok(
    validateProductionSecrets({ ...valid, CONTENT_APP_PASSWORD: valid.POSTGRES_PASSWORD }).includes(
      'Postgres passwords must be distinct',
    ),
  );
});

test('requires the Brevo SMTP login and key without whitespace', () => {
  for (const name of ['BREVO_SMTP_LOGIN', 'BREVO_SMTP_KEY']) {
    for (const value of ['', 'CHANGE_ME', 'invalid value', 'invalid\nvalue']) {
      assert.ok(
        validateProductionSecrets({ ...valid, [name]: value }).some((error) =>
          error.includes(name),
        ),
      );
    }
  }
  assert.deepEqual(validateProductionSecrets({ ...valid, BREVO_SMTP_KEY: 'test:/?@+#%' }), []);
});

test('Nodemailer interprets the encoded Brevo SMTP credentials and TLS settings', () => {
  const login = 'user+test@example.invalid';
  const credential = 'fixture:/?@+#%';
  const url = `smtps://${encodeURIComponent(login)}:${encodeURIComponent(credential)}@smtp-relay.brevo.com:465`;
  const transport = nodemailer.createTransport({ url });
  const options = transport.transporter.options;
  assert.equal(options.host, 'smtp-relay.brevo.com');
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.equal(options.auth.user, login);
  assert.equal(options.auth.pass, credential);
});

test('the deployment workflow passes each application credential to the validator and Ansible', () => {
  const workflow = readFileSync(new URL('../workflows/deploy.yml', import.meta.url), 'utf8');
  const role = readFileSync(
    new URL('../../ansible/roles/portfolio/vars/main.yml', import.meta.url),
    'utf8',
  );
  const tasks = readFileSync(
    new URL('../../ansible/roles/portfolio/tasks/main.yml', import.meta.url),
    'utf8',
  );
  for (const name of [
    'POSTGRES_PASSWORD',
    'CONTENT_MIGRATOR_PASSWORD',
    'CONTENT_APP_PASSWORD',
    'CONTACT_MIGRATOR_PASSWORD',
    'CONTACT_APP_PASSWORD',
    'IDENTITY_MIGRATOR_PASSWORD',
    'IDENTITY_APP_PASSWORD',
    'BREVO_SMTP_LOGIN',
    'BREVO_SMTP_KEY',
    'CONTACT_CLIENT_KEY_SECRET',
    'SITE_BUILD_TOKEN',
    'IDENTITY_SIGNING_KEY_K1',
    'IDENTITY_SIGNING_KEY_K2',
    'SEO_GOOGLE_CREDENTIALS',
    'SEO_PAGESPEED_API_KEY',
  ]) {
    assert.ok(workflow.includes(`${name}: \${{ secrets.${name} }}`), `workflow: ${name}`);
    assert.ok((role + tasks).includes(`'${name}'`), `Ansible: ${name}`);
  }
  assert.ok(workflow.includes('GHCR_TOKEN: ${{ secrets.GHCR_TOKEN || github.token }}'));
  assert.ok(workflow.includes('GHCR_USERNAME: ${{ vars.GHCR_USERNAME || github.actor }}'));
  assert.ok((role + tasks).includes("'GHCR_TOKEN'"));
  assert.ok(
    workflow.indexOf('node ../.github/scripts/validate-production-secrets.mjs') <
      workflow.indexOf('ansible-playbook playbooks/deploy.yml'),
  );
});

test('CLI reports only credential names when validation fails', () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./validate-production-secrets.mjs', import.meta.url))],
    {
      encoding: 'utf8',
      env: { ...valid, GHCR_TOKEN: '', IDENTITY_SIGNING_KEY_K1: 'private-test-value' },
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GHCR_TOKEN/);
  assert.match(result.stderr, /IDENTITY_SIGNING_KEY_K1/);
  assert.doesNotMatch(result.stderr, /private-test-value/);
});
