import { describe, expect, it } from 'vitest';
import {
  cycleViolations,
  deepImportViolations,
  entryPointViolations,
  locationViolations,
  namingViolations,
  specLocationViolations,
  tagViolations,
  testCodeViolations,
  unitFolderViolations,
  type Violation,
} from '@internal/architecture/support/rules';
import {
  parseImports,
  type ImportRef,
  type Project,
  type Workspace,
} from '@internal/architecture/support/workspace';

/*
 * Fixtures: each rule must report the forbidden shape and accept the allowed one.
 * A detector that silently returns [] would pass workspace.spec.ts; these tests catch that.
 */
/**
 * Function project
 *
 * @description
 * Builds a project fixture and derives its project type from whether its root is under `apps/`.
 *
 * @param {string} name - Nx project name.
 * @param {string} root - Workspace-relative project root.
 * @param {string[]} tags - Project tags passed unchanged to the detector.
 * @returns {Project} Project fixture for structural rule tests.
 */
const project = (name: string, root: string, tags: string[]): Project => ({
  name,
  root,
  tags,
  projectType: root.startsWith('apps/') ? 'application' : 'library',
});

/**
 * Constant PROJECTS
 *
 * @description
 * Valid project fixtures covering backend layers, contracts and frontend layers used by rule tests.
 */
const PROJECTS: Project[] = [
  project('content-domain', 'libs/backend/content/domain', [
    'scope:content',
    'platform:neutral',
    'layer:domain',
  ]),
  project('content-application', 'libs/backend/content/application', [
    'scope:content',
    'platform:neutral',
    'layer:application',
  ]),
  project('content-contracts', 'libs/contracts/content', [
    'scope:content',
    'platform:neutral',
    'layer:contracts',
  ]),
  project('backend-http', 'libs/backend/platform/http', [
    'scope:platform',
    'platform:server',
    'layer:platform',
  ]),
  project('content-web-model', 'libs/frontend/content/model', [
    'scope:content',
    'platform:web',
    'layer:model',
  ]),
  project('content-web-data-access', 'libs/frontend/content/data-access', [
    'scope:content',
    'platform:web',
    'layer:data-access',
  ]),
  project('content-web-ui', 'libs/frontend/content/ui', [
    'scope:content',
    'platform:web',
    'layer:ui',
  ]),
  project('content-web-feature', 'libs/frontend/content/feature', [
    'scope:content',
    'platform:web',
    'layer:feature',
  ]),
  project('web-e2e', 'apps/web-e2e', ['scope:app', 'platform:neutral', 'layer:e2e']),
];

/**
 * Constant PATHS
 *
 * @description
 * Public alias paths derived from the fixture libraries' index entry points.
 */
const PATHS: Record<string, string> = Object.fromEntries(
  PROJECTS.flatMap((p: Project) => [
    [`@internal/${p.name}/*`, `${p.root}/src/*`],
    ...(p.projectType === 'library' ? [[`@vfortin/${p.name}`, `${p.root}/src/index.ts`]] : []),
  ]),
);

/**
 * Function workspace
 *
 * @description
 * Builds a normalized workspace fixture from source text and optional project or alias overrides.
 *
 * @param {Record<string, string>} files - Workspace-relative source paths and source text.
 * @param {Partial<Pick<Workspace, 'projects' | 'paths'>>} overrides - Optional project and alias fixture replacements.
 * @returns {Workspace} Workspace model with parsed imports for every supplied file.
 */
function workspace(
  files: Record<string, string>,
  overrides: Partial<Pick<Workspace, 'projects' | 'paths'>> = {},
): Workspace {
  return {
    projects: overrides.projects ?? PROJECTS,
    paths: overrides.paths ?? PATHS,
    files: Object.entries(files).map(
      ([path, content]: [string, string]): { path: string; imports: ImportRef[] } => ({
        path,
        imports: parseImports(path, content),
      }),
    ),
  };
}

/**
 * Function rules
 *
 * @description
 * Extracts rule identifiers from detector results for concise expected-value assertions.
 *
 * @param {Violation[]} violations - Detector output to project to rule identifiers.
 * @returns {string[]} Rule identifiers in violation order.
 */
