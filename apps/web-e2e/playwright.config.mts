import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

/**
 * Constant localPort
 *
 * @description
 * Optional dedicated preview port. Validate before constructing either the URL or server command.
 */
const localPort: string = process.env['E2E_PORT'] ?? '4200';
if (!/^[1-9]\d{0,4}$/.test(localPort) || Number(localPort) > 65_535) {
  throw new Error('E2E_PORT must be an integer between 1 and 65535.');
}

/**
 * Constant localURL
 *
 * @description
 * Shared readiness URL for the dedicated built-site server and browser context.
 */
const localURL: string = getReadyUrl(`http://localhost:${localPort}`);

/**
 * Constant baseURL
 *
 * @description
 * Selects an explicitly supplied preview URL or the local built-site server used by end-to-end tests.
 */
const baseURL: string = process.env['BASE_URL'] || localURL;

/**
 * Constant storedRefusal
 *
 * @description
 * Cookie choice stored before every test (D48): a fresh refusal, so the consent banner covers nothing
 * in the specs about other areas. `consent.spec.ts` starts from an empty storage instead.
 */
const storedRefusal: {
  cookies: [];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
} = {
  cookies: [],
  origins: [
    {
      origin: new URL(baseURL).origin,
      localStorage: [
        {
          name: 'cookie-consent',
          value: JSON.stringify({
            version: 1,
            analytics: false,
            decidedAt: new Date().toISOString(),
          }),
        },
      ],
    },
  ],
};

// Specs: src/*.spec.ts, one file per area; helpers in src/support (docs/workspace/testing.md).
/**
 * Configuration web end-to-end tests
 *
 * @description
 * Configures browser projects and serves the prerendered site locally unless a preview base URL is provided.
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    storageState: storedRefusal,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // With BASE_URL (Compose stack, deployed preview) nothing is served locally.
  webServer: process.env['BASE_URL']
    ? []
    : {
        // Built and prerendered site (both languages), as in production but for its placeholder GA4
        // measurement id (`web:build:e2e`, D48); no services: the admin area stays on the login page
        // and the contact form is only tested client-side.
        // web-e2e:e2e depends on web:e2e-site (apps/web-e2e/project.json).
        command: `node apps/web-e2e/support/preview/serve-site.mjs dist/apps/web-e2e-site/browser ${localPort}`,
        url: localURL,
        // A stale local server must not answer for CI.
        reuseExistingServer: !process.env['CI'],
        timeout: 30_000,
        cwd: workspaceRoot,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
