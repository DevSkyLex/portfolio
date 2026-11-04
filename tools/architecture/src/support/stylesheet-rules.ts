import { posix } from 'node:path';
import ts from 'typescript';
import { type Violation, ownerOf, sourceTarget } from '@internal/architecture/support/rules';
import type { Project, SourceFile, Workspace } from '@internal/architecture/support/workspace';

/*
 * Split of the global stylesheets (D31): apps/web/src/styles.css is loaded by every prerendered page
 * and scans only the presentation sources the public import graph reaches; apps/web/src/admin.css is
 * loaded with the lazy admin area and scans the whole frontend.
 */

/**
 * Interface StylesheetSources
 * @interface StylesheetSources
 *
 * @description
 * Tailwind `@source` directories of one stylesheet, resolved to workspace-relative POSIX paths.
 */
export interface StylesheetSources {
  // #region Properties
  /**
   * Property include
   * @readonly
   *
   * @description
   * Directories scanned by `@source '<dir>'`.
   *
   * @type {readonly string[]}
   */
  readonly include: readonly string[];

  /**
   * Property exclude
   * @readonly
   *
   * @description
   * Directories removed from the scan by `@source not '<dir>'`.
   *
   * @type {readonly string[]}
   */
  readonly exclude: readonly string[];
  // #endregion
}

/**
 * Interface PublicStylesheetInput
 * @interface PublicStylesheetInput
 *
 * @description
 * What the public stylesheet rule reads: the source graph, file contents for export resolution, the
 * application entries and the lazy admin area at which the public graph stops.
 */
export interface PublicStylesheetInput {
  // #region Properties
  /**
   * Property workspace
   * @readonly
   *
   * @description
   * Normalized projects, aliases and source imports.
   *
   * @type {Workspace}
   */
  readonly workspace: Workspace;

  /**
   * Property read
   * @readonly
   *
   * @description
   * Returns the content of a workspace-relative source file, used to resolve barrel exports.
   *
   * @type {(path: string) => string}
   */
  readonly read: (path: string) => string;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Application entry files from which the public graph starts.
   *
   * @type {readonly string[]}
   */
  readonly entries: readonly string[];

  /**
   * Property adminArea
   * @readonly
   *
   * @description
   * Directory of the lazy admin area: a dynamic import into it is the admin boundary.
   *
   * @type {string}
   */
  readonly adminArea: string;

  /**
   * Property sources
   * @readonly
   *
   * @description
   * `@source` directories of the public stylesheet.
   *
   * @type {StylesheetSources}
   */
  readonly sources: StylesheetSources;
  // #endregion
}

/**
 * Interface ModuleExports
 *
 * @description
 * Exported names of one module: declared locally, re-exported by name or through `export *`.
 */
interface ModuleExports {
  // #region Properties
  /** Whether the module declares or evaluates anything besides imports and re-exports. */
  readonly local: boolean;

  /** Names declared and exported by the module itself. */
  readonly declared: ReadonlySet<string>;

  /** Exported name to the specifier and original name it is re-exported from. */
  readonly named: ReadonlyMap<string, { readonly specifier: string; readonly name: string }>;

  /** Specifiers re-exported wholesale with `export *`. */
  readonly stars: readonly string[];
  // #endregion
}

/**
 * Type Resolver
 *
 * @description
 * Resolves a specifier written in one module to a workspace source file.
 */
type Resolver = (from: string, specifier: string) => string | undefined;

/**
 * Constant ALL
 *
 * @description
 * Requested-name marker for a module used as a whole (namespace or dynamic import, side effect).
 */
const ALL = '*' as const;

/**
 * Constant PRESENTATION_LAYERS
 *
 * @description
 * Project layers whose sources hold templates and Tailwind classes; data-access, model and platform
 * libraries render nothing, so the stylesheets do not scan them.
 */
const PRESENTATION_LAYERS: ReadonlySet<string> = new Set([
  'layer:ui',
  'layer:feature',
  'layer:shell',
]);

