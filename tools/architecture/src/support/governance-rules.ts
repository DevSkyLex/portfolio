import type { Project, SourceFile, Workspace } from '@internal/architecture/support/workspace';
import { ownerOf, sourceTarget, type Violation } from '@internal/architecture/support/rules';

/**
 * Interface OwnerContract
 *
 * @description
 * Normative owner sections and public grants parsed outside Markdown examples and code fences.
 */
export interface OwnerContract {
  // #region Properties
  /**
   * Property sections
   *
   * @description
   * Text below each second-level heading, used to require a documented responsibility and lifetime.
   */
  readonly sections: Readonly<Record<string, string>>;

  /**
   * Property entries
   *
   * @description
   * Exact public module names and the Nx project names their owner authorizes as consumers.
   */
  readonly entries: Readonly<Record<string, readonly string[]>>;

  /**
   * Property errors
   *
   * @description
   * Ambiguous or malformed grants that must be repaired rather than silently widening access.
   */
  readonly errors: readonly string[];
  // #endregion
}

/**
 * Constant REQUIRED_SECTIONS
 *
 * @description
 * Minimal owner contracts; implementation catalogs and generated Nx instructions do not replace them.
 */
const REQUIRED_SECTIONS: string[] = [
  'Purpose',
  'Public entry points',
  'Provider scope',
  'Invariants',
  'Validation',
];

/**
 * Function parseOwnerContract
 *
 * @description
 * Reads exact entry/consumer grants only from the Public entry points table. Code fences, prose and
 * unrelated tables cannot authorize a dependency.
 *
 * @param {string} markdown - Owner-authored README content.
 * @returns {OwnerContract} Required sections, exact grants and parse failures.
 */
export function parseOwnerContract(markdown: string): OwnerContract {
  const sections: Record<string, string> = {};
  const entries: Record<string, readonly string[]> = {};
  const errors: string[] = [];
  let heading: string = '';
  let fence: string | undefined;
  let table: boolean = false;
  for (const line of markdown.split(/\r?\n/)) {
    const marker: string | undefined = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker[0];
      else if (marker[0] === fence) fence = undefined;
      continue;
    }
    if (fence) continue;
    const section: string | undefined = /^##\s+(.+?)\s*$/.exec(line)?.[1];
    if (section) {
      heading = section;
      sections[heading] = sections[heading] ?? '';
      table = false;
      continue;
    }
    if (heading) sections[heading] = `${sections[heading] ?? ''}${line}\n`;
    if (heading !== 'Public entry points') continue;
    const cells: string[] | undefined = /^\s*\|(.+)\|\s*$/
      .exec(line)?.[1]
      ?.split('|')
      .map((cell: string): string => cell.trim());
    if (!cells) continue;
    if (cells[0] === 'Entry point' && cells[1] === 'Consumers' && cells.length === 2) {
      table = true;
      continue;
    }
    if (!table || cells.every((cell: string): boolean => /^:?-+:?$/.test(cell))) continue;
    const entry: string | undefined = cells[0]?.replace(/`/g, '').trim();
    const consumerCell: string | undefined = cells[1]?.replace(/`/g, '').trim();
    if (
      cells.length !== 2 ||
      !entry ||
      !consumerCell ||
      !/^@vfortin\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(entry)
    ) {
      errors.push(`invalid public entry row: ${line.trim()}`);
      continue;
    }
    if (entry in entries) {
      errors.push(`duplicate public entry: ${entry}`);
      continue;
    }
    const consumers: string[] =
      consumerCell === 'None'
        ? []
        : consumerCell.split(',').map((value: string): string => value.trim());
    if (consumers.some((value: string): boolean => !/^[a-z0-9-]+$/.test(value))) {
      errors.push(`invalid consumers for ${entry}: ${consumerCell}`);
      continue;
    }
    entries[entry] = consumers;
  }
  return { sections, entries, errors };
}

/**
 * Function frontendOwners
 *
 * @description
 * Selects populated frontend libraries whose README grants access to their own public surfaces.
 *
 * @param {Workspace} workspace - Normalized workspace.
 * @returns {Project[]} Frontend library owners.
 */
function frontendOwners(workspace: Workspace): Project[] {
  return workspace.projects.filter((project: Project): boolean =>
    project.root.startsWith('libs/frontend/'),
  );
}

/**
 * Function ownerContractViolations
 *
 * @description
 * Requires owner documentation and validates that grants describe the owner's configured public
 * entries and real external Nx consumers. Consumer-authored prose cannot grant access.
 *
 * @param {Workspace} workspace - Source graph and README snapshots.
 * @returns {Violation[]} Missing contracts, malformed grants and undeclared owner entries.
 */
