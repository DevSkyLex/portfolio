import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Violation } from '@internal/architecture/support/rules';
import {
  type StylesheetSources,
  covers,
  parseSources,
  publicStylesheetViolations,
} from '@internal/architecture/support/stylesheet-rules';
import {
  loadWorkspace,
  parseImports,
  type ImportRef,
  type Project,
  type Workspace,
} from '@internal/architecture/support/workspace';

/*
 * Split of the global stylesheets (D31): each rule fails on a fixture, then the real stylesheets
 * satisfy it.
 */

/**
 * Constant WORKSPACE
 *
 * @description
 * Repository root, resolved from the architecture tool's source directory.
 */
const WORKSPACE: string = join(import.meta.dirname, '..', '..', '..');

/**
 * Constant ADMIN_AREA
 *
 * @description
 * Lazy admin area of the shell, loaded by the `admin` route of `APP_ROUTES`.
 */
const ADMIN_AREA: string = 'libs/frontend/shell/src/lib/admin';

/**
 * Constant PROJECTS
 *
 * @description
 * Fixture projects: the app, the shell, a public feature, an admin feature, a data-access library and
 * the catalogue.
 */
const PROJECTS: Project[] = [
  { name: 'web', root: 'apps/web', tags: ['layer:app'], projectType: 'application' },
  { name: 'web-shell', root: 'libs/frontend/shell', tags: ['layer:shell'], projectType: 'library' },
  {
    name: 'content-web-feature',
    root: 'libs/frontend/content/feature',
    tags: ['layer:feature'],
    projectType: 'library',
  },
  {
    name: 'content-web-feature-admin',
    root: 'libs/frontend/content/feature-admin',
    tags: ['layer:feature'],
    projectType: 'library',
  },
  {
    name: 'content-web-data-access',
    root: 'libs/frontend/content/data-access',
    tags: ['layer:data-access'],
    projectType: 'library',
  },
  { name: 'ui', root: 'libs/frontend/ui', tags: ['layer:ui'], projectType: 'library' },
];

/**
 * Constant SOURCES
 *
 * @description
 * Fixture graph: the app routes a public page and lazily the admin area; the public page uses the
 * button of the catalogue through its `export *` barrel, the admin page its table.
 */
const SOURCES: Record<string, string> = {
  'apps/web/src/main.ts': "import { ROUTES } from '@vfortin/web-shell'; export const app = ROUTES;",
  'libs/frontend/shell/src/index.ts': "export { ROUTES } from './lib/app.routes';",
  'libs/frontend/shell/src/lib/app.routes.ts': [
    "import { HomeComponent } from '@vfortin/content-web-feature';",
    "export const ROUTES = [HomeComponent, () => import('./admin/admin.routes')];",
  ].join('\n'),
  'libs/frontend/shell/src/lib/admin/admin.routes.ts': [
    "import { EditComponent } from '@vfortin/content-web-feature-admin';",
    'export const ADMIN = [EditComponent];',
  ].join('\n'),
  'libs/frontend/content/feature/src/index.ts': "export * from './lib/home.component';",
  'libs/frontend/content/feature/src/lib/home.component.ts': [
    "import { ButtonDirective } from '@vfortin/ui';",
    "import { load } from '@vfortin/content-web-data-access';",
    'export class HomeComponent { b = ButtonDirective; l = load; }',
  ].join('\n'),
  'libs/frontend/content/feature-admin/src/index.ts': "export * from './lib/edit.component';",
  'libs/frontend/content/feature-admin/src/lib/edit.component.ts': [
    "import { TableComponent } from '@vfortin/ui';",
    'export class EditComponent { t = TableComponent; }',
  ].join('\n'),
  'libs/frontend/content/data-access/src/index.ts': 'export const load = 1;',
  'libs/frontend/ui/src/index.ts': [
    "export * from '@internal/ui/lib/button/button.directive';",
    "export * from '@internal/ui/lib/table/table.component';",
  ].join('\n'),
  'libs/frontend/ui/src/lib/button/button.directive.ts': 'export class ButtonDirective {}',
  'libs/frontend/ui/src/lib/table/table.component.ts': 'export class TableComponent {}',
};

/**
 * Constant PATHS
 *
 * @description
 * Fixture public and private aliases.
 */
const PATHS: Record<string, string> = {
  '@vfortin/web-shell': 'libs/frontend/shell/src/index.ts',
  '@vfortin/content-web-feature': 'libs/frontend/content/feature/src/index.ts',
  '@vfortin/content-web-feature-admin': 'libs/frontend/content/feature-admin/src/index.ts',
  '@vfortin/content-web-data-access': 'libs/frontend/content/data-access/src/index.ts',
  '@vfortin/ui': 'libs/frontend/ui/src/index.ts',
  '@internal/ui/*': 'libs/frontend/ui/src/*',
};

/**
 * Constant PUBLIC_SOURCES
 *
 * @description
 * Public stylesheet of the fixture, written next to the app entry.
 */
const PUBLIC_SOURCES: string = [
  "@source '../../../libs/frontend/content/feature';",
  "@source '../../../libs/frontend/shell/src';",
  "@source not '../../../libs/frontend/shell/src/lib/admin';",
  "@source '../../../libs/frontend/ui/src/lib/button';",
].join('\n');

/**
 * Function check
 *
 * @description
 * Runs the public stylesheet rule on the fixture graph with the given stylesheet text.
 *
 * @param {string} css - Public stylesheet text.
 * @param {Record<string, string>} [overrides] - Source files replacing or adding fixture files.
 * @returns {Violation[]} Violations found.
 */