/**
 * Function parseSources
 *
 * @description
 * Reads the `@source` directives of a stylesheet, resolved against its directory; comments are ignored.
 *
 * @param {string} css - Stylesheet text.
 * @param {string} file - Workspace-relative path of the stylesheet.
 * @returns {StylesheetSources} Included and excluded directories, workspace-relative.
 */
export function parseSources(css: string, file: string): StylesheetSources {
  const include: string[] = [];
  const exclude: string[] = [];
  const text: string = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of text.matchAll(/@source\s+(not\s+)?(?:'([^']+)'|"([^"]+)")\s*;/g)) {
    const path: string = posix.normalize(
      posix.join(posix.dirname(file), match[2] ?? match[3] ?? ''),
    );
    (match[1] ? exclude : include).push(path.replace(/\/$/, ''));
  }
  return { include, exclude };
}

/**
 * Function covers
 *
 * @description
 * Whether a stylesheet scans a file: below an included directory and outside every excluded one.
 *
 * @param {StylesheetSources} sources - Stylesheet sources.
 * @param {string} path - Workspace-relative file.
 * @returns {boolean} Whether Tailwind reads the file for this stylesheet.
 */
export function covers(sources: StylesheetSources, path: string): boolean {
  const under = (dir: string): boolean => path.startsWith(`${dir}/`);
  return sources.include.some(under) && !sources.exclude.some(under);
}

/**
 * Function moduleExports
 *
 * @description
 * Collects the exported names of a module from its syntax, without type information.
 *
 * @param {string} path - Filename given to the parser.
 * @param {string} content - TypeScript source text.
 * @returns {ModuleExports} Local, named and wholesale exports.
 */
function moduleExports(path: string, content: string): ModuleExports {
  const source: ts.SourceFile = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
  const declared: Set<string> = new Set<string>();
  const named: Map<string, { specifier: string; name: string }> = new Map<
    string,
    { specifier: string; name: string }
  >();
  const stars: string[] = [];
  let local: boolean = false;
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) continue;
    if (ts.isExportDeclaration(statement)) {
      const clause: ts.NamedExportBindings | undefined = statement.exportClause;
      const specifier: string | undefined =
        statement.moduleSpecifier && ts.isStringLiteralLike(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      if (specifier === undefined) {
        // `export { a }`: names of the module itself.
        local = true;
        if (clause && ts.isNamedExports(clause)) {
          for (const element of clause.elements) declared.add(element.name.text);
        }
      } else if (!clause) stars.push(specifier);
      else if (ts.isNamedExports(clause)) {
        for (const element of clause.elements) {
          named.set(element.name.text, {
            specifier,
            name: (element.propertyName ?? element.name).text,
          });
        }
      } else named.set(clause.name.text, { specifier, name: ALL });
      continue;
    }
    local = true;
    const modifiers: readonly ts.ModifierLike[] = ts.canHaveModifiers(statement)
      ? (ts.getModifiers(statement) ?? [])
      : [];
    if (!modifiers.some((m: ts.ModifierLike): boolean => m.kind === ts.SyntaxKind.ExportKeyword)) {
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) declared.add(declaration.name.text);
      }
    } else if (
      (ts.isClassDeclaration(statement) ||
        ts.isFunctionDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      declared.add(statement.name.text);
    }
  }
  return { local, declared, named, stars };
}

/**
 * Function exportsName
 *
 * @description
 * Whether a module exports a name, directly or through its own re-exports.
 *
 * @param {string} path - Module to inspect.
 * @param {string} name - Exported name.
 * @param {(path: string) => ModuleExports} exportsOf - Cached export reader.
 * @param {Resolver} resolve - Specifier resolver.
 * @param {Set<string>} visiting - Modules on the current path, against cyclic barrels.
 * @returns {boolean} Whether the name is exported.
 */
