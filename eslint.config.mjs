import nx from '@nx/eslint-plugin';
import angular from 'angular-eslint';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';
import explicitTypes, { explicitTypeSyntax } from './tools/eslint/explicit-types.mjs';

/*
 * Monorepo boundaries (docs/architecture/boundaries.md).
 * Three tag dimensions per project: scope (business context), platform (environment), layer (responsibility).
 * Nx requires ALL constraints that match a project to pass; within a constraint, the target tags
 * are an OR. Each layer therefore lists explicitly what it may read.
 */
/**
 * Constant FRAMEWORKS_AND_IO
 *
 * @description
 * External framework and I/O packages barred from backend pure layers, contracts and frontend models.
 */
const FRAMEWORKS_AND_IO = [
  '@nestjs/*',
  '@angular/*',
  '@ngrx/*',
  'drizzle-orm',
  'drizzle-orm/*',
  '@electric-sql/*',
  'pg',
  'express',
  'jose',
  'nodemailer',
  'reflect-metadata',
  'rxjs',
  'rxjs/*',
];
/**
 * Constant ZOD
 *
 * @description
 * Zod package patterns excluded from pure backend and selected frontend layers while permitted in contracts.
 */
const ZOD = ['zod', 'zod/*'];

/**
 * Constant depConstraints
 *
 * @description
 * Nx tag constraints defining allowed dependencies by runtime platform, business scope and architectural layer.
 */
const depConstraints = [
  // Runtime environment.
  { sourceTag: 'platform:neutral', onlyDependOnLibsWithTags: ['platform:neutral'] },
  { sourceTag: 'platform:web', onlyDependOnLibsWithTags: ['platform:web', 'platform:neutral'] },
  {
    sourceTag: 'platform:server',
    onlyDependOnLibsWithTags: ['platform:server', 'platform:neutral'],
  },

  // Business contexts: their own code, the technical capabilities, and only the public contracts of the others.
  {
    sourceTag: 'scope:content',
    onlyDependOnLibsWithTags: ['scope:content', 'scope:platform', 'layer:contracts'],
  },
  {
    sourceTag: 'scope:contact',
    onlyDependOnLibsWithTags: ['scope:contact', 'scope:platform', 'layer:contracts'],
  },
  {
    sourceTag: 'scope:identity',
    onlyDependOnLibsWithTags: ['scope:identity', 'scope:platform', 'layer:contracts'],
  },
  { sourceTag: 'scope:legal', onlyDependOnLibsWithTags: ['scope:legal', 'scope:platform'] },
  { sourceTag: 'scope:platform', onlyDependOnLibsWithTags: ['scope:platform', 'layer:contracts'] },
  // Composition (applications and shell): assembles the contexts.
  {
    sourceTag: 'scope:app',
    onlyDependOnLibsWithTags: [
      'scope:app',
      'scope:content',
      'scope:contact',
      'scope:identity',
      'scope:legal',
      'scope:platform',
    ],
  },

  // Backend layers (hexagonal).
  {
    sourceTag: 'layer:domain',
    onlyDependOnLibsWithTags: ['layer:domain'],
    bannedExternalImports: [...FRAMEWORKS_AND_IO, ...ZOD],
  },
  {
    sourceTag: 'layer:application',
    onlyDependOnLibsWithTags: ['layer:domain', 'layer:application'],
    bannedExternalImports: [...FRAMEWORKS_AND_IO, ...ZOD],
  },
  {
    sourceTag: 'layer:adapter-in',
    onlyDependOnLibsWithTags: [
      'layer:application',
      'layer:domain',
      'layer:contracts',
      'layer:platform',
    ],
  },
  {
    sourceTag: 'layer:adapter-out',
    onlyDependOnLibsWithTags: ['layer:application', 'layer:domain', 'layer:platform'],
  },
  {
    sourceTag: 'layer:composition',
    onlyDependOnLibsWithTags: [
      'layer:application',
      'layer:domain',
      'layer:adapter-in',
      'layer:adapter-out',
      'layer:platform',
    ],
  },
  {
    sourceTag: 'layer:contracts',
    onlyDependOnLibsWithTags: ['layer:contracts'],
    bannedExternalImports: FRAMEWORKS_AND_IO,
  },

  // Technical capabilities: among themselves; server side, JWT verification reads the claims published by identity.
  { sourceTag: 'layer:platform', onlyDependOnLibsWithTags: ['layer:platform', 'layer:contracts'] },
  {
    allSourceTags: ['layer:platform', 'platform:web'],
    onlyDependOnLibsWithTags: ['layer:platform'],
  },

  // Frontend layers. Zod stays in data access (snapshot validation at prerender time, D10).
  {
    sourceTag: 'layer:model',
    onlyDependOnLibsWithTags: ['layer:model'],
    bannedExternalImports: [...FRAMEWORKS_AND_IO, ...ZOD],
  },
  {
    sourceTag: 'layer:data-access',
    onlyDependOnLibsWithTags: ['layer:model', 'layer:contracts', 'layer:platform'],
  },
  {
    sourceTag: 'layer:ui',
    // Presentation components receive view models; the generic UI (scope:platform)
    // stays cut off from the business models by the scope rule.
    onlyDependOnLibsWithTags: ['layer:ui', 'layer:model'],
    bannedExternalImports: ['@angular/common/http', '@ngrx/*', ...ZOD],
  },
  {
    sourceTag: 'layer:feature',
    onlyDependOnLibsWithTags: ['layer:feature', 'layer:data-access', 'layer:ui', 'layer:model'],
    bannedExternalImports: ZOD,
  },
  {
    sourceTag: 'layer:shell',
    onlyDependOnLibsWithTags: ['layer:feature', 'layer:data-access', 'layer:ui', 'layer:platform'],
    bannedExternalImports: ZOD,
  },

  // Applications.
  {
    allSourceTags: ['layer:app', 'platform:web'],
    onlyDependOnLibsWithTags: ['layer:shell', 'layer:platform'],
    bannedExternalImports: ZOD,
  },
  {
    allSourceTags: ['layer:app', 'platform:server'],
    onlyDependOnLibsWithTags: ['layer:composition', 'layer:platform'],
  },

  // End-to-end tests and workspace tooling read no library: they test the built artefacts.
  { sourceTag: 'layer:e2e', onlyDependOnLibsWithTags: [] },
  { sourceTag: 'layer:tooling', onlyDependOnLibsWithTags: [] },
];

