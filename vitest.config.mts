import { defineConfig, type ViteUserConfig } from 'vitest/config';

/**
 * Configuration workspace tests
 *
 * @description
 * Discovers project-level Vite and Vitest configurations while excluding the workspace configuration itself.
 */
export default defineConfig({
  test: {
    projects: [
      '**/vite.config.{mjs,js,ts,mts}',
      '**/vitest.config.{mjs,js,ts,mts}',
      '!vitest.config.{mjs,js,ts,mts}',
      '!vite.config.{mjs,js,ts,mts}',
    ],
  },
} satisfies ViteUserConfig);
