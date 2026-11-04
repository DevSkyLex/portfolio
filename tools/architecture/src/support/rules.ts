import { posix } from 'node:path';
import type { Project, SourceFile, Workspace } from '@internal/architecture/support/workspace';

/*
 * Structural rules that @nx/enforce-module-boundaries cannot express (docs/architecture/boundaries.md).
 * Each detector is pure: it reads a Workspace model, so the fixtures in rules.spec.ts prove it fails.
 */

/**
 * Interface Violation
 * @interface Violation
 *
 * @description
 * One architecture rule failure with a stable rule key and a human-readable subject and detail.
 */
export interface Violation {
  // #region Properties
  /**
   * Property rule
   * @readonly
   *
   * @description
   * Stable identifier of the structural rule that rejected the workspace item.
   *
   * @type {string}
   */
  readonly rule: string;

  /**
   * Property subject
   * @readonly
   *
   * @description
   * Project or source location associated with the violation.
   *
   * @type {string}
   */
  readonly subject: string;

  /**
   * Property detail
   * @readonly
   *
   * @description
   * Expected condition or offending value reported by the rule.
   *
   * @type {string}
   */
  readonly detail: string;
  // #endregion
}

/**
 * Constant ALLOWED_TAGS
 * @readonly
 *
 * @description
 * Enumerates the accepted values for each project-tag dimension enforced by the architecture rules.
 */
export const ALLOWED_TAGS = {
  scope: ['content', 'contact', 'identity', 'legal', 'platform', 'app'],
  platform: ['web', 'server', 'neutral'],
  layer: [
    'domain',
    'application',
    'adapter-in',
    'adapter-out',
    'composition',
    'contracts',
    'model',
    'data-access',
    'ui',
    'feature',
    'shell',
    'platform',
    'app',
    'e2e',
    'tooling',
  ],
} as const;

/**
 * Constant CONTEXTS
 * @readonly
 *
 * @description
 * Business contexts that may own frontend libraries under the documented folder layout.
 */
const CONTEXTS: string[] = ['content', 'contact', 'identity', 'legal'];

/**
 * Constant SNAPSHOT_ALIAS
 *
 * @description
 * Private alias for build-time generated content snapshots owned by the web application.
 */
const SNAPSHOT_ALIAS: string = '@internal/web-snapshot/*';

/**
 * Constant SNAPSHOT_TARGET
 *
 * @description
 * Generated web snapshots live outside the source directory and may be absent before a build.
 */
const SNAPSHOT_TARGET: string = 'apps/web/content-snapshot/*';

/**
 * Constant SECONDARY_ENTRY_POINTS
 * @readonly
 *
 * @description
 * Approved library subpaths and their decision references; undeclared deep library entry points fail architecture checks.
 */
export const SECONDARY_ENTRY_POINTS: Readonly<Record<string, string>> = {
  '@vfortin/web-shell/server': 'D10: @angular/ssr only in the server bundle',
  '@vfortin/content-web-data-access/server': 'D10: Zod snapshot validation only at prerender time',
  '@vfortin/identity-web-data-access/http': 'D18: interceptor without the session store',
  '@vfortin/content-web-data-access/admin':
    'D18: project editor without weighing on the public bundle',
  '@vfortin/content-web-data-access/navigation': 'D38: owner-provided project navigation port',
  '@vfortin/contact-web-data-access/summary': 'D38: owner-provided inbox summary port',
  '@vfortin/identity-web-data-access/session': 'D38: owner-provided administration session port',
};

/**
 * Function tagValue
 *
 * @description
 * Returns the first tag value for a dimension, or `undefined` when the project has no such tag.
 *
 * @param {Project} project - Project whose tags are inspected.
 * @param {string} dimension - Tag dimension prefix without the colon.
 * @returns {string | undefined} Value after the matching dimension prefix.
 */
const tagValue = (project: Project, dimension: string): string | undefined =>
  project.tags
    .find((tag: string): boolean => tag.startsWith(`${dimension}:`))
    ?.slice(dimension.length + 1);