const rules = (violations: Violation[]): string[] =>
  violations.map((v: Violation): string => v.rule);

describe('parseImports', (): void => {
  it('reads static, re-export, dynamic and type imports', (): void => {
    const refs: ImportRef[] = parseImports(
      'probe.ts',
      [
        "import { a } from './a';",
        "import type { B } from './b';",
        "import { type C } from './c';",
        "export * from './d';",
        "export { type G } from './g';",
        "export { type H, i } from './h';",
        "const e = () => import('./e');",
        "type F = import('./f').F;",
      ].join('\n'),
    );
    expect(
      refs.map((ref: ImportRef): (string | boolean)[] => [ref.specifier, ref.typeOnly]),
    ).toEqual([
      ['./a', false],
      ['./b', true],
      ['./c', true],
      ['./d', false],
      ['./g', true],
      ['./h', false],
      ['./e', false],
      ['./f', true],
    ]);
  });
});

describe('tagViolations', (): void => {
  it('rejects a missing, duplicated or unknown tag', (): void => {
    const projects: Project[] = [
      project('a', 'libs/frontend/ui', ['scope:platform', 'layer:ui']),
      project('b', 'libs/frontend/ui2', [
        'scope:platform',
        'platform:web',
        'platform:server',
        'layer:ui',
      ]),
      project('c', 'libs/frontend/ui3', ['scope:platform', 'platform:web', 'layer:widgets']),
      project('d', 'libs/frontend/ui4', ['scope:platform', 'platform:web', 'layer:ui', 'type:lib']),
    ];
    expect(rules(tagViolations(workspace({}, { projects })))).toEqual([
      'one-tag-per-dimension',
      'one-tag-per-dimension',
      'allowed-tag',
      'allowed-tag',
    ]);
  });

  it('accepts the fixture projects', (): void => {
    expect(tagViolations(workspace({}))).toEqual([]);
  });
});

describe('locationViolations', (): void => {
  it('rejects tags that contradict the folder', (): void => {
    const projects: Project[] = [
      project('content-domain', 'libs/backend/content/domain', [
        'scope:contact',
        'platform:server',
        'layer:application',
      ]),
      project('content-web-ui', 'libs/frontend/content/ui', [
        'scope:content',
        'platform:server',
        'layer:ui',
      ]),
      project('stray', 'libs/stray', ['scope:platform', 'platform:web', 'layer:ui']),
    ];
    expect(rules(locationViolations(workspace({}, { projects })))).toEqual([
      'tags-match-location',
      'tags-match-location',
      'tags-match-location',
      'tags-match-location',
      'tags-match-location',
    ]);
  });

  it('accepts the fixture projects', (): void => {
    expect(locationViolations(workspace({}))).toEqual([]);
  });
});

describe('namingViolations', (): void => {
  it.each([
    ['shared', 'libs/frontend/shared'],
    ['content-utils', 'libs/frontend/content/utils'],
    ['common-web', 'libs/frontend/common'],
  ])('rejects %s', (name: string, root: string): void => {
    const projects: Project[] = [project(name, root, [])];
    expect(rules(namingViolations(workspace({}, { projects })))).toEqual(['no-catch-all-project']);
  });

  it('accepts business names', (): void => {
    expect(namingViolations(workspace({}))).toEqual([]);
  });
});

