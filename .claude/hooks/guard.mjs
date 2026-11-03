#!/usr/bin/env node
/**
 * PreToolUse hook (portfolio): refuse writes that are never right in this repository.
 * Deny = exit 2 with the reason on stderr; everything else = exit 0.
 *
 * The same file runs for Claude Code (Write, Edit, MultiEdit) and, through the Codex adapter, for Codex
 * edits. It reads `tool_input.file_path` and the written text (`content`, `new_string`, or the
 * `edits[].new_string` of a MultiEdit) and denies:
 *
 *  1. Generated trees and files: `node_modules/`, `dist/`, `tmp/`, `.angular/`, `.nx/`, `coverage/`,
 *     `test-results/`, `playwright-report/`, `out-tsc/`, `.vitest/`, the content snapshot
 *     (`apps/web/content-snapshot/`), Drizzle migration metadata (`apps/<service>/migrations/meta/`),
 *     the installed Ansible collections, `package-lock.json` and the extracted i18n catalog
 *     `apps/web/src/locale/messages.xlf`. Run the tool that owns them.
 *  2. Git internals (`.git/`).
 *  3. Externally managed AI files: `.agents/skills/` except authored `pf-*` skills,
 *     `.github/{skills,agents,prompts}/`,
 *     `.codex/agents/ci-monitor-subagent.toml`, `opencode.json`, `.cursor/`, `.gemini/`.
 *  4. Secrets and local data: `.env*` files (except `.env.example`), `.data/` (PGlite databases, development
 *     signing keys, the development admin password), the Ansible vault (`vault.yml`, its decrypted copy,
 *     `.vault-pass`), `docker/dev/secrets/`, key files (`*.pem`, `*.key`, `*.p12`, `*.pfx`), and text that
 *     contains a GitHub or npm token or a PEM private key.
 *  5. Authored-code conventions that ESLint does not see or sees too late: component rules in
 *     `apps/web/src/styles.css`, `styleUrl` in a component, Reactive Forms imports (Signal Forms only),
 *     `export *` in a library entry point other than the `@vfortin/ui` catalogue (whose barrel must still
 *     keep its internal files out), and framework or I/O imports in a backend `domain` or `application`.
 *
 * Deliberately conservative: ordinary sources, specs, docs and configuration stay writable. The hook only
 * acts inside a portfolio checkout (marker: a package.json named `@vfortin/source`), found from the session
 * directory or by walking up from the edited file, so it is inert elsewhere.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Constant REPO_NAME
 *
 * @description
 * Package name used to distinguish this Nx checkout from other directories.
 */
const REPO_NAME = '@vfortin/source';

/**
 * Constant GENERATED
 *
 * @description
 * Repository-relative generated paths and the tools that own their regeneration.
 */