/**
 * Function isSpec
 *
 * @description
 * Identifies TypeScript unit-test filenames with supported module extensions.
 *
 * @param {string} path - Workspace-relative source path.
 * @returns {boolean} Whether the path is a spec or test file.
 */
const isSpec = (path: string): boolean => /\.(spec|test)\.[cm]?ts$/.test(path);

/**
 * Function isTestCode
 *
 * @description
 * Identifies files treated as test-only code by production import and pure-layer checks.
 *
 * @param {string} path - Workspace-relative source path.
 * @returns {boolean} Whether the file belongs to a test-only location.
 */
const isTestCode = (path: string): boolean =>
  isSpec(path) || path.includes('/testing/') || /(^|\/)test-setup\.ts$/.test(path);

/**
 * Function ownerOf
 *
 * @description
 * Finds the deepest project root containing a workspace path, so nested projects take ownership over parents.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @param {string} path - Workspace-relative path to resolve.
 * @returns {Project | undefined} Owning project, when the path is within one.
 */
export function ownerOf(workspace: Workspace, path: string): Project | undefined {
  return workspace.projects
    .filter(
      (project: Project): boolean => path === project.root || path.startsWith(`${project.root}/`),
    )
    .sort((a: Project, b: Project): number => b.root.length - a.root.length)[0];
}

/**
 * Function targetOf
 *
 * @description
 * Resolves a library alias through the normalized tsconfig paths to its owning project.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @param {string} specifier - Module specifier to resolve.
 * @returns {Project | undefined} Target project, when the alias maps into one.
 */
function targetOf(workspace: Workspace, specifier: string): Project | undefined {
  const target: string | undefined = workspace.paths[specifier];
  return target ? ownerOf(workspace, target) : undefined;
}

/**
 * Function internalTarget
 *
 * @description
 * Resolves a project-private alias only when its configured wildcard points to that project's
 * source directory. Empty, dot and parent segments are rejected before path normalization.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @param {string} specifier - Project-private import specifier.
 * @returns {string | undefined} Workspace-relative target path for a valid alias.
 */
function internalTarget(workspace: Workspace, specifier: string): string | undefined {
  const match: RegExpExecArray | null = /^@internal\/([^/]+)\/(.+)$/.exec(specifier);
  if (!match) return undefined;
  const [, name, suffix] = match;
  if (!name || !suffix || suffix.includes('\\')) return undefined;
  if (
    suffix
      .split('/')
      .some(
        (segment: string): segment is '' | '.' | '..' =>
          segment === '' || segment === '.' || segment === '..',
      )
  ) {
    return undefined;
  }
  if (name === 'web-snapshot') {
    const web: Project | undefined = workspace.projects.find(
      (candidate: Project): boolean => candidate.name === 'web' && candidate.root === 'apps/web',
    );
    if (!web || workspace.paths[SNAPSHOT_ALIAS] !== SNAPSHOT_TARGET) return undefined;
    return `apps/web/content-snapshot/${suffix}`;
  }
  const project: Project | undefined = workspace.projects.find(
    (candidate: Project): boolean => candidate.name === name,
  );
  if (!project || workspace.paths[`@internal/${name}/*`] !== `${project.root}/src/*`) {
    return undefined;
  }
  return `${project.root}/src/${suffix}`;
}

/**
 * Function tagViolations
 *
 * @description
 * Reports missing, duplicate, unsupported and unrecognized project tag dimensions.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @returns {Violation[]} Tag-related architecture violations.
 */
export function tagViolations(workspace: Workspace): Violation[] {
  const violations: Violation[] = [];
  for (const project of workspace.projects) {
    for (const [dimension, allowed] of Object.entries(ALLOWED_TAGS)) {
      const values: string[] = project.tags.filter((tag: string): boolean =>
        tag.startsWith(`${dimension}:`),
      );
      const [only] = values;
      if (values.length !== 1 || only === undefined) {
        violations.push({
          rule: 'one-tag-per-dimension',
          subject: project.name,
          detail: `${values.length} ${dimension}:* tags`,
        });
      } else if (!(allowed as readonly string[]).includes(only.slice(dimension.length + 1))) {
        violations.push({ rule: 'allowed-tag', subject: project.name, detail: only });
      }
    }
    for (const tag of project.tags) {
      if (
        !Object.keys(ALLOWED_TAGS).some((dimension: string): boolean =>
          tag.startsWith(`${dimension}:`),
        )
      ) {
        violations.push({ rule: 'allowed-tag', subject: project.name, detail: tag });
      }
    }
  }
  return violations;
}