function check(css: string, overrides: Record<string, string> = {}): Violation[] {
  const sources: Record<string, string> = { ...SOURCES, ...overrides };
  const workspace: Workspace = {
    projects: PROJECTS,
    paths: PATHS,
    files: Object.entries(sources).map(
      ([path, content]: [string, string]): { path: string; imports: ImportRef[] } => ({
        path,
        imports: parseImports(path, content),
      }),
    ),
  };
  return publicStylesheetViolations({
    workspace,
    read: (path: string): string => sources[path] ?? '',
    entries: ['apps/web/src/main.ts'],
    adminArea: ADMIN_AREA,
    sources: parseSources(css, 'apps/web/src/styles.css'),
  });
}

/**
 * Function read
 *
 * @description
 * Reads a workspace-relative file of the repository.
 *
 * @param {string} path - Workspace-relative path.
 * @returns {string} File content.
 */
const read = (path: string): string => readFileSync(join(WORKSPACE, path), 'utf8');

describe('parseSources', (): void => {
  it('resolves included and excluded directories and ignores commented ones', (): void => {
    const sources: StylesheetSources = parseSources(
      "/* @source '../x'; */\n@source '../../../libs/frontend/ui/src/lib/button/';\n@source not \"../../../libs/frontend/shell/src/lib/admin\";",
      'apps/web/src/styles.css',
    );
    expect(sources).toEqual({
      include: ['libs/frontend/ui/src/lib/button'],
      exclude: ['libs/frontend/shell/src/lib/admin'],
    });
    expect(covers(sources, 'libs/frontend/ui/src/lib/button/button.directive.ts')).toBe(true);
    expect(covers(sources, 'libs/frontend/ui/src/lib/buttons/x.ts')).toBe(false);
  });
});

describe('publicStylesheetViolations', (): void => {
  it('accepts sources that match the public graph, through barrels and up to the admin area', (): void => {
    expect(check(PUBLIC_SOURCES)).toEqual([]);
  });

  it('rejects a public component whose folder the stylesheet does not scan', (): void => {
    expect(
      check(PUBLIC_SOURCES.replace("@source '../../../libs/frontend/ui/src/lib/button';", '')),
    ).toEqual([
      expect.objectContaining({
        rule: 'public-stylesheet-source',
        subject: 'libs/frontend/ui/src/lib/button/button.directive.ts',
      }),
    ]);
  });

  it('rejects a source no public page reaches any more', (): void => {
    expect(check(`${PUBLIC_SOURCES}\n@source '../../../libs/frontend/ui/src/lib/table';`)).toEqual([
      expect.objectContaining({
        rule: 'public-stylesheet-source',
        subject: 'libs/frontend/ui/src/lib/table',
      }),
    ]);
  });

  it('rejects scanning the admin area or a feature only the admin reaches', (): void => {
    const violations: Violation[] = check(
      `${PUBLIC_SOURCES.replace("@source not '../../../libs/frontend/shell/src/lib/admin';", '')}\n@source '../../../libs/frontend/content/feature-admin';`,
    );
    expect(violations.map((v: Violation): string => `${v.rule} ${v.subject}`)).toEqual([
      'public-stylesheet-source libs/frontend/content/feature-admin',
      'public-stylesheet-admin libs/frontend/content/feature-admin/src/lib/edit.component.ts',
      'public-stylesheet-admin libs/frontend/shell/src/lib/admin/admin.routes.ts',
    ]);
  });

  it('takes a barrel whole when a name cannot be resolved', (): void => {
    expect(
      check(PUBLIC_SOURCES, {
        'libs/frontend/content/feature/src/lib/home.component.ts': [
          "import * as ui from '@vfortin/ui';",
          'export class HomeComponent { u = ui; }',
        ].join('\n'),
      }),
    ).toEqual([
      expect.objectContaining({ subject: 'libs/frontend/ui/src/lib/table/table.component.ts' }),
    ]);
  });
});

describe('the web stylesheets', (): void => {
  const styles: string = read('apps/web/src/styles.css');
  const admin: string = read('apps/web/src/admin.css');

  it('scan only the public sources in styles.css, without automatic detection', (): void => {
    expect(styles).toMatch(/@import 'tailwindcss' source\(none\);/);
    const workspace: Workspace = loadWorkspace(WORKSPACE);
    expect(
      publicStylesheetViolations({
        workspace,
        read,
        entries: ['apps/web/src/main.ts', 'apps/web/src/main.server.ts'],
        adminArea: ADMIN_AREA,
        sources: parseSources(styles, 'apps/web/src/styles.css'),
      }),
    ).toEqual([]);
  });

  it('scan the whole frontend in admin.css, without preflight or emitted tokens', (): void => {
    expect(parseSources(admin, 'apps/web/src/admin.css')).toEqual({
      include: ['libs/frontend'],
      exclude: [],
    });
    // Tailwind's theme and utilities only: a second preflight would follow the public base rules.
    expect(admin).not.toMatch(/@import 'tailwindcss'(?: [^;]*)?;/);
    expect(admin).toMatch(/@import 'tailwindcss\/theme\.css' layer\(theme\);/);
    expect(admin).toMatch(
      /@import 'tailwindcss\/utilities\.css' layer\(utilities\) source\(none\);/,
    );
    // The tokens are defined once, by styles.css.
    expect(admin).toMatch(
      /@import '\.\.\/\.\.\/\.\.\/libs\/frontend\/design-tokens\/src\/theme\.css' reference;/,
    );
  });

  it('declare the same layer order, ng-icon first', (): void => {
    for (const css of [styles, admin]) {
      expect(css.indexOf('@layer ng-icon;')).toBeGreaterThanOrEqual(0);
      expect(css.indexOf('@layer ng-icon;')).toBeLessThan(css.indexOf('@import'));
    }
    expect(admin).toMatch(/@layer theme, base, components, utilities;/);
  });
});
