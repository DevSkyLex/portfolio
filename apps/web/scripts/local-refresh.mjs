// Rebuilds the local static site from a running content service, so that admin changes show on the
// Docker stack (Nginx serves dist/apps/web). The committed snapshot is never written: the fetched pair
// goes to tmp/local-refresh/ and the build reads it through a generated tsconfig.
// Usage: node apps/web/scripts/local-refresh.mjs [content-api-url]
//   default http://localhost:8080/api/content/snapshot (Docker stack); CONTENT_API_URL also works,
//   e.g. http://localhost:3101 for a content service started with nx serve.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadContentSnapshots } from './fetch-content-snapshot.mjs';
import { writeSeoFiles } from './generate-seo-files.mjs';

/** Snapshot endpoint of the Docker stack, through its Nginx. */
export const DEFAULT_LOCAL_API_URL = 'http://localhost:8080/api/content/snapshot';

/** Private alias the web build imports the snapshot through (`tsconfig.base.json`, D7). */
const SNAPSHOT_ALIAS = '@internal/web-snapshot/*';

/** Path suffix accepted on the command line and stripped before `downloadContentSnapshots`. */
const SNAPSHOT_PATH = '/api/content/snapshot';

/**
 * Normalizes the content service address: an origin, an origin with a path prefix, or the snapshot
 * endpoint itself, without query or fragment.
 *
 * @param {string} value - Address given on the command line or in `CONTENT_API_URL`.
 * @returns {string} Base URL that `downloadContentSnapshots` appends `/api/content/snapshot` to.
 */
export function contentApiBase(value) {
  /** @type {URL} */
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid content API URL: ${value}`);
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.search || url.hash) {
    throw new Error(`The content API URL must be http(s) without query or fragment: ${value}`);
  }
  let path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith(SNAPSHOT_PATH)) path = path.slice(0, -SNAPSHOT_PATH.length);
  return `${url.origin}${path}`;
}

/**
 * Builds the tsconfig of the refresh build: the application's, with every workspace alias kept and
 * the snapshot alias pointed at the fetched pair. `paths` replaces the inherited map as a whole, so
 * every entry is copied, made absolute because the file lives in another folder.
 *
 * @param {{
 *   workspaceRoot: string,
 *   basePaths: Record<string, string[]>,
 *   appTsconfig: string,
 *   snapshotDirectory: string,
 * }} options - Workspace root, `tsconfig.base.json` paths, application tsconfig and snapshot folder.
 * @returns {{ extends: string, compilerOptions: { paths: Record<string, string[]> } }} tsconfig content.
 */
export function refreshTsconfig({ workspaceRoot, basePaths, appTsconfig, snapshotDirectory }) {
  const posix = (path) => path.replace(/\\/g, '/');
  /** @type {Record<string, string[]>} */
  const paths = {};
  for (const [alias, targets] of Object.entries(basePaths)) {
    paths[alias] = targets.map((target) => posix(resolve(workspaceRoot, target)));
  }
  if (!paths[SNAPSHOT_ALIAS])
    throw new Error(`${SNAPSHOT_ALIAS} is missing from tsconfig.base.json`);
  paths[SNAPSHOT_ALIAS] = [`${posix(resolve(snapshotDirectory))}/*`];
  return { extends: posix(resolve(appTsconfig)), compilerOptions: { paths } };
}

/**
 * Formats a duration for the progress lines.
 *
 * @param {number} ms - Elapsed milliseconds.
 * @returns {string} `12.3 s` under a minute, `2 min 05 s` above.
 */
export function formatDuration(ms) {
  const seconds = Math.max(0, ms) / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)} min ${String(whole % 60).padStart(2, '0')} s`;
}

/**
 * Runs a command with inherited output and resolves once it exits successfully.
 *
 * @param {string} command - Command line, run through the shell so `npx` resolves on Windows.
 * @param {string} cwd - Working directory.
 * @returns {Promise<void>} Completion; rejects with the exit code otherwise.
 */
function run(command, cwd) {
  return new Promise((done, fail) => {
    const child = spawn(command, { cwd, shell: true, stdio: 'inherit' });
    child.on('error', fail);
    child.on('exit', (code, signal) =>
      code === 0 ? done() : fail(new Error(`${command} → ${signal ?? `exit ${code}`}`)),
    );
  });
}

/**
 * Fetches the snapshot pair, builds the production site from it into dist/apps/web and writes the
 * sitemap and robots.txt, printing each step and its duration.
 *
 * @param {{ apiURL?: string, workspaceRoot?: string }} [options] - Content API address and workspace.
 * @returns {Promise<void>} Completion of the three steps.
 */
async function refresh({
  apiURL = process.argv[2] || process.env.CONTENT_API_URL || DEFAULT_LOCAL_API_URL,
  workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url)),
} = {}) {
  const started = Date.now();
  const base = contentApiBase(apiURL);
  const work = join(workspaceRoot, 'tmp', 'local-refresh');
  const snapshotDirectory = join(work, 'content-snapshot');
  const tsconfig = join(work, 'tsconfig.app.json');
  const step = async (label, action) => {
    const at = Date.now();
    console.log(`\n${label}`);
    try {
      await action();
    } catch (error) {
      // Keep the step number, so the command can tell a service problem from a build failure.
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${label.slice(0, 5)} ${reason}`, { cause: error });
    }
    console.log(`  done in ${formatDuration(Date.now() - at)}`);
  };

  console.log(`Local refresh from ${base}${SNAPSHOT_PATH}`);
  await step('[1/3] Fetching the published snapshot (committed files left untouched)', async () => {
    const summaries = await downloadContentSnapshots({
      apiURL: base,
      outputDirectory: snapshotDirectory,
    });
    for (const summary of summaries) {
      console.log(
        `  ${summary.locale}: revision ${summary.revision}, ${summary.projectCount} projects`,
      );
    }
    const { compilerOptions } = JSON.parse(
      await readFile(join(workspaceRoot, 'tsconfig.base.json'), 'utf8'),
    );
    const config = refreshTsconfig({
      workspaceRoot,
      basePaths: compilerOptions.paths,
      appTsconfig: join(workspaceRoot, 'apps/web/tsconfig.app.json'),
      snapshotDirectory,
    });
    await mkdir(work, { recursive: true });
    await writeFile(tsconfig, `${JSON.stringify(config, null, 2)}\n`);
  });
  await step('[2/3] Building the production site into dist/apps/web', () =>
    // The Nx cache hashes the committed snapshot, not this one: always rebuild.
    run(
      `npx nx run web:build:production --tsConfig=${relative(workspaceRoot, tsconfig).replace(/\\/g, '/')} --skip-nx-cache`,
      workspaceRoot,
    ),
  );
  await step('[3/3] Writing sitemap.xml and robots.txt', async () => {
    const { pages, urls } = await writeSeoFiles({ snapshotDirectory });
    console.log(`  sitemap.xml: ${urls} addresses for ${pages} pages; robots.txt written`);
  });
  console.log(
    `\nSite refreshed in ${formatDuration(Date.now() - started)}: Nginx serves dist/apps/web (http://localhost:8080), reload the page.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nLocal refresh failed: ${message}`);
    if (message.startsWith('[1/3]')) {
      console.error(
        'Is the content service up? Docker: docker compose -f docker/compose.dev.yml up -d --wait; without Docker pass http://localhost:3101.',
      );
    }
    process.exitCode = 1;
  }
}