describe('entryPointViolations', (): void => {
  const allIndexes = (path: string): boolean =>
    path.endsWith('/src/index.ts') || path.endsWith('/src');

  it('rejects a missing private alias for a project with a source directory', (): void => {
    const paths: Record<string, string> = { ...PATHS };
    delete paths['@internal/content-web-ui/*'];
    expect(rules(entryPointViolations(workspace({}, { paths }), allIndexes))).toContain(
      'private-alias-coverage',
    );
  });

  it('does not require a private alias for a project without a source directory', (): void => {
    const paths: Record<string, string> = { ...PATHS };
    delete paths['@internal/web-e2e/*'];
    const exists = (path: string): boolean => allIndexes(path) && path !== 'apps/web-e2e/src';
    expect(entryPointViolations(workspace({}, { paths }), exists)).toEqual([]);
  });

  it('rejects a library without src/index.ts', (): void => {
    const exists = (path: string): boolean =>
      allIndexes(path) && !path.startsWith('libs/frontend/content/ui/');
    expect(rules(entryPointViolations(workspace({}), exists))).toContain('library-index');
  });

  it('rejects an undeclared secondary entry point', (): void => {
    const paths: Record<string, string> = {
      ...PATHS,
      '@vfortin/content-web-ui/internals': 'libs/frontend/content/ui/src/internals.ts',
    };
    const exists = (path: string): boolean => allIndexes(path) || path.endsWith('/internals.ts');
    expect(rules(entryPointViolations(workspace({}, { paths }), exists))).toEqual([
      'declared-entry-point',
    ]);
  });

  it('rejects a path that points outside the project source root', (): void => {
    const paths: Record<string, string> = {
      ...PATHS,
      '@vfortin/content-web-ui': 'libs/frontend/content/ui/src/lib/x.ts',
    };
    const exists = (): boolean => true;
    expect(rules(entryPointViolations(workspace({}, { paths }), exists))).toContain(
      'library-index',
    );
  });

  it('accepts a declared secondary entry point', (): void => {
    const projects: Project[] = [
      ...PROJECTS,
      project('identity-web-data-access', 'libs/frontend/identity/data-access', [
        'scope:identity',
        'platform:web',
        'layer:data-access',
      ]),
    ];
    const paths: Record<string, string> = {
      ...PATHS,
      '@vfortin/identity-web-data-access': 'libs/frontend/identity/data-access/src/index.ts',
      '@vfortin/identity-web-data-access/http': 'libs/frontend/identity/data-access/src/http.ts',
      '@internal/identity-web-data-access/*': 'libs/frontend/identity/data-access/src/*',
    };
    const exists = (path: string): boolean => allIndexes(path) || path.endsWith('/src/http.ts');
    expect(entryPointViolations(workspace({}, { projects, paths }), exists)).toEqual([]);
  });

  it('accepts only a project-owned private wildcard rooted in its source directory', (): void => {
    const paths: Record<string, string> = {
      ...PATHS,
      '@internal/content-web-ui/*': 'libs/frontend/content/ui/src/*',
    };
    const exists = (path: string): boolean =>
      allIndexes(path) || path === 'libs/frontend/content/ui/src';
    expect(entryPointViolations(workspace({}, { paths }), exists)).toEqual([]);
  });

  it('accepts the generated snapshot alias without requiring generated files', (): void => {
    const projects: Project[] = [
      ...PROJECTS,
      project('web', 'apps/web', ['scope:app', 'platform:web', 'layer:app']),
    ];
    const paths: Record<string, string> = {
      ...PATHS,
      '@internal/web/*': 'apps/web/src/*',
      '@internal/web-snapshot/*': 'apps/web/content-snapshot/*',
    };
    expect(entryPointViolations(workspace({}, { projects, paths }), allIndexes)).toEqual([]);
  });

  it('rejects a changed or ownerless snapshot target', (): void => {
    const paths: Record<string, string> = {
      ...PATHS,
      '@internal/web-snapshot/*': 'apps/web/content-snapshot/*',
    };
    expect(rules(entryPointViolations(workspace({}, { paths }), allIndexes))).toContain(
      'private-alias-target',
    );
    const projects: Project[] = [
      ...PROJECTS,
      project('web', 'apps/web', ['scope:app', 'platform:web', 'layer:app']),
    ];
    const wrong: Record<string, string> = {
      ...paths,
      '@internal/web/*': 'apps/web/src/*',
      '@internal/web-snapshot/*': 'apps/web/src/*',
    };
    expect(
      rules(entryPointViolations(workspace({}, { projects, paths: wrong }), allIndexes)),
    ).toContain('private-alias-target');
  });

  it.each([
    ['@internal/content-web-ui/*', 'libs/frontend/content/feature/src/*'],
    ['@internal/content-web-ui/foo/*', 'libs/frontend/content/ui/src/*'],
    ['@internal/unknown/*', 'libs/frontend/content/ui/src/*'],
    ['@internal/content-web-ui/*', 'libs/frontend/content/ui/src/lib/*'],
  ])('rejects an invalid private alias %s → %s', (alias: string, target: string): void => {
    const paths: Record<string, string> = { ...PATHS, [alias]: target };
    expect(rules(entryPointViolations(workspace({}, { paths }), (): true => true))).toContain(
      'private-alias-target',
    );
  });
});

