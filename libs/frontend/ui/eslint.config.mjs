import nx from '@nx/eslint-plugin';
import baseConfig from '../../../eslint.config.mjs';

/**
 * Configuration UI ESLint
 *
 * @description
 * Combines the workspace and Angular rules with selector conventions for the UI catalogue:
 * `ui` attributes use camel case and `ui` elements use kebab case.
 */
export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'ui',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'ui',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
