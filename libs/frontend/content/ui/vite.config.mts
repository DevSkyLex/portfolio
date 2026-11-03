/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

/**
 * Constant Vite configuration
 *
 * @description
 * Configures the Angular library's Vitest environment, source coverage scope and project-specific coverage thresholds.
 */
export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../../node_modules/.vite/libs/frontend/content/ui',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular({ tsconfig: `${import.meta.dirname}/tsconfig.spec.json` })],
  test: {
    name: 'content-web-ui',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../../coverage/libs/frontend/content/ui',
      provider: 'v8' as const,
      // Every source file counts, tested or not (docs/workspace/testing.md).
      include: ['src/**/*.ts'],
      exclude: ['src/**/testing/**', 'src/**/*.spec.ts', 'src/test-setup.ts'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      // WebGL/canvas renderers (*-renderer.ts, *-scene.ts) cannot run under jsdom: their pure maths
      // live in tested utils (planet-math.utils.ts, scene-maths.utils.ts), the drawing loop is proven by e2e.
      // The project floor accounts for them; every other file keeps the 90/80 bar.
      thresholds: {
        lines: 60,
        branches: 50,
        'src/lib/**/!(*-renderer|*-scene).ts': { lines: 90, branches: 80 },
      },
    },
  },
}));