describe('deepImportViolations', (): void => {
  it('rejects a deep import and a relative import into another project', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/feature/src/lib/a.ts': [
        "import { x } from '@vfortin/content-web-ui/src/lib/x';",
        "import { y } from '../../../ui/src/index';",
      ].join('\n'),
    });
    expect(rules(deepImportViolations(ws))).toEqual([
      'no-deep-import',
      'no-relative-import-across-projects',
    ]);
  });

  it('accepts public entry points and relative imports inside the project', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/feature/src/lib/a.ts': [
        "import { x } from '@vfortin/content-web-ui';",
        "import { y } from './b';",
        "import { z } from '../index';",
      ].join('\n'),
    });
    expect(deepImportViolations(ws)).toEqual([]);
  });

  it('accepts a private alias only inside its own project', (): void => {
    const paths: Record<string, string> = {
      ...PATHS,
      '@internal/content-web-ui/*': 'libs/frontend/content/ui/src/*',
    };
    const ws: Workspace = workspace(
      {
        'libs/frontend/content/ui/src/lib/a.ts':
          "import { b } from '@internal/content-web-ui/lib/b';",
        'libs/frontend/content/feature/src/lib/b.ts':
          "import { a } from '@internal/content-web-ui/lib/a';",
      },
      { paths },
    );
    expect(rules(deepImportViolations(ws))).toEqual(['private-alias-owner']);
  });

  it.each([
    '@internal/content-web-ui/../feature/src/lib/a',
    '@internal/content-web-ui/./lib/a',
    '@internal/content-web-ui//lib/a',
    '@internal/content-web-ui',
    '@internal/unknown/lib/a',
  ])('rejects a malformed or undeclared private alias %s', (specifier: string): void => {
    const paths: Record<string, string> = {
      ...PATHS,
      '@internal/content-web-ui/*': 'libs/frontend/content/ui/src/*',
    };
    const ws: Workspace = workspace(
      { 'libs/frontend/content/ui/src/lib/a.ts': `import '${specifier}';` },
      { paths },
    );
    expect(rules(deepImportViolations(ws))).toEqual(['private-alias-owner']);
  });

  it('rejects importing a project through its own public entry point', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/lib/a.ts': "import { a } from '@vfortin/content-web-ui';",
    });
    expect(rules(deepImportViolations(ws))).toEqual(['no-public-self-import']);
  });

  it('limits generated snapshot imports to the web project and rejects traversal', (): void => {
    const projects: Project[] = [
      ...PROJECTS,
      project('web', 'apps/web', ['scope:app', 'platform:web', 'layer:app']),
    ];
    const paths: Record<string, string> = {
      ...PATHS,
      '@internal/web-snapshot/*': 'apps/web/content-snapshot/*',
    };
    const ws: Workspace = workspace(
      {
        'apps/web/src/main.ts': [
          "import en from '@internal/web-snapshot/en.json';",
          "import secret from '@internal/web-snapshot/../other.json';",
        ].join('\n'),
        'libs/frontend/content/ui/src/lib/a.ts': "import en from '@internal/web-snapshot/en.json';",
      },
      { projects, paths },
    );
    expect(rules(deepImportViolations(ws))).toEqual(['private-alias-owner', 'private-alias-owner']);
  });

  it('rejects snapshot imports when the configured target is altered', (): void => {
    const projects: Project[] = [
      ...PROJECTS,
      project('web', 'apps/web', ['scope:app', 'platform:web', 'layer:app']),
    ];
    const paths: Record<string, string> = {
      ...PATHS,
      '@internal/web-snapshot/*': 'apps/web/src/*',
    };
    const ws: Workspace = workspace(
      { 'apps/web/src/main.ts': "import en from '@internal/web-snapshot/en.json';" },
      { projects, paths },
    );
    expect(rules(deepImportViolations(ws))).toEqual(['private-alias-owner']);
  });
});

