import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/frontend/design-tokens',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'design-tokens',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/frontend/design-tokens',
      provider: 'v8' as const,
      // Every source file counts, tested or not (docs/workspace/testing.md).
      include: ['src/**/*.ts'],
      exclude: ['src/**/testing/**', 'src/**/*.spec.ts', 'src/test-setup.ts'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: { lines: 90, branches: 80 },
    },
  },
}));