function exportsName(
  path: string,
  name: string,
  exportsOf: (path: string) => ModuleExports,
  resolve: Resolver,
  visiting: Set<string>,
): boolean {
  if (visiting.has(path)) return false;
  visiting.add(path);
  const module: ModuleExports = exportsOf(path);
  if (module.declared.has(name) || module.named.has(name)) return true;
  return module.stars.some((specifier: string): boolean => {
    const resolved: string | undefined = resolve(path, specifier);
    return !!resolved && exportsName(resolved, name, exportsOf, resolve, visiting);
  });
}

/**
 * Function forwardsOf
 *
 * @description
 * Modules a barrel forwards one requested name to: its named re-export, else every `export *`
 * target that exports the name.
 *
 * @param {string} path - Barrel module.
 * @param {string} name - Requested export.
 * @param {(path: string) => ModuleExports} exportsOf - Cached export reader.
 * @param {Resolver} resolve - Specifier resolver.
 * @returns {[string, string][]} Target modules with the name to request; empty when unresolved.
 */
function forwardsOf(
  path: string,
  name: string,
  exportsOf: (path: string) => ModuleExports,
  resolve: Resolver,
): [string, string][] {
  const module: ModuleExports = exportsOf(path);
  const forward: { readonly specifier: string; readonly name: string } | undefined =
    module.named.get(name);
  if (forward) {
    const resolved: string | undefined = resolve(path, forward.specifier);
    return resolved ? [[resolved, forward.name]] : [];
  }
  return module.stars
    .map((specifier: string): string | undefined => resolve(path, specifier))
    .filter(
      (resolved: string | undefined): resolved is string =>
        !!resolved && exportsName(resolved, name, exportsOf, resolve, new Set<string>()),
    )
    .map((resolved: string): [string, string] => [resolved, name]);
}

/**
 * Function reach
 *
 * @description
 * Follows the runtime imports of the entries name by name through barrels, the way esbuild keeps
 * only the modules a binding needs from a side-effect-free package (D26). A module that declares
 * anything is taken whole; a barrel forwards each requested name to the module exporting it, and is
 * taken whole when a name cannot be resolved (default imports, for instance), which only widens the
 * result. With `stopAtAdmin`, a dynamic import into the admin area ends the walk and is reported as
 * an admin entry.
 *
 * @param {PublicStylesheetInput} input - Graph, reader and admin area.
 * @param {readonly string[]} entries - Files to start from.
 * @param {boolean} stopAtAdmin - Whether a dynamic import into the admin area ends the walk.
 * @returns {{ reached: Set<string>; admin: Set<string> }} Reached modules and skipped admin entries.
 */
function reach(
  input: PublicStylesheetInput,
  entries: readonly string[],
  stopAtAdmin: boolean,
): { reached: Set<string>; admin: Set<string> } {
  const files: Map<string, SourceFile> = new Map(
    input.workspace.files.map((file: SourceFile): [string, SourceFile] => [file.path, file]),
  );
  const names: Set<string> = new Set(files.keys());
  const cache: Map<string, ModuleExports> = new Map<string, ModuleExports>();
  const exportsOf = (path: string): ModuleExports => {
    let found: ModuleExports | undefined = cache.get(path);
    if (!found) {
      found = moduleExports(path, input.read(path));
      cache.set(path, found);
    }
    return found;
  };
  const resolve: Resolver = (from: string, specifier: string): string | undefined =>
    sourceTarget(input.workspace, names, from, specifier);
  const reached: Set<string> = new Set<string>();
  const admin: Set<string> = new Set<string>();
  const requested: Map<string, Set<string>> = new Map<string, Set<string>>();
  const pending: [string, string][] = entries.map((entry: string): [string, string] => [
    entry,
    ALL,
  ]);
  while (pending.length) {
    const next: [string, string] | undefined = pending.pop();
    if (!next) break;
    const [path, wanted] = next;
    const module: ModuleExports = exportsOf(path);
    let name: string = module.local ? ALL : wanted;
    const seen: Set<string> = requested.get(path) ?? new Set<string>();
    if (seen.has(name) || seen.has(ALL)) continue;
    seen.add(name);
    requested.set(path, seen);
    if (name !== ALL) {
      const forwards: [string, string][] = forwardsOf(path, name, exportsOf, resolve);
      if (forwards.length) {
        pending.push(...forwards);
        continue;
      }
      name = ALL;
      seen.add(name);
    }
    // A barrel holds no markup: only the modules it forwards to count as reached.
    if (module.local) reached.add(path);
    for (const ref of files.get(path)?.imports ?? []) {
      if (ref.typeOnly) continue;
      const resolved: string | undefined = resolve(path, ref.specifier);
      if (!resolved) continue;
      if (ref.dynamic && stopAtAdmin && resolved.startsWith(`${input.adminArea}/`)) {
        admin.add(resolved);
        continue;
      }
      const bindings: readonly string[] =
        ref.dynamic || ref.bindings.length === 0 ? [ALL] : ref.bindings;
      for (const binding of bindings) pending.push([resolved, binding]);
    }
  }
  return { reached, admin };
}

