// Tests of guard.mjs: `node --test .claude/hooks/guard.test.mjs`. Nothing is written to the checkout.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateWrite, findRepoRoot, writtenText } from './guard.mjs';

/**
 * Constant here
 *
 * @description
 * Directory containing this test module, used to locate the hook under test.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
/**
 * Constant root
 *
 * @description
 * Repository root derived from the hook test directory for simulated tool payloads.
 */
const root = path.resolve(here, '../..');
/**
 * Constant fakeGithubToken
 *
 * @description
 * Runtime-assembled token-shaped fixture used to verify secret detection without storing a complete token literal.
 */
const fakeGithubToken = ['gh', 'p_', 'A'.repeat(36)].join('');
/**
 * Constant fakeNpmToken
 *
 * @description
 * Runtime-assembled npm credential fixture used to verify secret detection.
 */
const fakeNpmToken = ['npm', '_', 'b'.repeat(36)].join('');
/**
 * Constant fakePem
 *
 * @description
 * Runtime-assembled private-key marker used to verify PEM detection.
 */
const fakePem = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');

for (const [file, text] of [
  [
    'libs/frontend/content/ui/src/lib/project-card/project-card.component.ts',
    "import { RevealDirective } from '@vfortin/ui';",
  ],
  [
    'libs/frontend/contact/feature/src/lib/ui/sections/contact-section/contact-section.component.ts',
    "import { form } from '@angular/forms/signals';",
  ],
  [
    'libs/frontend/content/feature/src/index.ts',
    "export { CONTENT_ROUTES } from './lib/content.routes';",
  ],
  ['libs/frontend/ui/src/index.ts', "export * from './lib/button/button.directive';"],
  [
    'libs/backend/contact/domain/src/lib/message/contact-message.ts',
    "import { InvalidValueError } from '../errors/domain-error';",
  ],
  [
    'libs/backend/contact/application/src/lib/ports/contact/contact.ports.ts',
    "import type { ContactMessage } from '@vfortin/contact-domain';",
  ],
  [
    'libs/backend/contact/adapters-out/src/lib/persistence/schema/contact.schema.ts',
    "import { pgSchema } from 'drizzle-orm/pg-core';",
  ],
  ['libs/contracts/contact/src/lib/contact-message.contract.ts', "import { z } from 'zod/mini';"],
  [
    'apps/web/src/styles.css',
    "@import 'tailwindcss';\n@layer base {\n  html {\n    color: var(--fg);\n  }\n}",
  ],
  [
    'apps/web/src/locale/messages.en.xlf',
    '<trans-unit id="x"><target>All projects</target></trans-unit>',
  ],
  ['apps/contact-service/migrations/0001_example.sql', 'CREATE TABLE contact.example ();'],
  ['ansible/inventory/group_vars/all/vault.example.yml', 'vault_postgres_password: change-me'],
  ['.env.example', 'CONTACT_PORT=3102'],
  ['docs/architecture/decisions.md', '# Architecture decisions'],
  ['.claude/agents/pf-web-component-builder.md', '---\nname: pf-web-component-builder\n---'],
  ['.agents/skills/pf-nestjs/SKILL.md', '---\nname: pf-nestjs\n---'],
  ['.agents/skills/pf-drizzle-postgres/references/queries.md', '# Transactions'],
  ['.agents/scripts/comment-diff.mjs', 'export const syntaxCheck = true;'],
  ['.githooks/pre-push', '#!/bin/sh'],
  ['package.json', '{}'],
]) {
  void test(`allows ${file}`, () => assert.equal(evaluateWrite(file, text), null));
}