/**
 * Configuration workspace ESLint
 *
 * @description
 * Combines Nx, Angular, import and workspace boundary rules for the projects in this repository.
 */
export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/coverage',
      '**/test-output',
      '**/playwright-report',
      '**/.angular',
      '**/.nx',
      '**/.data',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mts', '**/*.mjs'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/extensions': ['.ts', '.tsx', '.mts', '.js', '.mjs', '.cjs'],
      'import-x/internal-regex': '^@(?:vfortin|internal)/',
      'import-x/resolver-next': [
        createNodeResolver({
          extensions: ['.ts', '.tsx', '.mts', '.mjs', '.cjs', '.js', '.json', '.node'],
          extensionAlias: { '.js': ['.ts', '.tsx', '.js'], '.mjs': ['.mts', '.mjs'] },
          tsconfig: { configFile: `${import.meta.dirname}/tsconfig.base.json` },
        }),
      ],
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          banTransitiveDependencies: true,
          // Private aliases stay within their project; architecture tests reject self-barrel imports and file cycles.
          allowCircularSelfDependency: true,
          checkDynamicDependenciesExceptions: [],
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints,
        },
      ],
      // File cycles use the architecture gate: import-x treats erased type re-exports as runtime edges.
      'import-x/no-duplicates': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // TypeScript strictness (dentalstock-web reference, docs/workspace/tooling.md).
  {
    files: ['**/*.ts', '**/*.mts'],
    plugins: { portfolio: explicitTypes },
    rules: {
      // The local declaration rule preserves exact schema/store DSL types and contextual callbacks.
      'portfolio/explicit-declarations': 'error',
      'portfolio/explicit-inject': 'error',
      'no-restricted-syntax': ['error', ...explicitTypeSyntax],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: false, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  // Type-aware rules: promises and exhaustiveness. Files outside a tsconfig (tool configs) are skipped.
  {
    files: ['**/*.ts'],
    ignores: ['**/*.config.ts', '**/*.config.*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
    },
  },
  // Dentalstock's explicit Angular boundaries and type-aware safety, scoped to frontend production code.
  {
    basePath: import.meta.dirname,
    files: ['libs/frontend/**/src/**/*.ts', 'apps/web/src/**/*.ts'],
    ignores: ['**/testing/**', '**/*.spec.ts', '**/test-setup.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error',
      // Explicit scalar member types are part of the frontend contract.
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/unbound-method': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
      ],
    },
  },
  // Angular conventions (standalone, OnPush, signal inputs/outputs). These rules only match Angular
  // decorators (@Component, @Input, @Output, ng* hooks), so they are inert on NestJS code.
  {
    files: ['**/*.ts'],
    plugins: { '@angular-eslint': angular.tsPlugin },
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/no-async-lifecycle-method': 'error',
    },
  },
  // Template accessibility beyond flat/angular-template (which brings the accessibility preset).
  {
    files: ['**/*.html'],
    plugins: { '@angular-eslint/template': angular.templatePlugin },
    rules: {
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/no-any': 'error',
    },
  },
  // Command-line entry points and workspace scripts write to the console by design.
  {
    basePath: import.meta.dirname,
    files: [
      '**/src/cli.ts',
      '**/tools/**/*.mjs',
      'tools/**/*.mjs',
      'apps/*/scripts/**/*.mjs',
      'apps/web-e2e/support/**/*.mjs',
      '.github/scripts/**/*.mjs',
      '.agents/scripts/**/*.mjs',
    ],
    rules: { 'no-console': 'off' },
  },
];