/**
 * Function isPresentation
 *
 * @description
 * Whether a file belongs to a frontend project that renders markup.
 *
 * @param {Workspace} workspace - Projects and their tags.
 * @param {string} path - Workspace-relative file.
 * @returns {boolean} Whether the file can hold Tailwind classes that reach the page.
 */
function isPresentation(workspace: Workspace, path: string): boolean {
  const owner: Project | undefined = ownerOf(workspace, path);
  return (
    path.startsWith('libs/frontend/') &&
    !!owner &&
    owner.tags.some((tag: string): boolean => PRESENTATION_LAYERS.has(tag))
  );
}

/**
 * Function publicStylesheetViolations
 *
 * @description
 * Checks the public stylesheet's `@source` list against the public import graph: every presentation
 * file the public pages reach is scanned, every scanned directory is still reached, and nothing of
 * the admin area or of a presentation project only the admin reaches is scanned.
 *
 * @param {PublicStylesheetInput} input - Graph, reader, entries, admin area and public sources.
 * @returns {Violation[]} Uncovered public files, stale sources and scanned admin files.
 */
export function publicStylesheetViolations(input: PublicStylesheetInput): Violation[] {
  const { workspace, sources } = input;
  const pub: { reached: Set<string>; admin: Set<string> } = reach(input, input.entries, true);
  const adminReached: Set<string> = reach(input, [...pub.admin], false).reached;
  const presentation: string[] = [...pub.reached]
    .filter((path: string): boolean => isPresentation(workspace, path))
    .sort();
  const violations: Violation[] = [];
  for (const path of presentation) {
    if (!covers(sources, path)) {
      violations.push({
        rule: 'public-stylesheet-source',
        subject: path,
        detail: 'reached by the public pages but not scanned by the public stylesheet',
      });
    }
  }
  for (const dir of sources.include) {
    const scanned: StylesheetSources = { include: [dir], exclude: sources.exclude };
    if (!presentation.some((path: string): boolean => covers(scanned, path))) {
      violations.push({
        rule: 'public-stylesheet-source',
        subject: dir,
        detail: 'scanned by the public stylesheet but reached by no public page',
      });
    }
  }
  const publicProjects: Set<string | undefined> = new Set(
    presentation.map((path: string): string | undefined => ownerOf(workspace, path)?.name),
  );
  for (const path of [...adminReached].sort()) {
    const adminOnly: boolean =
      path.startsWith(`${input.adminArea}/`) ||
      (isPresentation(workspace, path) && !publicProjects.has(ownerOf(workspace, path)?.name));
    if (adminOnly && covers(sources, path)) {
      violations.push({
        rule: 'public-stylesheet-admin',
        subject: path,
        detail: 'administration source scanned by the public stylesheet',
      });
    }
  }
  return violations;
}
