import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { readCachedProjectGraph, type ProjectGraphProjectNode } from '@nx/devkit';
import ts from 'typescript';

/**
 * Interface Project
 * @interface Project
 *
 * @description
 * Normalized Nx project metadata used by workspace architecture checks.
 */
export interface Project {
  // #region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Nx project name used in dependency and diagnostic reports.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property root
   * @readonly
   *
   * @description
   * Workspace-relative project directory using POSIX separators and no trailing slash.
   *
   * @type {string}
   */
  readonly root: string;

  /**
   * Property tags
   * @readonly
   *
   * @description
   * Nx tags declared by the project and checked against its location and allowed dimensions.
   *
   * @type {readonly string[]}
   */
  readonly tags: readonly string[];

  /**
   * Property projectType
   * @readonly
   *
   * @description
   * Nx project kind, defaulted from the project root when metadata omits it.
   *
   * @type {'application' | 'library'}
   */
  readonly projectType: 'application' | 'library';

  /**
   * Property targets
   *
   * @description
   * Resolved Nx target settings needed to prove semantic spec checking is part of normal typecheck.
   */
  readonly targets?: Readonly<Record<string, ProjectTarget>>;
  // #endregion
}

/**
 * Interface ProjectTarget
 *
 * @description
 * Resolved target configuration fields inspected by architecture checks.
 */
export interface ProjectTarget {
  // #region Properties
  /**
   * Property options
   *
   * @description
   * Command resolved by Nx for a run-commands target.
   */
  readonly options?: { readonly command?: string };

  /**
   * Property dependsOn
   *
   * @description
   * Same-project target dependencies resolved by Nx.
   */
  readonly dependsOn?: readonly unknown[];
  // #endregion
}

/**
 * Interface ImportRef
 * @interface ImportRef
 *
 * @description
 * Parsed module reference with source location and runtime-erasure information for ownership and reachability checks.
 */
export interface ImportRef {
  // #region Properties
  /**
   * Property specifier
   * @readonly
   *
   * @description
   * Module specifier exactly as written in the source import.
   *
   * @type {string}
   */
  readonly specifier: string;

  /**
   * Property typeOnly
   * @readonly
   *
   * @description
   * Whether this reference is erased at runtime and therefore excluded from eager reachability.
   *
   * @type {boolean}
   */
  readonly typeOnly: boolean;

  /**
   * Property dynamic
   *
   * @description
   * Whether loading is deferred by a literal import() rather than a static module dependency.
   */
  readonly dynamic: boolean;

  /**
   * Property bindings
   *
   * @description
   * Original imported symbols, including a namespace marker, for layout contract checks.
   */
  readonly bindings: readonly string[];

  /**
   * Property line
   * @readonly
   *
   * @description
   * One-based source line containing the import declaration.
   *
   * @type {number}
   */
  readonly line: number;
  // #endregion
}

/**
 * Interface SourceFile
 * @interface SourceFile
 *
 * @description
 * Workspace source file and its statically parsed module references.
 */
export interface SourceFile {
  // #region Properties
  /**
   * Property path
   * @readonly
   *
   * @description
   * Workspace-relative source path using POSIX separators.
   *
   * @type {string}
   */
  readonly path: string;

  /**
   * Property imports
   * @readonly
   *
   * @description
   * Import and export references parsed from the source file.
   *
   * @type {readonly ImportRef[]}
   */
  readonly imports: readonly ImportRef[];
  // #endregion
}

/**
 * Interface Workspace
 * @interface Workspace
 *
 * @description
 * Minimal project graph input consumed by structural architecture rules.
 */
export interface Workspace {
  // #region Properties
  /**
   * Property projects
   * @readonly
   *
   * @description
   * Projects discovered under workspace applications, libraries and tools.
   *
   * @type {readonly Project[]}
   */
  readonly projects: readonly Project[];

  /**
   * Property paths
   * @readonly
   *
   * @description
   * Normalized first target of each `compilerOptions.paths` entry from the root tsconfig.
   *
   * @type {Readonly<Record<string, string>>}
   */
  readonly paths: Readonly<Record<string, string>>;

  /**
   * Property files
   * @readonly
   *
   * @description
   * TypeScript source files belonging to discovered projects, excluding generated and test-output trees.
   *
   * @type {readonly SourceFile[]}
   */
  readonly files: readonly SourceFile[];

  /**
   * Property readmes
   *
   * @description
   * Owner README sources keyed by frontend project name. Fixtures may omit them when testing unrelated rules.
   */
  readonly readmes?: Readonly<Record<string, string>>;
  // #endregion
}

/**
 * Interface TypeScriptPathsConfiguration
 *
 * @description
 * Root compiler path aliases consumed by workspace discovery.
 */
interface TypeScriptPathsConfiguration {
  readonly compilerOptions: { readonly paths?: Readonly<Record<string, readonly string[]>> };
}

/**
 * Constant SOURCE
 *
 * @description
 * Matches TypeScript module extensions included in static workspace import analysis.
 */
const SOURCE: RegExp = /\.(ts|mts|cts)$/;

/**
 * Constant SKIPPED_DIRS
 *
 * @description
 * Directory names omitted from source discovery because they contain generated, vendored or non-source content.
 */
const SKIPPED_DIRS: Set<string> = new Set([
  'node_modules',
  'dist',
  'coverage',
  'out-tsc',
  'test-output',
  'content-snapshot',
  'locale',
  'migrations',
  '.angular',
  '.nx',
]);

/**
 * Function posix
 *
 * @description
 * Converts a platform-native path to slash-separated form for stable workspace paths.
 *
 * @param {string} path - Native filesystem path.
 * @returns {string} Path with platform separators replaced by `/`.
 */
