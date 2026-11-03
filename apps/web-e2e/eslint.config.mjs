import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

/**
 * Configuration web end-to-end ESLint
 *
 * @description
 * Combines workspace lint rules with the Playwright recommended rules for browser tests.
 */
export default [
  { ...playwright.configs['flat/recommended'], files: ['src/**/*.spec.ts'] },
  ...baseConfig,
];