/**
 * Function locationViolations
 *
 * @description
 * Checks that project tags agree with the documented application, tool, contract and library folder layout.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @returns {Violation[]} Location and tag mismatches.
 */
export function locationViolations(workspace: Workspace): Violation[] {
  const violations: Violation[] = [];
  /**
   * Function expect
   *
   * @description
   * Adds a location violation when a project's tag value differs from the folder-derived expectation.
   *
   * @param {Project} project - Project whose tag is checked.
   * @param {string} dimension - Tag dimension to validate.
   * @param {string} value - Required tag value for the project's location.
   */
  const expect = (project: Project, dimension: string, value: string): void => {
    const actual: string | undefined = tagValue(project, dimension);
    if (actual !== value) {
      violations.push({
        rule: 'tags-match-location',
        subject: project.name,
        detail: `${project.root}: expected ${dimension}:${value}, found ${actual ?? 'none'}`,
      });
    }
  };
  const BACKEND_LAYERS: Record<string, string> = {
    domain: 'domain',
    application: 'application',
    'adapters-in': 'adapter-in',
    'adapters-out': 'adapter-out',
    composition: 'composition',
  };
  const FRONTEND_LAYERS: Record<string, string> = {
    model: 'model',
    'data-access': 'data-access',
    ui: 'ui',
    feature: 'feature',
    'feature-admin': 'feature',
  };
  for (const project of workspace.projects) {
    const [top, side, context, layer] = project.root.split('/');
    if (top === 'apps') {
      expect(project, 'scope', 'app');
      expect(project, 'layer', side?.endsWith('-e2e') ? 'e2e' : 'app');
    } else if (top === 'tools') {
      expect(project, 'layer', 'tooling');
    } else if (side === 'contracts' && context) {
      expect(project, 'scope', context);
      expect(project, 'layer', 'contracts');
      expect(project, 'platform', 'neutral');
    } else if (side === 'backend' && context === 'platform') {
      expect(project, 'scope', 'platform');
      expect(project, 'layer', 'platform');
      expect(project, 'platform', 'server');
    } else if (side === 'backend' && context && layer && BACKEND_LAYERS[layer]) {
      expect(project, 'scope', context);
      expect(project, 'layer', BACKEND_LAYERS[layer]);
      expect(project, 'platform', ['domain', 'application'].includes(layer) ? 'neutral' : 'server');
    } else if (side === 'frontend') {
      expect(project, 'platform', 'web');
      if (context && CONTEXTS.includes(context)) {
        expect(project, 'scope', context);
        if (layer && FRONTEND_LAYERS[layer]) expect(project, 'layer', FRONTEND_LAYERS[layer]);
        else
          violations.push({
            rule: 'tags-match-location',
            subject: project.name,
            detail: `${project.root}: unknown frontend layer folder`,
          });
      }
    } else {
      violations.push({
        rule: 'tags-match-location',
        subject: project.name,
        detail: `${project.root}: outside the documented layout`,
      });
    }
  }
  return violations;
}

/**
 * Function namingViolations
 *
 * @description
 * Rejects projects whose names or roots use catch-all shared, common, utility, helper or misc labels.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @returns {Violation[]} Projects matching a forbidden catch-all name.
 */
export function namingViolations(workspace: Workspace): Violation[] {
  const forbidden: RegExp = /(^|[-/])(shared|common|utils?|helpers?|misc)([-/]|$)/;
  return workspace.projects
    .filter(
      (project: Project): boolean => forbidden.test(project.name) || forbidden.test(project.root),
    )
    .map((project: Project): { rule: string; subject: string; detail: string } => ({
      rule: 'no-catch-all-project',
      subject: project.name,
      detail: project.root,
    }));
}

