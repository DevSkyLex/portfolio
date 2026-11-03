import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { downloadContentSnapshots } from '../fetch-content-snapshot.mjs';

/**
 * @param {'fr' | 'en'} locale - Requested snapshot locale.
 * @param {number} revision - Published revision for the response.
 * @returns {Response} Minimal envelope; full content validation belongs to the prerender provider.
 */
function response(locale, revision) {
  return Response.json({ locale, revision, projects: [{ slug: 'example' }] });
}

describe('downloadContentSnapshots', () => {
  /** @type {string} */
  let fixture;
  /** @type {string} */
  let outputDirectory;

  beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'portfolio-snapshot-'));
    outputDirectory = join(fixture, 'snapshots');
  });

  afterEach(async () => {
    assert.equal(dirname(resolve(fixture)), resolve(tmpdir()));
    assert.ok(fixture.startsWith(join(tmpdir(), 'portfolio-snapshot-')));
    await rm(fixture, { recursive: true, force: true });
  });

  it('writes both validated locales and reports their revision and project counts', async () => {
    /** @type {string[]} */
    const urls = [];
    const summaries = await downloadContentSnapshots({
      apiURL: 'http://content.test/',
      outputDirectory,
      fetcher: async (url, options) => {
        urls.push(String(url));
        const signal = options?.signal;
        assert.ok(signal instanceof AbortSignal);
        assert.equal(signal.aborted, false);
        assert.match(
          new Headers(options?.headers).get('x-request-id') ?? '',
          /^site-build-(?:fr|en)-\d+$/,
        );
        return response(urls.length === 1 ? 'fr' : 'en', 8);
      },
    });
    assert.deepEqual(urls, [
      'http://content.test/api/content/snapshot?locale=fr',
      'http://content.test/api/content/snapshot?locale=en',
    ]);
    assert.deepEqual(summaries, [
      { locale: 'fr', revision: 8, projectCount: 1 },
      { locale: 'en', revision: 8, projectCount: 1 },
    ]);
    assert.deepEqual((await readdir(outputDirectory)).sort(), ['en.json', 'fr.json']);
    for (const locale of ['fr', 'en']) {
      assert.deepEqual(
        JSON.parse(await readFile(join(outputDirectory, `${locale}.json`), 'utf8')),
        {
          locale,
          revision: 8,
          projects: [{ slug: 'example' }],
        },
      );
    }
  });

  it('retries the entire pair when a publication changes the revision between locales', async () => {
    const replies = [response('fr', 1), response('en', 2), response('fr', 3), response('en', 3)];
    /** @type {number[]} */
    const waits = [];
    const summaries = await downloadContentSnapshots({
      outputDirectory,
      fetcher: async () => {
        assert.deepEqual(await readdir(fixture), []);
        const reply = replies.shift();
        assert.ok(reply instanceof Response);
        return reply;
      },
      wait: async (delay) => {
        waits.push(delay);
      },
    });
    assert.equal(replies.length, 0);
    assert.deepEqual(waits, [2_000]);
    assert.deepEqual(
      summaries.map((summary) => summary.revision),
      [3, 3],
    );
  });

  it('does not create output after three incoherent locale pairs', async () => {
    let requests = 0;
    /** @type {number[]} */
    const waits = [];
    await assert.rejects(
      downloadContentSnapshots({
        outputDirectory,
        fetcher: async () => response(++requests % 2 === 1 ? 'fr' : 'en', requests),
        wait: async (delay) => {
          waits.push(delay);
        },
      }),
      /Mixed revisions after 3 attempts: 5, 6/,
    );
    assert.equal(requests, 6);
    assert.deepEqual(waits, [2_000, 4_000]);
    assert.deepEqual(await readdir(fixture), []);
  });

  for (const invalid of [
    null,
    [],
    {},
    { locale: 'en', projects: [] },
    { locale: 'en', revision: -1, projects: [] },
    { locale: 'en', revision: 1.5, projects: [] },
    { locale: 'en', revision: Number.MAX_SAFE_INTEGER + 1, projects: [] },
    { locale: 'en', revision: '4', projects: [] },
    { locale: 'fr', revision: 4, projects: [] },
    { locale: 'en', revision: 4, projects: null },
    { locale: 'en', revision: 4, projects: {} },
  ]) {
    it(`preserves both existing snapshots when the second envelope is malformed: ${JSON.stringify(invalid)}`, async () => {
      await mkdir(outputDirectory);
      await writeFile(join(outputDirectory, 'fr.json'), 'previous-fr');
      await writeFile(join(outputDirectory, 'en.json'), 'previous-en');
      let requests = 0;
      await assert.rejects(
        downloadContentSnapshots({
          outputDirectory,
          fetcher: async () => (++requests === 1 ? response('fr', 4) : Response.json(invalid)),
        }),
        /Invalid en snapshot envelope/,
      );
      assert.equal(await readFile(join(outputDirectory, 'fr.json'), 'utf8'), 'previous-fr');
      assert.equal(await readFile(join(outputDirectory, 'en.json'), 'utf8'), 'previous-en');
    });
  }

  it('does not write after a non-success HTTP response', async () => {
    let requests = 0;
    await assert.rejects(
      downloadContentSnapshots({
        outputDirectory,
        fetcher: async () =>
          ++requests === 1 ? response('fr', 4) : new Response('unavailable', { status: 503 }),
      }),
      /503 unavailable/,
    );
    assert.deepEqual(await readdir(fixture), []);
  });

  it('does not write when a response body is invalid JSON', async () => {
    await assert.rejects(
      downloadContentSnapshots({ outputDirectory, fetcher: async () => new Response('invalid') }),
      SyntaxError,
    );
    assert.deepEqual(await readdir(fixture), []);
  });

  it('aborts a pending request at its deadline without creating output', async () => {
    // AbortSignal.timeout uses an unreferenced timer; this test owns a bounded keep-alive handle.
    const keepAlive = setTimeout(() => undefined, 1_000);
    try {
      await assert.rejects(
        downloadContentSnapshots({
          outputDirectory,
          timeoutMs: 5,
          fetcher: async (_url, options) => {
            const signal = options?.signal;
            assert.ok(signal instanceof AbortSignal);
            return new Promise((_resolve, reject) => {
              signal.addEventListener('abort', () => reject(signal.reason), {
                once: true,
              });
            });
          },
        }),
        { name: 'TimeoutError' },
      );
      assert.deepEqual(await readdir(fixture), []);
    } finally {
      clearTimeout(keepAlive);
    }
  });
});
