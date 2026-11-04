import { describe, expect, it } from 'vitest';
import type { Violation } from '@internal/architecture/support/rules';
import {
  type OwnerContract,
  layoutPortViolations,
  lightweightEntryPointViolations,
  ownerContractViolations,
  packageOwnerViolations,
  parseOwnerContract,
  publicConsumerViolations,
  specTypecheckViolations,
} from '@internal/architecture/support/governance-rules';
import {
  parseImports,
  type ImportRef,
  type Project,
  type ProjectTarget,
  type Workspace,
} from '@internal/architecture/support/workspace';

/**
 * Constant OWNER
 *
 * @description
 * Content data-access owner whose public and server entries remain separate in the fixtures.
 */
const OWNER: Project = {
  name: 'content-web-data-access',
  root: 'libs/frontend/content/data-access',
  tags: ['scope:content', 'platform:web', 'layer:data-access'],
  projectType: 'library',
};

/**
 * Constant SHELL
 *
 * @description
 * Layout consumer authorized by the owner only through the named navigation port.
 */
const SHELL: Project = {
  name: 'web-shell',
  root: 'libs/frontend/shell',
  tags: ['scope:app', 'platform:web', 'layer:shell'],
  projectType: 'library',
};

/**
 * Constant PATHS
 *
 * @description
 * Fixture public and private aliases representing the same owner boundaries as the workspace.
 */
const PATHS: Record<string, string> = {
  '@vfortin/content-web-data-access': `${OWNER.root}/src/index.ts`,
  '@vfortin/content-web-data-access/navigation': `${OWNER.root}/src/navigation.ts`,
  '@internal/content-web-data-access/*': `${OWNER.root}/src/*`,
  '@vfortin/web-shell': `${SHELL.root}/src/index.ts`,
};

/**
 * Function contract
 *
 * @description
 * Creates a complete owner contract with exact grants and substantive required sections.
 *
 * @param {string} rows - Owner table rows used by the scenario.
 * @returns {string} Markdown owner contract.
 */
function contract(rows: string): string {
  return `# Owner
## Purpose
Owns its business requests and publishes deliberately narrow navigation contracts.
## Public entry points
| Entry point | Consumers |
| --- | --- |
${rows}
## Provider scope
Route data is reset with its owner; the published port controls the session lifetime.
## Invariants
Consumers do not import the owner transport services or change its private state.
## Validation
The owner tests requests, errors and consumer contracts at their actual boundaries.
`;
}

/**
 * Function fixture
 *
 * @description
 * Builds a pure source graph with readmes so every rejected dependency has an allowed control.
 *
 * @param {Record<string, string>} sources - Fixture source text keyed by workspace path.
 * @param {Partial<Workspace>} overrides - Metadata replaced by the scenario.
 * @returns {Workspace} In-memory workspace without filesystem I/O.
 */
function fixture(
  sources: Record<string, string> = {},
  overrides: Partial<Workspace> = {},
): Workspace {
  return {
    projects: [OWNER, SHELL],
    paths: PATHS,
    files: Object.entries(sources).map(
      ([path, content]: [string, string]): { path: string; imports: ImportRef[] } => ({
        path,
        imports: parseImports(path, content),
      }),
    ),
    readmes: {
      [OWNER.name]: contract(
        '| `@vfortin/content-web-data-access` | None |\n| `@vfortin/content-web-data-access/navigation` | `web-shell` |',
      ),
      [SHELL.name]: contract('| `@vfortin/web-shell` | None |'),
    },
    ...overrides,
  };
}

describe('parseOwnerContract', (): void => {
  it('accepts grants only in the exact owner section and ignores fenced examples', (): void => {
    const result: OwnerContract = parseOwnerContract(`## Purpose
| Entry point | Consumers |
| --- | --- |
| \`@vfortin/ignored\` | \`web-shell\` |
## Public entry points
\`\`\`md
| Entry point | Consumers |
| --- | --- |
| \`@vfortin/example\` | \`web-shell\` |
\`\`\`
| Entry point | Consumers |
| --- | --- |
| \`@vfortin/content-web-data-access/navigation\` | \`web-shell\` |
`);
    expect(result.entries).toEqual({
      '@vfortin/content-web-data-access/navigation': ['web-shell'],
    });
    expect(result.errors).toEqual([]);
  });

  it('rejects duplicate grants and wildcard consumers instead of merging permissions', (): void => {
    const result: OwnerContract = parseOwnerContract(
      contract(
        [
          '| `@vfortin/content-web-data-access` | `web-shell` |',
          '| `@vfortin/content-web-data-access` | `other` |',
          '| `@vfortin/content-web-data-access/navigation` | * |',
        ].join('\n'),
      ),
    );
    expect(result.errors).toHaveLength(2);
    expect(result.entries['@vfortin/content-web-data-access']).toEqual(['web-shell']);
    expect(result.entries['@vfortin/content-web-data-access/navigation']).toBeUndefined();
  });
});

