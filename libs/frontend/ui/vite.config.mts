/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/frontend/ui',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular({ tsconfig: `${import.meta.dirname}/tsconfig.spec.json` })],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  test: {
    name: 'ui',
    watch: false,
    globals: true,
    environment: 'jsdom',
    // Keep the large component suite within the memory available on hosted CI runners.
    maxWorkers: 2,
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/frontend/ui',
      provider: 'v8' as const,
      // Every source file counts, tested or not (docs/workspace/testing.md).
      include: ['src/**/*.ts'],
      exclude: ['src/**/testing/**', 'src/**/*.spec.ts', 'src/test-setup.ts'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: { lines: 90, branches: 80 },
    },
  },
}));