const GENERATED = [
  [/^(?:.*\/)?node_modules\//, 'an installed dependency (npm owns it)'],
  [/^dist\//, 'the build output (npx nx build <project>)'],
  [/^tmp\//, 'a temporary build folder'],
  [/^(?:.*\/)?\.angular\//, 'the Angular build cache'],
  [/^\.nx\//, 'the Nx cache and workspace data'],
  [/^(?:.*\/)?coverage\//, 'a coverage report'],
  [/^(?:.*\/)?test-results\//, 'a Playwright run artifact'],
  [/^(?:.*\/)?playwright-report\//, 'a Playwright report'],
  [/^(?:.*\/)?out-tsc\//, 'compiler output'],
  [/^(?:.*\/)?\.vitest\//, 'the Vitest cache'],
  [/^apps\/web\/content-snapshot\//, 'the content snapshot (npx nx run web:content-snapshot)'],
  [/^apps\/[^/]+-service\/migrations\/meta\//, 'Drizzle migration metadata (drizzle-kit generate)'],
  [/^ansible\/\.collections\//, 'an installed Ansible collection (ansible-galaxy)'],
];

/**
 * Constant NX_MANAGED
 *
 * @description
 * Directory prefixes managed by `nx configure-ai-agents` and protected from manual edits.
 * Shared skills are checked separately because valid `pf-*` folders belong to this repository.
 */
const NX_MANAGED = [
  '.github/skills/',
  '.github/agents/',
  '.github/prompts/',
  '.cursor/',
  '.gemini/',
];
/**
 * Constant NX_MANAGED_FILES
 *
 * @description
 * Individual files managed by `nx configure-ai-agents` and protected from manual edits.
 */
const NX_MANAGED_FILES = new Set(['.codex/agents/ci-monitor-subagent.toml', 'opencode.json']);

/**
 * Constant TOKEN_PATTERNS
 *
 * @description
 * Detects credential and private-key shapes in proposed file contents without embedding complete token examples.
 */
const TOKEN_PATTERNS = [
  new RegExp(['gh', '[pousr]_', '[A-Za-z0-9]{36,}'].join('')),
  new RegExp(['github', '_pat_', '[A-Za-z0-9_]{22,}'].join('')),
  new RegExp(['npm', '_', '[A-Za-z0-9]{36}'].join('')),
  new RegExp(['-----BEGIN ', '(?:[A-Z]+ )*', 'PRIVATE KEY-----'].join('')),
];

/**
 * Constant FRAMEWORKS_AND_IO
 *
 * @description
 * Matches framework, persistence and transport imports forbidden in backend domain and application code.
 */
const FRAMEWORKS_AND_IO =
  /\bfrom\s+['"](?:@nestjs\/[^'"]*|@angular\/[^'"]*|drizzle-orm(?:\/[^'"]*)?|pg|express|jose|nodemailer|rxjs(?:\/[^'"]*)?)['"]/;
/**
 * Constant ZOD_IMPORT
 *
 * @description
 * Matches Zod imports so the write guard can apply the stricter domain-layer rule.
 */
const ZOD_IMPORT = /\bfrom\s+['"]zod(?:\/[^'"]*)?['"]/;

/**
 * Constant UI_INTERNALS
 *
 * @description
 * Matches implementation-only UI catalogue exports that the public barrel must not expose.
 */
const UI_INTERNALS =
  /export\s+\*\s+from\s+['"][^'"]*(?:menu-panel|combobox-base|dialog-container|\.token)[^'"]*['"]/;

/**
 * Function deny
 *
 * @description
 * Creates the response shape consumed by the write-policy hook's refusal path.
 *
 * @param {string} message - Why the write is refused and what to do instead.
 * @returns {{ message: string }} The denial consumed by `main`.
 */
const deny = (message) => ({ message });

/**
 * Function isRepoRoot
 *
 * @description
 * Checks whether a directory contains the package manifest identifying this repository.
 *
 * @param {string} dir - Candidate repository root.
 * @returns {boolean} True when `dir/package.json` is named `@vfortin/source`.
 */
function isRepoRoot(dir) {
  const manifest = path.join(dir, 'package.json');
  if (!existsSync(manifest)) return false;
  try {
    return JSON.parse(readFileSync(manifest, 'utf8'))?.name === REPO_NAME;
  } catch {
    return false;
  }
}

/**
 * Function findRepoRoot
 *
 * @description
 * Walks from a file or directory toward the filesystem root and returns the nearest matching checkout.
 *
 * @param {string} start - File or directory to start from.
 * @returns {string | null} The checkout root, or null outside a checkout.
 */
export function findRepoRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (isRepoRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Function writtenText
 *
 * @description
 * Extracts proposed write text, joining every replacement supplied by a MultiEdit payload.
 *
 * @param {object | undefined} input - The tool input.
 * @returns {string} The proposed text, empty when the payload carries none.
 */
export function writtenText(input) {
  if (!input) return '';
  if (Array.isArray(input.edits)) return input.edits.map((e) => e?.new_string ?? '').join('\n');
  return String(input.content ?? input.new_string ?? '');
}

/**
 * Function evaluateWrite
 *
 * @description
 * Applies repository path, secret and authored-code restrictions to a proposed file write.
 * Returns the first refusal so the caller can report one actionable reason.
 *
 * @param {string} relative - Repository-relative target path.
 * @param {string} text - Proposed contents, checked for secrets and conventions.
 * @returns {{ message: string } | null} The first refusal, or null when the write is allowed.
 */
export function evaluateWrite(relative, text) {
  const rel = relative.replace(/\\/g, '/').replace(/^\.\//, '');
  const lower = rel.toLowerCase();
  const base = rel.split('/').pop() ?? '';
  const body = String(text ?? '');

  for (const [pattern, what] of GENERATED) {
    if (pattern.test(rel)) return deny(`${rel} is ${what}. Edit the source and regenerate it.`);
  }
  if (base === 'package-lock.json') {
    return deny(`${rel} is a lockfile. Change dependencies with npm install, never by hand.`);
  }
  if (rel === 'apps/web/src/locale/messages.xlf') {
    return deny(
      `${rel} is the extracted source catalog. Change the $localize / i18n source, then run ` +
        'npx nx run web:extract-i18n; translations go to apps/web/src/locale/messages.en.xlf.',
    );
  }
  if (rel === '.git' || /^(?:.*\/)?\.git\//.test(rel)) {
    return deny(
      `${rel} is inside .git/. Git internals are not edited by agents (hooks live in .githooks/).`,
    );
  }
  const projectSkill =
    /^\.agents\/skills\/pf-[a-z0-9]+(?:-[a-z0-9]+)*\/.+/.test(lower) &&
    !lower.split('/').some((part) => part === '.' || part === '..');
  const externalSkill = lower.startsWith('.agents/skills/') && !projectSkill;
  if (
    externalSkill ||
    NX_MANAGED.some((prefix) => lower.startsWith(prefix)) ||
    NX_MANAGED_FILES.has(rel)
  ) {
    return deny(
      `${rel} is externally managed AI tooling; Nx and vendored skills stay unchanged. ` +
        'Repository-owned shared skills use a valid pf-* folder under .agents/skills/.',
    );
  }

  if (/(^|\/)\.env(\.|$)/.test(rel) && !/^\.env\.(example|dist)$/.test(base)) {
    return deny(`${rel} is an environment file. Do not write configuration secrets; ask the user.`);
  }
  if (rel === '.data' || lower.startsWith('.data/')) {
    return deny(
      `${rel} is local data (PGlite databases, development signing keys, the development admin ` +
        'password). Use the service CLI targets (db-migrate, db-seed, generate-key) instead.',
    );
  }
  if (
    /^ansible\/inventory\/group_vars\/[^/]+\/vault\.yml(?:\.dec)?$/.test(rel) ||
    base === '.vault-pass'
  ) {
    return deny(
      `${rel} holds production secrets (Ansible Vault). Only the user edits it, with ansible-vault.`,
    );
  }
  if (lower.startsWith('docker/dev/secrets/')) {
    return deny(
      `${rel} is a development Docker secret; changing it desynchronises the Postgres volume. Ask the user.`,
    );
  }
  if (/\.(?:pem|key|p12|pfx)$/i.test(base)) {
    return deny(
      `${rel} looks like a key file. Keys are generated by their tool, never written by an agent.`,
    );
  }
  if (TOKEN_PATTERNS.some((pattern) => pattern.test(body))) {
    return deny(
      `${rel}: the text contains what looks like a token or a private key. Never write secrets.`,
    );
  }

  if (rel === 'apps/web/src/styles.css' && /^[ \t]*[.#[][^\n{}]*\{/m.test(body)) {
    return deny(
      'apps/web/src/styles.css holds imports, Tailwind sources and document rules only: no class or id ' +
        'rule. Style components with Tailwind utilities over the tokens of libs/frontend/design-tokens.',
    );
  }
  if (/^(?:libs\/frontend|apps\/web)\/.*\.ts$/.test(rel) && /\bstyleUrls?\s*:/.test(body)) {
    return deny(
      `${rel}: no styleUrl. Components are styled with literal Tailwind classes; CSS that Tailwind cannot ` +
        'express goes, small and justified, in the inline styles of the component.',
    );
  }
  if (
    /^(?:libs\/frontend|apps\/web)\/.*\.ts$/.test(rel) &&
    /import\s*\{[^}]*\b(?:ReactiveFormsModule|FormsModule|FormBuilder|FormGroup|FormControl|NgModel)\b[^}]*\}\s*from\s*['"]@angular\/forms['"]/.test(
      body,
    )
  ) {
    return deny(
      `${rel}: forms use Signal Forms (@angular/forms/signals), never Reactive or template forms.`,
    );
  }
  if (/^libs\/.*\/src\/[^/]+\.ts$/.test(rel) && /^\s*export\s+\*\s+from\s/m.test(body)) {
    if (rel !== 'libs/frontend/ui/src/index.ts') {
      return deny(
        `${rel} uses "export * from". A library entry point re-exports names explicitly ` +
          '(export { X } from ..., export type { Y } from ...) so widening it is deliberate.',
      );
    }
    if (UI_INTERNALS.test(body)) {
      return deny(
        `${rel} exposes an internal file of the catalogue (menu-panel, combobox-base, *.token.ts, ` +
          'dialog-container stay out of the barrel, libs/frontend/ui/README.md).',
      );
    }
  }
  if (/^libs\/backend\/[^/]+\/(?:domain|application)\/src\/.*\.ts$/.test(rel)) {
    const domain = /\/domain\/src\//.test(rel);
    if (FRAMEWORKS_AND_IO.test(body) || (domain && ZOD_IMPORT.test(body))) {
      return deny(
        `${rel}: domain and application stay free of NestJS, Angular, the ORM, transport and I/O` +
          `${domain ? ' (and Zod in the domain)' : ''}. Declare a port in application and implement it in ` +
          'adapters-out (docs/architecture/boundaries.md).',
      );
    }
  }
  return null;
}

/**
 * Function main
 *
 * @description
 * Reads the hook payload, resolves its target within the checkout and writes a refusal when policy rejects it.
 * Malformed input and paths outside the repository are allowed through.
 *
 * @returns {number} 2 for a refused write, 0 otherwise.
 */
function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return 0;
  }
  const input = payload?.tool_input;
  const file = input?.file_path ?? input?.filePath;
  if (!file) return 0;
  const cwd = payload?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const absolute = path.resolve(cwd, file);
  const root = findRepoRoot(path.dirname(absolute));
  if (!root) return 0;
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return 0;
  const denial = evaluateWrite(relative, writtenText(input));
  if (!denial) return 0;
  process.stderr.write(`Blocked: ${denial.message}\n`);
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