export function ownerContractViolations(workspace: Workspace): Violation[] {
  const violations: Violation[] = [];
  const names: Set<string> = new Set(
    workspace.projects.map((project: Project): string => project.name),
  );
  for (const project of frontendOwners(workspace)) {
    const readme: string | undefined = workspace.readmes?.[project.name];
    if (!readme) {
      violations.push({
        rule: 'owner-contract',
        subject: project.name,
        detail: 'missing README owner contract',
      });
      continue;
    }
    const contract: OwnerContract = parseOwnerContract(readme);
    for (const section of REQUIRED_SECTIONS) {
      if (!contract.sections[section]?.trim()) {
        violations.push({
          rule: 'owner-contract',
          subject: project.name,
          detail: `missing ${section} section`,
        });
      }
    }
    for (const error of contract.errors)
      violations.push({ rule: 'owner-public-entry', subject: project.name, detail: error });
    for (const [entry, consumers] of Object.entries(contract.entries)) {
      const target: string | undefined = workspace.paths[entry];
      if (!target || ownerOf(workspace, target) !== project) {
        violations.push({
          rule: 'owner-public-entry',
          subject: project.name,
          detail: `${entry} is not this owner's configured entry`,
        });
      }
      for (const consumer of consumers) {
        if (!names.has(consumer) || consumer === project.name) {
          violations.push({
            rule: 'owner-public-consumer',
            subject: entry,
            detail: `invalid external consumer ${consumer}`,
          });
        }
      }
    }
    for (const [entry, target] of Object.entries(workspace.paths)) {
      if (!entry.startsWith('@vfortin/') || ownerOf(workspace, target) !== project) continue;
      if (!(entry in contract.entries)) {
        violations.push({
          rule: 'owner-public-entry',
          subject: project.name,
          detail: `${entry} has no owner grant row`,
        });
      }
    }
  }
  return violations;
}

/**
 * Function publicConsumerViolations
 *
 * @description
 * Checks every cross-project frontend import against the target owner's exact public-entry grant.
 * Both runtime and type-only references need an authorized consumer.
 *
 * @param {Workspace} workspace - Source graph and owner README snapshots.
 * @returns {Violation[]} Imports made by a consumer the owner did not authorize.
 */
export function publicConsumerViolations(workspace: Workspace): Violation[] {
  const contracts: Map<string, OwnerContract> = new Map(
    frontendOwners(workspace).map((project: Project): [string, OwnerContract] => [
      project.name,
      parseOwnerContract(workspace.readmes?.[project.name] ?? ''),
    ]),
  );
  const violations: Violation[] = [];
  for (const file of workspace.files) {
    const consumer: Project | undefined = ownerOf(workspace, file.path);
    if (!consumer) continue;
    for (const ref of file.imports) {
      const target: string | undefined = workspace.paths[ref.specifier];
      const owner: '' | Project | undefined = target && ownerOf(workspace, target);
      if (!owner || owner === consumer || !contracts.has(owner.name)) continue;
      if (!contracts.get(owner.name)?.entries[ref.specifier]?.includes(consumer.name)) {
        violations.push({
          rule: 'public-entry-consumer',
          subject: `${file.path}:${ref.line}`,
          detail: `${consumer.name} is not authorized by ${owner.name} for ${ref.specifier}`,
        });
      }
    }
  }
  return violations;
}

/**
 * Constant ADMIN_LAYOUT_PORTS
 *
 * @description
 * Narrow owner APIs a shell may consume; concrete business services and stores stay behind these contracts.
 */
const ADMIN_LAYOUT_PORTS: Set<string> = new Set([
  '@vfortin/content-web-data-access/navigation',
  '@vfortin/contact-web-data-access/summary',
  '@vfortin/identity-web-data-access/session',
]);

/**
 * Function layoutPortViolations
 *
 * @description
 * Keeps administration shell components and their palette out of business data-access roots and
 * concrete transport/store bindings. Tests may still arrange owner doubles through their normal APIs.
 *
 * @param {Workspace} workspace - Normalized source graph.
 * @returns {Violation[]} Concrete business dependencies in production shell components.
 */