for (const [file, text = ''] of [
  ['dist/apps/web/browser/index.html'],
  ['node_modules/@angular/core/package.json'],
  ['.angular/cache/x'],
  ['.nx/workspace-data/project-graph.json'],
  ['coverage/libs/frontend/ui/index.html'],
  ['test-results/report.json'],
  ['apps/web-e2e/test-results/trace.zip'],
  ['playwright-report/index.html'],
  ['out-tsc/x.js'],
  ['tmp/x.js'],
  ['apps/web/content-snapshot/fr.json'],
  ['apps/contact-service/migrations/meta/_journal.json'],
  ['ansible/.collections/ansible_collections/x.yml'],
  ['package-lock.json'],
  ['apps/web/src/locale/messages.xlf'],
  ['.git/config'],
  ['.git'],
  ['.agents/skills/nx-workspace/SKILL.md'],
  ['.agents/skills/angular-developer/SKILL.md'],
  ['.agents/skills/pf-nestjs/.env'],
  ['.agents/skills/pf-/SKILL.md'],
  ['.agents/skills/pf-nestjs'],
  ['.agents/skills/pf-nestjs/../angular-developer/SKILL.md'],
  ['.github/skills/nx-generate/SKILL.md'],
  ['.github/agents/ci-monitor-subagent.agent.md'],
  ['.codex/agents/ci-monitor-subagent.toml'],
  ['opencode.json'],
  ['apps/contact-service/.env'],
  ['.env.local'],
  ['.data/content/PG_VERSION'],
  ['.data/dev-admin.env'],
  ['ansible/inventory/group_vars/all/vault.yml'],
  ['ansible/inventory/group_vars/all/vault.yml.dec'],
  ['ansible/.vault-pass'],
  ['docker/dev/secrets/postgres_password'],
  ['keys/k1.pem'],
  ['docs/notes.md', `token: ${fakeGithubToken}`],
  ['apps/web/scripts/example.mjs', `const t = '${fakeNpmToken}';`],
  ['docs/operations/deployment.md', `${fakePem}\nabc`],
  ['apps/web/src/styles.css', '.hero {\n  color: red;\n}'],
  ['libs/frontend/content/ui/src/lib/x/x.component.ts', "styleUrl: './x.component.css',"],
  [
    'libs/frontend/contact/feature/src/lib/x.component.ts',
    "import { FormBuilder, Validators } from '@angular/forms';",
  ],
  ['libs/frontend/content/feature/src/index.ts', "export * from './lib/content.routes';"],
  ['libs/frontend/ui/src/index.ts', "export * from './lib/menu-panel/menu-panel.classes';"],
  ['libs/frontend/ui/src/index.ts', "export * from './lib/combobox/combobox.token';"],
  ['libs/backend/contact/domain/src/lib/x.ts', "import { Injectable } from '@nestjs/common';"],
  ['libs/backend/contact/domain/src/lib/x.ts', "import { z } from 'zod';"],
  ['libs/backend/content/application/src/lib/x.ts', "import { eq } from 'drizzle-orm';"],
]) {
  void test(`denies ${file}${text ? ` (${text.slice(0, 50)})` : ''}`, () =>
    assert.notEqual(evaluateWrite(file, text), null));
}

void test('Zod stays allowed in application, only the domain bans it', () => {
  assert.equal(
    evaluateWrite('libs/backend/content/application/src/lib/x.ts', "import { z } from 'zod';"),
    null,
  );
});

void test('MultiEdit text is the concatenation of every new_string', () => {
  assert.equal(writtenText({ edits: [{ new_string: 'a' }, { new_string: 'b' }] }), 'a\nb');
  assert.equal(writtenText({ content: 'c' }), 'c');
  assert.equal(writtenText({ new_string: 'd' }), 'd');
  assert.equal(writtenText(undefined), '');
});

void test('finds the checkout from a nested path', () => {
  assert.equal(findRepoRoot(path.join(root, 'libs', 'frontend', 'ui')), root);
});

/**
 * Function run
 *
 * @description
 * Starts the write guard with a simulated hook payload and captures its exit status and output.
 *
 * @param {object | string} input - Payload object or raw input text passed to standard input.
 * @returns {import('node:child_process').SpawnSyncReturns<string>} Child process result.
 */
const run = (input) =>
  spawnSync(process.execPath, [path.join(here, 'guard.mjs')], {
    cwd: root,
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    windowsHide: true,
  });

void test('the CLI denies an absolute path inside the repository with exit 2', () => {
  const result = run({
    cwd: root,
    tool_name: 'Write',
    tool_input: { file_path: path.join(root, 'dist', 'x.js'), content: '' },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Blocked: dist\/x\.js/);
});

void test('the CLI allows an ordinary edit and ignores files outside the repository', () => {
  assert.equal(
    run({
      cwd: root,
      tool_input: { file_path: path.join(root, 'docs', 'README.md'), new_string: 'x' },
    }).status,
    0,
  );
  const outside = path.join(path.parse(root).root, 'elsewhere', 'dist', 'x.js');
  assert.equal(run({ cwd: root, tool_input: { file_path: outside, content: '' } }).status, 0);
  assert.equal(run('not json').status, 0);
  assert.equal(run({ cwd: root, tool_input: {} }).status, 0);
});