/**
 * Function entryPointViolations
 *
 * @description
 * Checks public library barrels, approved secondary entry points and project-private wildcard targets.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @param {(path: string) => boolean} exists - Filesystem predicate supplied by the caller.
 * @returns {Violation[]} Missing or undeclared library entry points.
 */
export function entryPointViolations(
  workspace: Workspace,
  exists: (path: string) => boolean,
): Violation[] {
  const violations: Violation[] = [];
  for (const project of workspace.projects) {
    const privateKey: string = `@internal/${project.name}/*`;
    const privateTarget: string = `${project.root}/src/*`;
    if (exists(`${project.root}/src`) && workspace.paths[privateKey] !== privateTarget) {
      violations.push({
        rule: 'private-alias-coverage',
        subject: project.name,
        detail: `${privateKey} must map to ${privateTarget}`,
      });
    }
    if (project.projectType !== 'library' || !project.root.startsWith('libs/')) continue;
    const index: string = `${project.root}/src/index.ts`;
    if (!exists(index)) {
      violations.push({ rule: 'library-index', subject: project.name, detail: `missing ${index}` });
    }
    if (workspace.paths[`@vfortin/${project.name}`] !== index) {
      violations.push({
        rule: 'library-index',
        subject: project.name,
        detail: `@vfortin/${project.name} must map to ${index}`,
      });
    }
  }
  for (const [key, target] of Object.entries(workspace.paths)) {
    if (key === SNAPSHOT_ALIAS) {
      const web: Project | undefined = workspace.projects.find(
        (candidate: Project): boolean => candidate.name === 'web' && candidate.root === 'apps/web',
      );
      if (!web || target !== SNAPSHOT_TARGET || !exists('apps/web/src')) {
        violations.push({ rule: 'private-alias-target', subject: key, detail: target });
      }
      continue;
    }
    if (key.startsWith('@internal/')) {
      const match: RegExpExecArray | null = /^@internal\/([^/]+)\/\*$/.exec(key);
      const project: Project | null | undefined =
        match &&
        workspace.projects.find((candidate: Project): boolean => candidate.name === match[1]);
      if (!project || target !== `${project.root}/src/*` || !exists(`${project.root}/src`)) {
        violations.push({ rule: 'private-alias-target', subject: key, detail: target });
      }
      continue;
    }
    const owner: Project | undefined = ownerOf(workspace, target);
    if (!owner || !exists(target)) {
      violations.push({
        rule: 'path-target',
        subject: key,
        detail: `${target} is not in a project`,
      });
      continue;
    }
    if (key === `@vfortin/${owner.name}`) continue;
    const entry: string = key.slice(`@vfortin/${owner.name}/`.length);
    if (
      !key.startsWith(`@vfortin/${owner.name}/`) ||
      target !== `${owner.root}/src/${entry}.ts` ||
      !SECONDARY_ENTRY_POINTS[key]
    ) {
      violations.push({
        rule: 'declared-entry-point',
        subject: key,
        detail: `${target}: undeclared secondary entry point (SECONDARY_ENTRY_POINTS)`,
      });
    }
  }
  return violations;
}

/**
 * Function deepImportViolations
 *
 * @description
 * Rejects undeclared public paths, self-imports through public barrels, and private or relative
 * imports that cross a project boundary or use invalid path segments.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @returns {Violation[]} Deep-import and cross-project relative-import violations.
 */
export function deepImportViolations(workspace: Workspace): Violation[] {
  const violations: Violation[] = [];
  for (const file of workspace.files) {
    const owner: Project | undefined = ownerOf(workspace, file.path);
    for (const ref of file.imports) {
      if (ref.specifier.startsWith('@vfortin/') && !(ref.specifier in workspace.paths)) {
        violations.push({
          rule: 'no-deep-import',
          subject: `${file.path}:${ref.line}`,
          detail: ref.specifier,
        });
      } else if (
        ref.specifier.startsWith('@vfortin/') &&
        owner &&
        targetOf(workspace, ref.specifier) === owner
      ) {
        violations.push({
          rule: 'no-public-self-import',
          subject: `${file.path}:${ref.line}`,
          detail: ref.specifier,
        });
      } else if (ref.specifier === '@internal' || ref.specifier.startsWith('@internal/')) {
        const target: string | undefined = internalTarget(workspace, ref.specifier);
        if (!owner || !target || ownerOf(workspace, target) !== owner) {
          violations.push({
            rule: 'private-alias-owner',
            subject: `${file.path}:${ref.line}`,
            detail: ref.specifier,
          });
        }
      } else if (ref.specifier.startsWith('.') && owner) {
        const resolved: string = posix.normalize(
          posix.join(posix.dirname(file.path), ref.specifier),
        );
        if (!resolved.startsWith(`${owner.root}/`)) {
          violations.push({
            rule: 'no-relative-import-across-projects',
            subject: `${file.path}:${ref.line}`,
            detail: ref.specifier,
          });
        }
      }
    }
  }
  return violations;
}