const posix = (path: string): string => path.split(sep).join('/');

/**
 * Function walk
 *
 * @description
 * Recursively visits non-hidden entries while pruning generated and excluded directories.
 *
 * @param {string} dir - Directory to enumerate.
 * @param {(path: string) => void} visit - Callback invoked for each non-directory entry.
 *
 * @returns {void}
 */
function walk(dir: string, visit: (path: string) => void): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIPPED_DIRS.has(entry.name)) continue;
    const full: string = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full);
  }
}

/**
 * Function parseImports
 *
 * @description
 * Extracts static import, export, dynamic import and import-type references with one-based source lines.
 * Type-only references are marked so eager reachability checks can ignore erased dependencies.
 *
 * @param {string} fileName - Source filename passed to the TypeScript parser for diagnostics and positions.
 * @param {string} content - TypeScript source text to analyze.
 * @returns {ImportRef[]} Parsed references in source traversal order.
 */
export function parseImports(fileName: string, content: string): ImportRef[] {
  const source: ts.SourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const refs: ImportRef[] = [];
  /**
   * Function add
   *
   * @description
   * Appends a string-literal module reference with its one-based source line.
   *
   * @param {ts.Node} node - Import or export node supplying the source position.
   * @param {ts.Expression} specifier - Module specifier expression to inspect.
   * @param {boolean} typeOnly - Whether the reference is erased from runtime output.
   */
  const add = (
    node: ts.Node,
    specifier: ts.Expression,
    typeOnly: boolean,
    bindings: readonly string[] = [],
    dynamic: boolean = false,
  ): void => {
    if (!ts.isStringLiteralLike(specifier)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    refs.push({ specifier: specifier.text, typeOnly, dynamic, bindings, line: line + 1 });
  };
  /**
   * Function visit
   *
   * @description
   * Traverses the syntax tree and delegates each supported module reference to `add`.
   *
   * @param {ts.Node} node - Syntax node currently visited.
   */
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const clause: ts.ImportClause | undefined = node.importClause;
      const typeOnly: boolean =
        !!clause &&
        (clause.isTypeOnly ||
          (!clause.name &&
            !!clause.namedBindings &&
            ts.isNamedImports(clause.namedBindings) &&
            clause.namedBindings.elements.length > 0 &&
            clause.namedBindings.elements.every(
              (element: ts.ImportSpecifier): boolean => element.isTypeOnly,
            )));
      const bindings: string[] = [
        ...(clause?.name ? [clause.name.text] : []),
        ...(clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings) ? ['*'] : []),
        ...(clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
          ? clause.namedBindings.elements.map(
              (element: ts.ImportSpecifier): string => (element.propertyName ?? element.name).text,
            )
          : []),
      ];
      add(node, node.moduleSpecifier, typeOnly, bindings);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const clause: ts.NamedExportBindings | undefined = node.exportClause;
      const typeOnly: boolean =
        node.isTypeOnly ||
        (!!clause &&
          ts.isNamedExports(clause) &&
          clause.elements.length > 0 &&
          clause.elements.every((element: ts.ExportSpecifier): boolean => element.isTypeOnly));
      add(node, node.moduleSpecifier, typeOnly);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0]
    ) {
      // Lazy imports load at runtime but never at module evaluation: kept for boundaries.
      add(node, node.arguments[0], false, [], true);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      add(node, node.argument.literal, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return refs;
}

/**
 * Function loadWorkspace
 *
 * @description
 * Reads Nx's resolved project graph, normalized TypeScript aliases and eligible source imports.
 * Run through Nx so its graph cache already includes inferred projects and targets. Hidden and
 * generated directories are skipped by the source traversal helper.
 *
 * @param {string} workspaceRoot - Absolute or relative root directory of the Nx workspace.
 * @returns {Workspace} Normalized project and source graph for architecture checks.
 */
export function loadWorkspace(workspaceRoot: string): Workspace {
  const projects: Project[] = Object.values(readCachedProjectGraph().nodes).map(
    ({ name, data }: ProjectGraphProjectNode): Project => ({
      name,
      root: posix(data.root),
      // Nx adds package visibility tags independently of the owner's architectural dimensions.
      tags: (data.tags ?? []).filter(
        (tag: string): boolean => !['npm:private', 'npm:public'].includes(tag),
      ),
      projectType: data.projectType ?? (data.root.startsWith('apps/') ? 'application' : 'library'),
      ...(data.targets ? { targets: data.targets } : {}),
    }),
  );

  const base: TypeScriptPathsConfiguration = JSON.parse(
    readFileSync(join(workspaceRoot, 'tsconfig.base.json'), 'utf8'),
  ) as TypeScriptPathsConfiguration;
  const paths: Record<string, string> = {};
  for (const [key, targets] of Object.entries(base.compilerOptions.paths ?? {})) {
    paths[key] = posix(targets[0] ?? '').replace(/^\.\//, '');
  }

  const files: SourceFile[] = [];
  for (const project of projects) {
    walk(join(workspaceRoot, project.root), (path: string): void => {
      if (!SOURCE.test(path) || path.endsWith('.d.ts') || !statSync(path).isFile()) return;
      const file: string = posix(relative(workspaceRoot, path));
      files.push({ path: file, imports: parseImports(file, readFileSync(path, 'utf8')) });
    });
  }
  const readmes: Record<string, string> = {};
  for (const project of projects) {
    if (!project.root.startsWith('libs/frontend/')) continue;
    const file: string = join(workspaceRoot, project.root, 'README.md');
    if (existsSync(file)) readmes[project.name] = readFileSync(file, 'utf8');
  }
  return { projects, paths, files, readmes };
}
