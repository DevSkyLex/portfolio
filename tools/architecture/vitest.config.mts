import { defineConfig, type ViteUserConfig } from 'vitest/config';

/**
 * Configuration architecture Vitest
 *
 * @description
 * Runs architecture rule specs in Node with extended timeouts for real-workspace analysis.
 */
export default defineConfig({
  root: import.meta.dirname,
  resolve: { tsconfigPaths: true },
  test: {
    name: 'architecture',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
} satisfies ViteUserConfig);
