import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readCachedProjectGraph } from '@nx/devkit';
import { describe, expect, it } from 'vitest';
import {
  type Violation,
  cycleViolations,
  deepImportViolations,
  entryPointViolations,
  locationViolations,
  namingViolations,
  specLocationViolations,
  tagViolations,
  testCodeViolations,
  unitFolderViolations,
} from '@internal/architecture/support/rules';
import {
  loadWorkspace,
  type Project,
  type Workspace,
} from '@internal/architecture/support/workspace';
import {
  layoutPortViolations,
  lightweightEntryPointViolations,
  ownerContractViolations,
  publicConsumerViolations,
  specTypecheckViolations,
} from '@internal/architecture/support/governance-rules';

/*
 * The real workspace against the structural rules. rules.spec.ts proves that each rule fails on a
 * fixture; this file proves the workspace satisfies them.
 */

/**
 * Constant WORKSPACE
 *
 * @description
 * Resolves the repository root from the architecture tool's source directory for real-workspace checks.
 */
const WORKSPACE: string = join(import.meta.dirname, '..', '..', '..');

/**
 * Constant workspace
 *
 * @description
 * Loads the repository project graph once so every structural rule inspects the same workspace snapshot.
 */
const workspace: Workspace = loadWorkspace(WORKSPACE);

/**
 * Function exists
 *
 * @description
 * Checks whether a workspace-relative entry-point target exists on disk.
 *
 * @param {string} path - Workspace-relative path to resolve.
 * @returns {boolean} Whether the corresponding file exists.
 */
const exists = (path: string): boolean => existsSync(join(WORKSPACE, path));

describe('workspace structure', (): void => {
  it('loads every project and source file', (): void => {
    expect(workspace.projects.map((project: Project): string => project.name).sort()).toEqual(
      Object.keys(readCachedProjectGraph().nodes).sort(),
    );
    expect(workspace.files.length).toBeGreaterThan(300);
    expect(
      workspace.projects.find((project: Project): boolean => project.name === 'web')?.targets,
    ).toHaveProperty('build');
  });

  it.each([
    ['exactly one allowed scope, platform and layer tag per project', tagViolations],
    ['tags that match the folder', locationViolations],
    ['no shared, common or utils project', namingViolations],
    ['no deep or cross-project relative import', deepImportViolations],
    ['no test code imported by production code', testCodeViolations],
    ['production components and executable units have named folders', unitFolderViolations],
    ['no runtime cycle between files within a project', cycleViolations],
    [
      'frontend owner contracts declare every public entry and approved consumer',
      ownerContractViolations,
    ],
    ['frontend consumers use entries their owners authorize', publicConsumerViolations],
    [
      'administration layouts consume owner ports instead of concrete business APIs',
      layoutPortViolations,
    ],
    [
      'light public entries do not eagerly reach server, admin or NgRx code',
      lightweightEntryPointViolations,
    ],
  ])('%s', (_label: string, rule: (workspace: Workspace) => Violation[]): void => {
    expect(rule(workspace)).toEqual([]);
  });

  it('every library exposes src/index.ts and only declared secondary entry points', (): void => {
    expect(entryPointViolations(workspace, exists)).toEqual([]);
  });

  it('every project with a spec configuration checks specs during normal typecheck', (): void => {
    expect(specTypecheckViolations(workspace, exists)).toEqual([]);
  });

  it('specs live in testing/ folders', (): void => {
    expect(
      specLocationViolations(workspace).map((violation: Violation): string => violation.subject),
    ).toEqual([]);
  });
});