export function layoutPortViolations(workspace: Workspace): Violation[] {
  const violations: Violation[] = [];
  for (const file of workspace.files) {
    if (
      !file.path.startsWith('libs/frontend/shell/src/lib/admin/') ||
      file.path.includes('/testing/') ||
      !/\.(component|directive)\.ts$/.test(file.path)
    )
      continue;
    for (const ref of file.imports) {
      if (!/^@vfortin\/(content|contact|identity)-web-data-access(?:\/|$)/.test(ref.specifier))
        continue;
      if (
        !ADMIN_LAYOUT_PORTS.has(ref.specifier) ||
        ref.bindings.some(
          (name: string): boolean => name === '*' || /(?:ApiService|Store|Dto)$/.test(name),
        )
      ) {
        violations.push({
          rule: 'layout-owner-port',
          subject: `${file.path}:${ref.line}`,
          detail: `${ref.specifier}: consume an owner port instead of a concrete API, store or DTO`,
        });
      }
    }
  }
  return violations;
}

/**
 * Function specTypecheckViolations
 *
 * @description
 * Makes semantic spec checking a maintained dependency of every owner's normal typecheck target.
 * Projects without a spec configuration do not manufacture an empty test gate.
 *
 * @param {Workspace} workspace - Authored project target metadata.
 * @param {(path: string) => boolean} exists - Workspace-relative filesystem predicate.
 * @returns {Violation[]} Missing or detached semantic spec compilation commands.
 */
export function specTypecheckViolations(
  workspace: Workspace,
  exists: (path: string) => boolean,
): Violation[] {
  const violations: Violation[] = [];
  for (const project of workspace.projects) {
    if (!exists(`${project.root}/tsconfig.spec.json`)) continue;
    const command: string | undefined = project.targets?.['typecheck-spec']?.options?.command;
    const expected: string = `tsc -p ${project.root}/tsconfig.spec.json --noEmit`;
    if (
      command !== expected ||
      !project.targets?.['typecheck']?.dependsOn?.includes('typecheck-spec')
    ) {
      violations.push({
        rule: 'semantic-spec-typecheck',
        subject: project.name,
        detail: `typecheck must depend on typecheck-spec running ${expected}`,
      });
    }
  }
  return violations;
}

/**
 * Constant LIGHTWEIGHT_ENTRIES
 *
 * @description
 * Source-level eager reachability promises for deliberately light public APIs. Angular deferred
 * component dependencies are outside this gate; actual bundle qualification remains a build concern.
 */
const LIGHTWEIGHT_ENTRIES: Readonly<Record<string, readonly string[]>> = {
  '@vfortin/content-web-data-access': ['/src/lib/admin/'],
  '@vfortin/identity-web-data-access/http': ['/src/lib/state/'],
  '@vfortin/contact-web-data-access/links': [],
};

/**
 * Function lightweightEntryPointViolations
 *
 * @description
 * Follows eager, runtime source references from light entries and rejects server validation, NgRx or
 * explicitly separated admin/state files. Type-only edges and dynamic loading do not enlarge eager reachability.
 *
 * @param {Workspace} workspace - Normalized source dependency graph.
 * @returns {Violation[]} Light entries that statically reach their forbidden dependency surface.
 */
export function lightweightEntryPointViolations(workspace: Workspace): Violation[] {
  const files: Map<string, SourceFile> = new Map(
    workspace.files.map((file: SourceFile): [string, SourceFile] => [file.path, file]),
  );
  const names: Set<string> = new Set(files.keys());
  const violations: Violation[] = [];
  for (const [entry, forbiddenPaths] of Object.entries(LIGHTWEIGHT_ENTRIES)) {
    const start: string | undefined = workspace.paths[entry];
    if (!start || !files.has(start)) continue;
    const pending: string[] = [start];
    const visited: Set<string> = new Set<string>();
    let failure: string | undefined;
    while (pending.length && !failure) {
      const current: string | undefined = pending.shift();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      if (forbiddenPaths.some((fragment: string): boolean => current.includes(fragment))) {
        failure = `eagerly reaches ${current}`;
        break;
      }
      for (const ref of files.get(current)?.imports ?? []) {
        if (ref.typeOnly || ref.dynamic) continue;
        if (/^(?:zod(?:\/|$)|@ngrx\/|@angular\/ssr(?:\/|$))/.test(ref.specifier)) {
          failure = `${current}:${ref.line} eagerly imports ${ref.specifier}`;
          break;
        }
        const target: string | undefined = sourceTarget(workspace, names, current, ref.specifier);
        if (target) pending.push(target);
      }
    }
    if (failure)
      violations.push({ rule: 'lightweight-entry-reachability', subject: entry, detail: failure });
  }
  return violations;
}
