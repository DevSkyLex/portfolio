// Downloads matching published locale snapshots before the site build.
// Usage: CONTENT_API_URL=https://… node apps/web/scripts/fetch-content-snapshot.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {'fr' | 'en'} SnapshotLocale
 * @typedef {{ locale: SnapshotLocale, revision: number, projects: unknown[], [key: string]: unknown }} SnapshotEnvelope
 * @typedef {{ locale: SnapshotLocale, revision: number, projectCount: number }} SnapshotSummary
 */

/** @type {readonly SnapshotLocale[]} Locale pair consumed by the public build. */
const LOCALES = ['fr', 'en'];

/** Maximum collections when publication changes between the two requests. */
const ATTEMPTS = 3;

/**
 * Checks only the fields needed to collect and write a coherent locale pair. The complete content
 * contract is validated separately by the public prerender provider (D10).
 *
 * @param {unknown} value - Untrusted JSON response.
 * @param {SnapshotLocale} locale - Locale requested from the content service.
 * @returns {SnapshotEnvelope} Envelope whose revision, locale and project count are usable.
 */
function snapshotEnvelope(value, locale) {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('revision' in value) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !('locale' in value) ||
    value.locale !== locale ||
    !('projects' in value) ||
    !Array.isArray(value.projects)
  ) {
    throw new Error(`Invalid ${locale} snapshot envelope.`);
  }
  return /** @type {SnapshotEnvelope} */ (value);
}

/**
 * Collects and validates both locale envelopes before creating or writing the output directory.
 * Requests, including response-body reads, are bounded by their abort signal. A revision mismatch
 * retries the whole pair; a failed request or malformed payload leaves existing snapshots alone.
 *
 * @param {{
 *   apiURL?: string,
 *   outputDirectory?: string,
 *   fetcher?: typeof fetch,
 *   wait?: (delay: number) => Promise<void>,
 *   timeoutMs?: number,
 * }} [options] - Public endpoint, output location and process boundaries used by isolated tests.
 * @returns {Promise<SnapshotSummary[]>} Summaries printed by the command after successful writes.
 */
export async function downloadContentSnapshots({
  apiURL = process.env.CONTENT_API_URL ?? 'http://localhost:3101',
  outputDirectory = fileURLToPath(new URL('../content-snapshot/', import.meta.url)),
  fetcher = fetch,
  wait = sleep,
  timeoutMs = 10_000,
} = {}) {
  /** @type {SnapshotEnvelope[]} */
  let snapshots = [];
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    snapshots = await Promise.all(
      LOCALES.map(async (locale) => {
        const url = `${apiURL.replace(/\/$/, '')}/api/content/snapshot?locale=${locale}`;
        const response = await fetcher(url, {
          headers: { 'x-request-id': `site-build-${locale}-${Date.now()}` },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          throw new Error(`${url} → ${response.status} ${await response.text()}`);
        }
        return snapshotEnvelope(await response.json(), locale);
      }),
    );
    const revisions = new Set(snapshots.map((snapshot) => snapshot.revision));
    if (revisions.size === 1) break;
    if (attempt === ATTEMPTS) {
      throw new Error(`Mixed revisions after ${ATTEMPTS} attempts: ${[...revisions].join(', ')}`);
    }
    console.warn(
      `Revisions differ (${[...revisions].join(', ')}), publication in progress: retrying`,
    );
    await wait(2_000 * attempt);
  }

  // Serialize the complete validated pair before the first filesystem mutation.
  const outputs = snapshots.map((snapshot) => ({
    file: join(outputDirectory, `${snapshot.locale}.json`),
    content: `${JSON.stringify(snapshot, null, 2)}\n`,
  }));
  await mkdir(outputDirectory, { recursive: true });
  for (const output of outputs) await writeFile(output.file, output.content);
  return snapshots.map((snapshot) => ({
    locale: snapshot.locale,
    revision: snapshot.revision,
    projectCount: snapshot.projects.length,
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summaries = await downloadContentSnapshots();
  for (const summary of summaries) {
    console.log(
      `${summary.locale}: revision ${summary.revision}, ${summary.projectCount} projects`,
    );
  }
}
