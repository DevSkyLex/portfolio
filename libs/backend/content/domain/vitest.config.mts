import { defineConfig } from 'vitest/config';

/**
 * Configuration vitest.config.mts
 *
 * @description
 * Configures domain unit tests for Node and applies the domain source coverage thresholds.
 */
export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../../node_modules/.vite/libs/backend/content/domain',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'content-domain',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../../coverage/libs/backend/content/domain',
      provider: 'v8' as const,
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/testing/**'],
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
}));