describe('ownerContractViolations', (): void => {
  it('accepts complete owner contracts with exact public entries', (): void => {
    expect(ownerContractViolations(fixture())).toEqual([]);
  });

  it('rejects missing contracts and missing required owner sections', (): void => {
    const violations: Violation[] = ownerContractViolations(
      fixture({}, { readmes: { [OWNER.name]: '# Nx library' } }),
    );
    expect(
      violations.filter((violation: Violation): boolean => violation.rule === 'owner-contract'),
    ).toHaveLength(6);
  });

  it('rejects foreign grants, unknown or self consumers and omitted public entries', (): void => {
    const ws: Workspace = fixture();
    const violations: Violation[] = ownerContractViolations({
      ...ws,
      readmes: {
        ...ws.readmes,
        [OWNER.name]: contract('| `@vfortin/web-shell` | `unknown`, `content-web-data-access` |'),
      },
    });
    expect(violations.map((violation: Violation): string => violation.rule)).toEqual([
      'owner-public-entry',
      'owner-public-consumer',
      'owner-public-consumer',
      'owner-public-entry',
      'owner-public-entry',
    ]);
  });
});

describe('publicConsumerViolations', (): void => {
  it('accepts the owner-approved narrow entry and rejects an unauthorized runtime or type import', (): void => {
    const ws: Workspace = fixture({
      [`${SHELL.root}/src/lib/a.ts`]: [
        "import { Port } from '@vfortin/content-web-data-access/navigation';",
        "import { Api } from '@vfortin/content-web-data-access';",
        "import type { Dto } from '@vfortin/content-web-data-access';",
        "const load = () => import('@vfortin/content-web-data-access');",
      ].join('\n'),
    });
    expect(
      publicConsumerViolations(ws).map((violation: Violation): string => violation.subject),
    ).toEqual([
      `${SHELL.root}/src/lib/a.ts:2`,
      `${SHELL.root}/src/lib/a.ts:3`,
      `${SHELL.root}/src/lib/a.ts:4`,
    ]);
  });

  it('does not let the consumer grant itself access in its own README', (): void => {
    const ws: Workspace = fixture({
      [`${SHELL.root}/src/lib/a.ts`]: "export { Api } from '@vfortin/content-web-data-access';",
    });
    expect(
      publicConsumerViolations({
        ...ws,
        readmes: {
          ...ws.readmes,
          [SHELL.name]: contract('| `@vfortin/content-web-data-access` | `web-shell` |'),
        },
      }),
    ).toHaveLength(1);
  });
});

describe('layoutPortViolations', (): void => {
  it('accepts named owner ports and rejects roots, renamed concrete classes and namespace access', (): void => {
    const ws: Workspace = fixture({
      [`${SHELL.root}/src/lib/admin/admin-layout.component.ts`]: [
        "import { AdminProjectNavigationPort } from '@vfortin/content-web-data-access/navigation';",
        "import { AdminProjectsApiService as Queries } from '@vfortin/content-web-data-access/navigation';",
        "import * as api from '@vfortin/contact-web-data-access/summary';",
        "import { SessionStore } from '@vfortin/identity-web-data-access';",
      ].join('\n'),
      [`${SHELL.root}/src/lib/admin/testing/layout.spec.ts`]:
        "import { SessionStore } from '@vfortin/identity-web-data-access';",
    });
    expect(
      layoutPortViolations(ws).map((violation: Violation): string => violation.subject),
    ).toEqual([
      `${SHELL.root}/src/lib/admin/admin-layout.component.ts:2`,
      `${SHELL.root}/src/lib/admin/admin-layout.component.ts:3`,
      `${SHELL.root}/src/lib/admin/admin-layout.component.ts:4`,
    ]);
  });
});