describe('testCodeViolations', (): void => {
  it('rejects production code that imports a testing folder or a spec', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/index.ts': "export * from './lib/testing/fixtures';",
      'libs/frontend/content/ui/src/lib/a.ts': "import { x } from './a.spec';",
    });
    expect(rules(testCodeViolations(ws))).toEqual([
      'no-test-code-in-production',
      'no-test-code-in-production',
    ]);
  });

  it('accepts test code that imports test helpers', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/lib/testing/a.spec.ts': "import { x } from './fixtures';",
    });
    expect(testCodeViolations(ws)).toEqual([]);
  });

  it('rejects production imports of private test helpers and spec files', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/lib/a.ts': [
        "import { x } from '@internal/content-web-ui/lib/testing/fixtures';",
        "import { y } from '@internal/content-web-ui/lib/a.spec';",
        "import { z } from '@internal/content-web-ui/lib/b.spec.js';",
      ].join('\n'),
    });
    expect(rules(testCodeViolations(ws))).toEqual([
      'no-test-code-in-production',
      'no-test-code-in-production',
      'no-test-code-in-production',
    ]);
  });
});

describe('specLocationViolations', (): void => {
  it('rejects a spec next to its subject', (): void => {
    const ws: Workspace = workspace({ 'libs/frontend/content/ui/src/lib/a.spec.ts': '' });
    expect(rules(specLocationViolations(ws))).toEqual(['spec-in-testing-folder']);
  });

  it('accepts a spec in testing/ and an e2e spec', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/lib/testing/a.spec.ts': '',
      'apps/web-e2e/src/home.spec.ts': '',
    });
    expect(specLocationViolations(ws)).toEqual([]);
  });
});

describe('unitFolderViolations', (): void => {
  it('reports separate flat section, state and HTTP units with their expected folder', (): void => {
    const section: string =
      'libs/frontend/content/feature/src/lib/ui/sections/fixture-section.component.ts';
    const store: string =
      'libs/frontend/content/data-access/src/lib/state/fixture-workflow.store.ts';
    const controller: string =
      'libs/backend/content/adapters-in/src/lib/http/fixture-records.controller.ts';
    const ws: Workspace = workspace({ [section]: '', [store]: '', [controller]: '' });
    expect(unitFolderViolations(ws)).toEqual([
      {
        rule: 'named-unit-folder',
        subject: section,
        detail:
          'libs/frontend/content/feature/src/lib/ui/sections/fixture-section/fixture-section.component.ts',
      },
      {
        rule: 'named-unit-folder',
        subject: store,
        detail:
          'libs/frontend/content/data-access/src/lib/state/fixture-workflow/fixture-workflow.store.ts',
      },
      {
        rule: 'named-unit-folder',
        subject: controller,
        detail:
          'libs/backend/content/adapters-in/src/lib/http/fixture-records/fixture-records.controller.ts',
      },
    ]);
  });

  it.each([
    'component',
    'directive',
    'directives',
    'service',
    'store',
    'guard',
    'interceptor',
    'pipe',
    'provider',
    'resolver',
    'controller',
    'presenter',
    'mapper',
    'jobs',
    'use-case',
    'utils',
  ])('rejects a misplaced %s and accepts the same unit in its folder', (role: string): void => {
    const base: string = 'libs/frontend/content/feature/src/lib';
    expect(rules(unitFolderViolations(workspace({ [`${base}/project.${role}.ts`]: '' })))).toEqual([
      'named-unit-folder',
    ]);
    expect(unitFolderViolations(workspace({ [`${base}/project/project.${role}.ts`]: '' }))).toEqual(
      [],
    );
  });

  it('accepts primary catalogue entries, child components, providers, services and slices', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/ui/src/lib/button/button.directive.ts': '',
      'libs/frontend/ui/src/lib/input-group/input-group.directives.ts': '',
      'libs/frontend/ui/src/lib/data-table/data-table.component.ts': '',
      'libs/frontend/ui/src/lib/command/components/command-input/command-input.component.ts': '',
      'libs/frontend/content/data-access/src/lib/providers/content-snapshots/content-snapshots.provider.ts':
        '',
      'libs/frontend/content/data-access/src/lib/services/site-content/site-content.service.ts': '',
      'libs/frontend/content/data-access/src/lib/state/fixture-workflow/fixture-workflow.store.ts':
        '',
      'libs/frontend/content/data-access/src/lib/state/fixture-workflow/fixture-workflow.state.ts':
        '',
      'libs/backend/content/application/src/lib/use-cases/publish-project/publish-project.use-case.ts':
        '',
    });
    expect(unitFolderViolations(ws)).toEqual([]);
  });

  it('leaves cohesive model groups, constants, options and owner entry points flat', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/feature/src/lib/models/project/project.interface.ts': '',
      'libs/frontend/content/feature/src/lib/models/project/project-status.type.ts': '',
      'libs/frontend/content/feature/src/lib/constants/project-labels.constants.ts': '',
      'libs/frontend/content/feature/src/lib/options/project-status.constants.ts': '',
      'libs/frontend/content/feature/src/lib/content.routes.ts': '',
      'libs/frontend/content/feature/src/index.ts': '',
      'libs/frontend/content/data-access/src/server.ts': '',
      'libs/backend/content/composition/src/lib/content.module.ts': '',
      'apps/content-service/src/main.ts': '',
      'apps/web/src/app/app.config.ts': '',
      'apps/web/src/app/app.config.server.ts': '',
    });
    expect(unitFolderViolations(ws)).toEqual([]);
  });

  it('ignores test hosts and tooling helpers without weakening production placement', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/feature/src/lib/testing/fixture.component.ts': '',
      'libs/frontend/content/feature/src/lib/project.component.spec.ts': '',
      'libs/frontend/content/feature/src/test-setup.ts': '',
      'tools/architecture/src/testing/fixture.service.ts': '',
      'libs/frontend/content/feature/src/lib/components/project.component.ts': '',
    });
    expect(unitFolderViolations(ws)).toEqual([
      {
        rule: 'named-unit-folder',
        subject: 'libs/frontend/content/feature/src/lib/components/project.component.ts',
        detail: 'libs/frontend/content/feature/src/lib/components/project/project.component.ts',
      },
    ]);
  });
});

