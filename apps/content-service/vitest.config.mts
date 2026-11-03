import { type ViteUserConfig, defineConfig } from 'vitest/config';

/**
 * Configuration content-service Vitest
 *
 * @description
 * Runs node-based content service tests and measures configuration validation against the service coverage thresholds.
 */
export default defineConfig((): ViteUserConfig => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/content-service',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'content-service',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/testing/**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/content-service',
      provider: 'v8' as const,
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/config.ts'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
}));