describe('specTypecheckViolations', (): void => {
  /**
   * Constant owners
   *
   * @description
   * Project families whose normal typecheck must retain the same semantic spec compilation gate.
   */
  const owners: readonly Project[] = [
    OWNER,
    {
      name: 'content-application',
      root: 'libs/backend/content/application',
      tags: ['scope:content', 'platform:neutral', 'layer:application'],
      projectType: 'library',
    },
    {
      name: 'content-contracts',
      root: 'libs/contracts/content',
      tags: ['scope:content', 'platform:neutral', 'layer:contracts'],
      projectType: 'library',
    },
    {
      name: 'content-service',
      root: 'apps/content-service',
      tags: ['scope:app', 'platform:server', 'layer:app'],
      projectType: 'application',
    },
  ];

  describe.each(owners)('$name', (owner: Project): void => {
    const expected: string = `tsc -p ${owner.root}/tsconfig.spec.json --noEmit`;
    const exists = (path: string): boolean => path === `${owner.root}/tsconfig.spec.json`;

    it('accepts a semantic spec gate wired into normal typecheck', (): void => {
      const targets: Readonly<Record<string, ProjectTarget>> = {
        'typecheck-spec': { options: { command: expected } },
        typecheck: { dependsOn: ['typecheck-spec'] },
      };
      expect(
        specTypecheckViolations(fixture({}, { projects: [{ ...owner, targets }, SHELL] }), exists),
      ).toEqual([]);
    });

    it.each<Readonly<Record<string, ProjectTarget>>>([
      {},
      { 'typecheck-spec': { options: { command: expected } } },
      {
        'typecheck-spec': { options: { command: 'tsc -p tsconfig.lib.json --noEmit' } },
        typecheck: { dependsOn: ['typecheck-spec'] },
      },
    ])('rejects absent, detached or production-only spec checking', (targets): void => {
      expect(
        specTypecheckViolations(fixture({}, { projects: [{ ...owner, targets }] }), exists),
      ).toEqual([
        {
          rule: 'semantic-spec-typecheck',
          subject: owner.name,
          detail: `typecheck must depend on typecheck-spec running ${expected}`,
        },
      ]);
    });

    it('does not require fake targets for a project with no spec config', (): void => {
      expect(
        specTypecheckViolations(fixture({}, { projects: [owner] }), (): false => false),
      ).toEqual([]);
    });
  });
});

describe('lightweightEntryPointViolations', (): void => {
  it('follows a re-export into server validation instead of only checking entry names', (): void => {
    const ws: Workspace = fixture({
      [`${OWNER.root}/src/index.ts`]: "export { validate } from './server';",
      [`${OWNER.root}/src/server.ts`]: "import { z } from 'zod/mini'; export const validate = z;",
    });
    expect(lightweightEntryPointViolations(ws)).toEqual([
      expect.objectContaining({
        rule: 'lightweight-entry-reachability',
        subject: '@vfortin/content-web-data-access',
      }),
    ]);
  });

  it('rejects eager private access to separated admin code', (): void => {
    const ws: Workspace = fixture({
      [`${OWNER.root}/src/index.ts`]:
        "export { editor } from '@internal/content-web-data-access/lib/admin/editor';",
      [`${OWNER.root}/src/lib/admin/editor.ts`]: 'export const editor = 1;',
    });
    expect(lightweightEntryPointViolations(ws)).toHaveLength(1);
  });

  it('accepts type-only references and intentional dynamic loading', (): void => {
    const ws: Workspace = fixture({
      [`${OWNER.root}/src/index.ts`]:
        "export type { Editor } from './lib/admin/editor'; export const load = () => import('./lib/admin/editor');",
      [`${OWNER.root}/src/lib/admin/editor.ts`]:
        "import { x } from '@ngrx/signals'; export class Editor {}",
    });
    expect(lightweightEntryPointViolations(ws)).toEqual([]);
  });
});

describe('packageOwnerViolations', (): void => {
  it('confines the editor to the content administration and sharp to the content adapters', (): void => {
    const ws: Workspace = fixture({
      'libs/frontend/content/feature-admin/src/lib/ui/components/editor.component.ts':
        "import { Editor } from '@tiptap/core';",
      'libs/backend/content/adapters-out/src/lib/media/processor.ts': "import sharp from 'sharp';",
      'libs/frontend/content/feature/src/lib/page.component.ts': [
        "import { Editor } from '@tiptap/core';",
        "import { EditorState } from 'prosemirror-state';",
      ].join('\n'),
      'libs/frontend/ui/src/lib/testing/editor.spec.ts':
        "import StarterKit from '@tiptap/starter-kit';",
      'libs/backend/contact/adapters-out/src/lib/avatar.ts': "import sharp from 'sharp';",
      'libs/frontend/identity/feature/src/lib/ui/components/qr.component.ts':
        "import { encode } from 'uqr';",
      'libs/frontend/content/ui/src/lib/qr.component.ts': "import { encode } from 'uqr';",
    });
    expect(
      packageOwnerViolations(ws).map((violation: Violation): string => violation.subject),
    ).toEqual([
      'libs/frontend/content/feature/src/lib/page.component.ts:1',
      'libs/frontend/content/feature/src/lib/page.component.ts:2',
      'libs/frontend/ui/src/lib/testing/editor.spec.ts:1',
      'libs/backend/contact/adapters-out/src/lib/avatar.ts:1',
      'libs/frontend/content/ui/src/lib/qr.component.ts:1',
    ]);
  });
});