describe('cycleViolations', (): void => {
  it('rejects a runtime cycle through a barrel', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/index.ts': "export * from './lib/a';",
      'libs/frontend/content/ui/src/lib/a.ts': "import { b } from './b'; export const a = () => b;",
      'libs/frontend/content/ui/src/lib/b.ts':
        "import { a } from '../index'; export const b = () => a;",
    });
    expect(rules(cycleViolations(ws))).toEqual(['no-file-cycle']);
  });

  it('rejects a cycle through private aliases and relative imports', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/lib/a.ts':
        "import { b } from '@internal/content-web-ui/lib/b'; export const a = () => b;",
      'libs/frontend/content/ui/src/lib/b.ts': "import { a } from './a'; export const b = () => a;",
    });
    expect(rules(cycleViolations(ws))).toEqual(['no-file-cycle']);
  });

  it.each([
    "import type { B } from '@internal/content-web-ui/lib/b'; export type A = B;",
    "import { type B } from '@internal/content-web-ui/lib/b'; export type A = B;",
    "export type { B } from '@internal/content-web-ui/lib/b';",
    "export { type B } from '@internal/content-web-ui/lib/b';",
  ])('ignores erased references: %s', (reference: string): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/lib/a.ts': `${reference} export const a = 1;`,
      'libs/frontend/content/ui/src/lib/b.ts': "import { a } from './a'; export type B = typeof a;",
    });
    expect(cycleViolations(ws)).toEqual([]);
  });

  it('rejects a runtime cycle that includes a dynamic import', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/ui/src/lib/a.ts':
        "export const a = () => import('@internal/content-web-ui/lib/b');",
      'libs/frontend/content/ui/src/lib/b.ts': "import { a } from './a'; export const b = () => a;",
    });
    expect(rules(cycleViolations(ws))).toEqual(['no-file-cycle']);
  });

  it('leaves project cycles to the Nx module-boundary rule', (): void => {
    const ws: Workspace = workspace({
      'libs/frontend/content/feature/src/lib/a.ts': "import { x } from '@vfortin/content-web-ui';",
      'libs/frontend/content/ui/src/lib/b.ts': "import { y } from '@vfortin/content-web-feature';",
    });
    expect(cycleViolations(ws)).toEqual([]);
  });
});
