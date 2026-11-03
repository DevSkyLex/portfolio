import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../../node_modules/.vite/libs/backend/platform/auth',
  // Decorator metadata for NestJS injection (esbuild does not emit it).
  plugins: [swc.vite({ jsc: { transform: { decoratorMetadata: true, legacyDecorator: true } } })],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'backend-auth',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../../coverage/libs/backend/platform/auth',
      provider: 'v8' as const,
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/testing/**'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
}));
