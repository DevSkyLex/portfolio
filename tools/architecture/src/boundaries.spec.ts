import { ESLint, type Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

/*
 * Proof that the boundaries hold: each forbidden import is linted as if it were written in the
 * given project, and must be rejected; a few allowed imports serve as controls.
 * Add a case for every new rule or new kind of project.
 */

/**
 * Constant WORKSPACE
 *
 * @description
 * Resolves the repository root used for in-memory ESLint probes.
 */
const WORKSPACE: string = join(import.meta.dirname, '..', '..', '..');

// Probe files do not exist on disk: type-aware rules (project service) are switched off.

/**
 * Constant eslint
 *
 * @description
 * Configures the workspace boundary rule with type-aware rules disabled for virtual probe files.
 */
const eslint: ESLint = new ESLint({
  cwd: WORKSPACE,
  overrideConfig: [{ ...tseslint.configs.disableTypeChecked, files: ['**/*.ts'] }],
});

/**
 * Function boundaryErrors
 *
 * @description
 * Lints a virtual module at a project path and returns only module-boundary diagnostics.
 *
 * @param {string} file - Workspace-relative probe path that selects project tags.
 * @param {string} specifier - Module specifier used by the virtual import.
 * @returns {Promise<string[]>} Boundary-rule error messages produced for the probe.
 */
async function boundaryErrors(file: string, specifier: string): Promise<string[]> {
  const [result] = await eslint.lintText(
    `import * as probe from '${specifier}';\nexport { probe };\n`,
    {
      filePath: join(WORKSPACE, file),
    },
  );
  return (result?.messages ?? [])
    .filter(
      (message: Linter.LintMessage): boolean => message.ruleId === '@nx/enforce-module-boundaries',
    )
    .map((message: Linter.LintMessage): string => message.message);
}

/**
 * Constant DOMAIN
 *
 * @description
 * Virtual source path placing a forbidden-import probe in the content domain project.
 */
const DOMAIN: string = 'libs/backend/content/domain/src/lib/probe.ts';

/**
 * Constant APPLICATION
 *
 * @description
 * Virtual source path placing a forbidden-import probe in the content application project.
 */
const APPLICATION: string = 'libs/backend/content/application/src/lib/probe.ts';

/**
 * Constant ADAPTERS_IN
 *
 * @description
 * Virtual source path placing an import probe in the content inbound-adapter project.
 */
const ADAPTERS_IN: string = 'libs/backend/content/adapters-in/src/lib/probe.ts';

/**
 * Constant ADAPTERS_OUT
 *
 * @description
 * Virtual source path placing an import probe in the content outbound-adapter project.
 */
const ADAPTERS_OUT: string = 'libs/backend/content/adapters-out/src/lib/probe.ts';

/**
 * Constant COMPOSITION
 *
 * @description
 * Virtual source path placing an import probe in the content composition project.
 */
const COMPOSITION: string = 'libs/backend/content/composition/src/lib/probe.ts';

/**
 * Constant CONTRACTS
 *
 * @description
 * Virtual source path placing an import probe in the content contract project.
 */
const CONTRACTS: string = 'libs/contracts/content/src/lib/probe.ts';

/**
 * Constant UI
 *
 * @description
 * Virtual source path placing an import probe in the generic frontend UI project.
 */
const UI: string = 'libs/frontend/ui/src/lib/probe.ts';

/**
 * Constant SERVICE
 *
 * @description
 * Virtual source path placing an import probe in the content service application.
 */
const SERVICE: string = 'apps/content-service/src/probe.ts';

/**
 * Constant CONTENT_UI
 *
 * @description
 * Virtual source path placing an import probe in the content presentation project.
 */
const CONTENT_UI: string = 'libs/frontend/content/ui/src/lib/probe.ts';

/**
 * Constant CONTENT_DATA
 *
 * @description
 * Virtual source path placing an import probe in content frontend data access.
 */
const CONTENT_DATA: string = 'libs/frontend/content/data-access/src/lib/probe.ts';

/**
 * Constant CONTENT_FEATURE
 *
 * @description
 * Virtual source path placing an import probe in the content frontend feature project.
 */
const CONTENT_FEATURE: string = 'libs/frontend/content/feature/src/lib/probe.ts';

/**
 * Constant SHELL
 *
 * @description
 * Virtual source path placing an import probe in the frontend shell project.
 */
const SHELL: string = 'libs/frontend/shell/src/lib/probe.ts';

/**
 * Constant WEB
 *
 * @description
 * Virtual source path placing an import probe in the public web application.
 */
const WEB: string = 'apps/web/src/app/probe.ts';

/**
 * Constant CONTACT_DOMAIN
 *
 * @description
 * Virtual source path placing an import probe in the contact domain project.
 */
const CONTACT_DOMAIN: string = 'libs/backend/contact/domain/src/lib/probe.ts';

/**
 * Constant CONTACT_APPLICATION
 *
 * @description
 * Virtual source path placing an import probe in the contact application project.
 */
const CONTACT_APPLICATION: string = 'libs/backend/contact/application/src/lib/probe.ts';

/**
 * Constant CONTACT_ADAPTERS_IN
 *
 * @description
 * Virtual source path placing an import probe in the contact inbound-adapter project.
 */
const CONTACT_ADAPTERS_IN: string = 'libs/backend/contact/adapters-in/src/lib/probe.ts';

/**
 * Constant CONTACT_ADAPTERS_OUT
 *
 * @description
 * Virtual source path placing an import probe in the contact outbound-adapter project.
 */
const CONTACT_ADAPTERS_OUT: string = 'libs/backend/contact/adapters-out/src/lib/probe.ts';

/**
 * Constant CONTACT_DATA
 *
 * @description
 * Virtual source path placing an import probe in contact frontend data access.
 */
const CONTACT_DATA: string = 'libs/frontend/contact/data-access/src/lib/probe.ts';

/**
 * Constant CONTACT_FEATURE
 *
 * @description
 * Virtual source path placing an import probe in the contact frontend feature project.
 */
const CONTACT_FEATURE: string = 'libs/frontend/contact/feature/src/lib/probe.ts';

/**
 * Constant PLATFORM_HTTP
 *
 * @description
 * Virtual source path placing an import probe in the server HTTP platform project.
 */
const PLATFORM_HTTP: string = 'libs/backend/platform/http/src/lib/probe.ts';

/**
 * Constant WEB_HTTP
 *
 * @description
 * Virtual source path placing an import probe in the browser HTTP platform project.
 */
const WEB_HTTP: string = 'libs/frontend/http/src/lib/probe.ts';

/**
 * Constant IDENTITY_DOMAIN
 *
 * @description
 * Virtual source path placing an import probe in the identity domain project.
 */
const IDENTITY_DOMAIN: string = 'libs/backend/identity/domain/src/lib/probe.ts';

/**
 * Constant IDENTITY_COMPOSITION
 *
 * @description
 * Virtual source path placing an import probe in the identity composition project.
 */
const IDENTITY_COMPOSITION: string = 'libs/backend/identity/composition/src/lib/probe.ts';

/**
 * Constant PLATFORM_AUTH
 *
 * @description
 * Virtual source path placing an import probe in the server authentication platform project.
 */
const PLATFORM_AUTH: string = 'libs/backend/platform/auth/src/lib/probe.ts';

/**
 * Constant IDENTITY_DATA
 *
 * @description
 * Virtual source path placing an import probe in identity frontend data access.
 */
const IDENTITY_DATA: string = 'libs/frontend/identity/data-access/src/lib/probe.ts';

/**
 * Constant CONTENT_ADMIN
 *
 * @description
 * Virtual source path placing an import probe in the content administration feature project.
 */
const CONTENT_ADMIN: string = 'libs/frontend/content/feature-admin/src/lib/probe.ts';

/**
 * Constant LEGAL
 *
 * @description
 * Virtual source path placing an import probe in the legal frontend feature project.
 */
const LEGAL: string = 'libs/frontend/legal/feature/src/lib/probe.ts';

/**
 * Constant CONTENT_MODEL
 *
 * @description
 * Virtual source path placing an import probe in the content frontend model project.
 */
const CONTENT_MODEL: string = 'libs/frontend/content/model/src/lib/probe.ts';

/**
 * Constant E2E
 *
 * @description
 * Virtual source path placing an import probe in the web end-to-end project.
 */
const E2E: string = 'apps/web-e2e/src/probe.ts';

/**
 * Constant TOOLING
 *
 * @description
 * Virtual source path placing an import probe in the architecture tooling project.
 */
const TOOLING: string = 'tools/architecture/src/probe.ts';

describe('rejected imports', (): void => {
  it.each([
    ['domain to NestJS', DOMAIN, '@nestjs/common'],
    [
      'domain spec to NestJS',
      'libs/backend/content/domain/src/lib/testing/probe.spec.ts',
      '@nestjs/testing',
    ],
    [
      'application spec to NestJS',
      'libs/backend/content/application/src/lib/testing/probe.spec.ts',
      '@nestjs/testing',
    ],
    ['domain to Zod', DOMAIN, 'zod'],
    ['domain to application', DOMAIN, '@vfortin/content-application'],
    ['application to persistence', APPLICATION, '@vfortin/content-adapters-out'],
    ['application to Drizzle', APPLICATION, 'drizzle-orm'],
    ['persistence to contracts', ADAPTERS_OUT, '@vfortin/content-contracts'],
    ['composition to contracts', COMPOSITION, '@vfortin/content-contracts'],
    ['contracts to domain', CONTRACTS, '@vfortin/content-domain'],
    ['contracts to NestJS', CONTRACTS, '@nestjs/common'],
    ['service to persistence', SERVICE, '@vfortin/content-adapters-out'],
    ['service to use cases', SERVICE, '@vfortin/content-application'],
    ['web UI to backend domain', UI, '@vfortin/content-domain'],
    ['web UI to contracts', UI, '@vfortin/content-contracts'],
    ['web UI to HttpClient', UI, '@angular/common/http'],
    ['generic UI to a business model', UI, '@vfortin/content-web-model'],
    ['context UI to data access', CONTENT_UI, '@vfortin/content-web-data-access'],
    ['feature to contracts', CONTENT_FEATURE, '@vfortin/content-contracts'],
    ['data access to backend domain', CONTENT_DATA, '@vfortin/content-domain'],
    ['web application to a feature', WEB, '@vfortin/content-web-feature'],
    ['web application to data access', WEB, '@vfortin/content-web-data-access'],
    ['shell to contracts', SHELL, '@vfortin/content-contracts'],
    ["a domain to another context's domain", CONTACT_DOMAIN, '@vfortin/content-domain'],
    ['contact domain to nodemailer', CONTACT_DOMAIN, 'nodemailer'],
    ['application to the NestJS scheduler', CONTACT_APPLICATION, '@nestjs/schedule'],
    [
      "an adapter to another context's application",
      CONTACT_ADAPTERS_IN,
      '@vfortin/content-application',
    ],
    [
      "data access to another context's data access",
      CONTACT_DATA,
      '@vfortin/content-web-data-access',
    ],
    ["a feature to another context's feature", CONTACT_FEATURE, '@vfortin/content-web-feature'],
    ['a feature to the HTTP client', CONTACT_FEATURE, '@vfortin/web-http'],
    ['server HTTP platform to a domain', PLATFORM_HTTP, '@vfortin/contact-domain'],
    ['web HTTP platform to contracts', WEB_HTTP, '@vfortin/contact-contracts'],
    ['identity domain to jose', IDENTITY_DOMAIN, 'jose'],
    ['identity composition to contracts', IDENTITY_COMPOSITION, '@vfortin/identity-contracts'],
    ['token verification to a domain', PLATFORM_AUTH, '@vfortin/identity-domain'],
    [
      'content admin to the session (other context)',
      CONTENT_ADMIN,
      '@vfortin/identity-web-data-access',
    ],
    ['content admin to contracts', CONTENT_ADMIN, '@vfortin/content-contracts'],
    ['identity data access to content admin', IDENTITY_DATA, '@vfortin/content-web-feature-admin'],
    ['a deep import into a library', ADAPTERS_IN, '@vfortin/content-domain/src/lib/values/slug'],
    [
      'a deep import next to a secondary entry point',
      SHELL,
      '@vfortin/identity-web-data-access/src/lib/state/session.store',
    ],
    ['a relative import into another project', CONTENT_FEATURE, '../../../ui/src/index'],
    ['application to Zod', APPLICATION, 'zod'],
    ['application to zod/mini', APPLICATION, 'zod/mini'],
    ['application to Angular', APPLICATION, '@angular/core'],
    ['domain to Angular', DOMAIN, '@angular/core'],
    ['domain to rxjs', DOMAIN, 'rxjs'],
    ['generic UI to a feature', UI, '@vfortin/content-web-feature'],
    ['generic UI to data access', UI, '@vfortin/content-web-data-access'],
    ['generic UI to NgRx', UI, '@ngrx/signals'],
    ['context UI to a feature', CONTENT_UI, '@vfortin/content-web-feature'],
    ['context UI to the shell', CONTENT_UI, '@vfortin/web-shell'],
    ['context UI to Zod', CONTENT_UI, 'zod/mini'],
    ['web model to contracts', CONTENT_MODEL, '@vfortin/content-contracts'],
    ['web model to Angular HTTP', CONTENT_MODEL, '@angular/common/http'],
    ['legal feature to contracts', LEGAL, '@vfortin/content-contracts'],
    ['a feature to Zod', CONTENT_FEATURE, 'zod/mini'],
    ['a feature to a backend use case', CONTENT_FEATURE, '@vfortin/content-application'],
    ['shell to Zod', SHELL, 'zod'],
    ['web application to contracts', WEB, '@vfortin/content-contracts'],
    ['web data access to a server platform', CONTENT_DATA, '@vfortin/backend-http'],
    ['web data access to a backend adapter', CONTENT_DATA, '@vfortin/content-adapters-in'],
    ['e2e tests to a library', E2E, '@vfortin/ui'],
    ['e2e tests to contracts', E2E, '@vfortin/content-contracts'],
    ['tooling to a library', TOOLING, '@vfortin/content-domain'],
  ])('%s', async (_label: string, file: string, specifier: string): Promise<void> => {
    expect(await boundaryErrors(file, specifier)).not.toEqual([]);
  });
});

describe('allowed imports (controls)', (): void => {
  it.each([
    ['HTTP adapter to contracts', ADAPTERS_IN, '@vfortin/content-contracts'],
    ['HTTP adapter to application', ADAPTERS_IN, '@vfortin/content-application'],
    ['persistence to domain', ADAPTERS_OUT, '@vfortin/content-domain'],
    ['composition to persistence', COMPOSITION, '@vfortin/content-adapters-out'],
    ['service to composition', SERVICE, '@vfortin/content-composition'],
    ['service to configuration', SERVICE, '@vfortin/backend-config'],
    ['UI to design tokens', UI, '@vfortin/design-tokens'],
    ['context UI to its models', CONTENT_UI, '@vfortin/content-web-model'],
    ['context UI to generic UI', CONTENT_UI, '@vfortin/ui'],
    ['data access to contracts', CONTENT_DATA, '@vfortin/content-contracts'],
    ['feature to data access', CONTENT_FEATURE, '@vfortin/content-web-data-access'],
    ['shell to a feature', SHELL, '@vfortin/content-web-feature'],
    ['web application to shell', WEB, '@vfortin/web-shell'],
    ["an adapter to another context's contracts", ADAPTERS_IN, '@vfortin/contact-contracts'],
    ['HTTP adapter to the HTTP platform', CONTACT_ADAPTERS_IN, '@vfortin/backend-http'],
    [
      'persistence to the persistence platform',
      CONTACT_ADAPTERS_OUT,
      '@vfortin/backend-persistence',
    ],
    ['data access to the HTTP client', CONTACT_DATA, '@vfortin/web-http'],
    ['data access to its contracts', CONTACT_DATA, '@vfortin/contact-contracts'],
    ['shell to the contact feature', SHELL, '@vfortin/contact-web-feature'],
    ['shell to the HTTP client', SHELL, '@vfortin/web-http'],
    ['token verification to identity contracts', PLATFORM_AUTH, '@vfortin/identity-contracts'],
    ['an HTTP adapter to the admin guard', ADAPTERS_IN, '@vfortin/backend-auth'],
    [
      'shell to the interceptor (secondary entry point)',
      SHELL,
      '@vfortin/identity-web-data-access/http',
    ],
    [
      'shell to the contact details (secondary entry point)',
      SHELL,
      '@vfortin/contact-web-data-access/links',
    ],
    ['content admin to its data access', CONTENT_ADMIN, '@vfortin/content-web-data-access'],
    [
      'content admin to the editor (secondary entry point)',
      CONTENT_ADMIN,
      '@vfortin/content-web-data-access/admin',
    ],
    ['application to its domain', APPLICATION, '@vfortin/content-domain'],
    ['data access to Zod (snapshot validation, D10)', CONTENT_DATA, 'zod/mini'],
    ['legal feature to generic UI', LEGAL, '@vfortin/ui'],
    ['e2e tests to Playwright', E2E, '@playwright/test'],
  ])('%s', async (_label: string, file: string, specifier: string): Promise<void> => {
    expect(await boundaryErrors(file, specifier)).toEqual([]);
  });
});
