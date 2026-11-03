import { type ViteUserConfig, defineConfig } from 'vitest/config';

export default defineConfig((): ViteUserConfig => ({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/contracts/content',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'content-contracts',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/contracts/content',
      provider: 'v8' as const,
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/testing/**'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
}));