/**
 * Function testCodeViolations
 *
 * @description
 * Prevents production modules from importing specs, testing helpers or test setup modules.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @returns {Violation[]} Production imports that point at test-only code.
 */
export function testCodeViolations(workspace: Workspace): Violation[] {
  const violations: Violation[] = [];
  for (const file of workspace.files) {
    if (isTestCode(file.path) || /(^|\/)[^/]*\.config\.[cm]?ts$/.test(file.path)) continue;
    for (const ref of file.imports) {
      if (
        (ref.specifier.startsWith('.') || ref.specifier.startsWith('@internal/')) &&
        (/(^|\/)testing(\/|$)/.test(ref.specifier) ||
          /\.(spec|test)(?:\.[cm]?[jt]s)?$/.test(ref.specifier))
      ) {
        violations.push({
          rule: 'no-test-code-in-production',
          subject: `${file.path}:${ref.line}`,
          detail: ref.specifier,
        });
      }
    }
  }
  return violations;
}

/**
 * Function specLocationViolations
 *
 * @description
 * Requires library and application unit specs to live in a `testing` directory; tooling and end-to-end specs are exempt.
 *
 * @param {Workspace} workspace - Normalized workspace model.
 * @returns {Violation[]} Specs outside their owning testing location.
 */
export function specLocationViolations(workspace: Workspace): Violation[] {
  return workspace.files
    .filter((file: SourceFile): boolean => isSpec(file.path))
    .filter((file: SourceFile): boolean => {
      const owner: Project | undefined = ownerOf(workspace, file.path);
      if (owner && tagValue(owner, 'layer') === 'e2e') return false;
      if (owner && tagValue(owner, 'layer') === 'tooling') return false;
      return !file.path.split('/').slice(0, -1).includes('testing');
    })
    .map((file: SourceFile): { rule: string; subject: string; detail: string } => ({
      rule: 'spec-in-testing-folder',
      subject: file.path,
      detail: 'move it',
    }));
}

/**
 * Function unitFolderViolations
 *
 * @description
 * Keeps production components and named executable units in their own folder. Related models and
 * flat constants/options are outside this filename rule; catalogue entry roots can be the unit folder.
 *
 * @param {Workspace} workspace - Normalized workspace source inventory.
 * @returns {Violation[]} Role-suffixed units whose immediate folder does not name their unit.
 */
export function unitFolderViolations(workspace: Workspace): Violation[] {
  const violations: Violation[] = [];
  for (const file of workspace.files) {
    if (!/^(?:apps|libs)\/.+\/src\//.test(file.path) || isTestCode(file.path)) continue;
    const name: string = posix.basename(file.path);
    const match: RegExpExecArray | null =
      /^(.+)\.(?:component|directives?|service|store|guard|interceptor|pipe|provider|resolver|controller|presenter|mapper|jobs|use-case|utils)\.[cm]?ts$/.exec(
        name,
      );
    const unit: string | undefined = match?.[1];
    if (unit === undefined) continue;
    const directory: string = posix.dirname(file.path);
    if (posix.basename(directory) !== unit) {
      violations.push({
        rule: 'named-unit-folder',
        subject: file.path,
        detail: `${directory}/${unit}/${name}`,
      });
    }
  }
  return violations;
}

/**
 * Finds sorted strongly connected components in the runtime file graph.
 * Type-only references are removed before traversal, including erased re-exports that import-x
 * currently treats as runtime dependencies.
 *
 * @param {ReadonlyMap<string, ReadonlySet<string>>} graph - Runtime source dependencies.
 * @returns {string[][]} Cyclic components, including self-edges.
 */
function stronglyConnected(graph: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
  let counter: number = 0;
  const index: Map<string, number> = new Map<string, number>();
  const low: Map<string, number> = new Map<string, number>();
  const stack: string[] = [];
  const onStack: Set<string> = new Set<string>();
  const components: string[][] = [];
  const connect = (node: string): void => {
    index.set(node, counter);
    low.set(node, counter);
    counter++;
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!index.has(next)) {
        connect(next);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node) ?? 0, index.get(next) ?? 0));
      }
    }
    if (low.get(node) === index.get(node)) {
      const component: string[] = [];
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member === undefined) break;
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      if (component.length > 1 || graph.get(node)?.has(node)) components.push(component.sort());
    }
  };
  for (const node of [...graph.keys()].sort()) if (!index.has(node)) connect(node);
  return components;
}

