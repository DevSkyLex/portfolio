import { defineConfig } from 'vitest/config';

/**
 * Configuration vitest.config.mts
 *
 * @description
 * Configures outbound adapter tests for Node and sets persistence adapter coverage thresholds.
 */
export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../../node_modules/.vite/libs/backend/content/adapters-out',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'content-adapters-out',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../../coverage/libs/backend/content/adapters-out',
      provider: 'v8' as const,
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/testing/**'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
}));