/**
 * Constant CANDIDATES
 *
 * @description
 * Extension and index suffixes tried when resolving source-relative imports.
 */
const CANDIDATES: string[] = ['', '.ts', '.mts', '/index.ts'];

/**
 * Function resolveRelative
 *
 * @description
 * Resolves a relative import against known workspace source files using the supported extension candidates.
 *
 * @param {ReadonlySet<string>} files - Known workspace-relative source paths.
 * @param {string} from - Importing source path.
 * @param {string} specifier - Relative module specifier.
 * @returns {string | undefined} First matching normalized source path.
 */
function resolveRelative(
  files: ReadonlySet<string>,
  from: string,
  specifier: string,
): string | undefined {
  const base: string = posix.normalize(posix.join(posix.dirname(from), specifier));
  const stem: string = base.replace(/\.js$/, '');
  return CANDIDATES.map((suffix: string): string => `${stem}${suffix}`).find(
    (path: string): boolean => files.has(path),
  );
}

/**
 * Function sourceTarget
 *
 * @description
 * Resolves a literal source dependency through public aliases, private aliases or a source-relative path.
 * External packages and generated assets have no source-file target in this graph.
 *
 * @param {Workspace} workspace - Normalized aliases and projects.
 * @param {ReadonlySet<string>} files - Known source filenames.
 * @param {string} from - Importing source file.
 * @param {string} specifier - Literal module reference.
 * @returns {string | undefined} Resolved source filename, if represented in the workspace.
 */
export function sourceTarget(
  workspace: Workspace,
  files: ReadonlySet<string>,
  from: string,
  specifier: string,
): string | undefined {
  if (specifier.startsWith('.')) return resolveRelative(files, from, specifier);
  const target: string | undefined =
    workspace.paths[specifier] ?? internalTarget(workspace, specifier);
  return target ? resolveRelative(files, '', target) : undefined;
}

/**
 * Reports runtime cycles within project source files while ignoring erased type references.
 * Interproject cycles belong to Nx's module-boundary rule, which already reads its project graph.
 *
 * @param {Workspace} workspace - Normalized source and alias metadata.
 * @returns {Violation[]} Runtime file cycles within their owning projects.
 */
export function cycleViolations(workspace: Workspace): Violation[] {
  const graph: Map<string, Set<string>> = new Map<string, Set<string>>();
  const paths: Set<string> = new Set(workspace.files.map((file: SourceFile): string => file.path));
  for (const file of workspace.files) {
    const owner: Project | undefined = ownerOf(workspace, file.path);
    if (!owner) continue;
    const edges: Set<string> = new Set<string>();
    graph.set(file.path, edges);
    for (const ref of file.imports) {
      if (ref.typeOnly) continue;
      const target: string | undefined = sourceTarget(workspace, paths, file.path, ref.specifier);
      if (target && ownerOf(workspace, target) === owner) edges.add(target);
    }
  }
  return stronglyConnected(graph).map((cycle: string[]): Violation => ({
    rule: 'no-file-cycle',
    subject: cycle[0] ?? '',
    detail: cycle.join(' <-> '),
  }));
}
