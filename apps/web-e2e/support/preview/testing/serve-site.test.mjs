import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createSiteServer } from '../serve-site.mjs';

describe('createSiteServer', () => {
  let fixture;
  let server;
  let baseUrl;

  before(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'portfolio-site-server-'));
    const root = join(fixture, 'site');
    const files = {
      'index.html': 'HOME',
      'en/index.html': 'EN-HOME',
      'index.csr.html': 'CSR-ADMIN',
      'error/404/index.html': 'FR-404',
      'en/error/404/index.html': 'EN-404',
      'projects/example/index.html': 'PROJECT',
      'main-ABCDEFGH.js': 'const hashed = true;',
      'theme.js': 'const theme = true;',
      '.hidden': 'HIDDEN',
    };
    for (const [name, body] of Object.entries(files)) {
      const full = join(root, name);
      await mkdir(resolve(full, '..'), { recursive: true });
      await writeFile(full, body);
    }
    const outside = join(fixture, 'site-neighbor');
    await mkdir(outside);
    await writeFile(join(outside, 'private.txt'), 'ADJACENT');
    await symlink(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    server = createSiteServer(root);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    }
    if (fixture) {
      const suffix = relative(resolve(tmpdir()), resolve(fixture));
      assert.ok(suffix.startsWith('portfolio-site-server-') && !suffix.includes(sep));
      await rm(fixture, { recursive: true, force: true });
    }
  });

  for (const path of ['/admin', '/en/admin', '/en/admin/', '/en/admin/projects/example']) {
    it(`redirects ${path} to the French administration`, async () => {
      const reply = await fetch(baseUrl + path, { redirect: 'manual' });
      assert.equal(reply.status, 301);
      assert.equal(reply.headers.get('location'), '/admin/');
    });
  }

  it('serves nested administration routes from the CSR shell without caching or indexing', async () => {
    const reply = await fetch(baseUrl + '/admin/projects/example?tab=article');
    assert.equal(reply.status, 200);
    assert.equal(await reply.text(), 'CSR-ADMIN');
    assert.equal(reply.headers.get('cache-control'), 'no-store');
    assert.equal(reply.headers.get('x-robots-tag'), 'noindex, nofollow');
  });

  it('serves prerendered pages with revalidation and supports HEAD', async () => {
    const reply = await fetch(baseUrl + '/projects/example');
    assert.equal(reply.status, 200);
    assert.equal(await reply.text(), 'PROJECT');
    assert.equal(reply.headers.get('cache-control'), 'no-cache');
    const head = await fetch(baseUrl + '/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  });

  it('uses the immutable policy only for hashed assets', async () => {
    const hashed = await fetch(baseUrl + '/main-ABCDEFGH.js');
    assert.equal(hashed.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const plain = await fetch(baseUrl + '/theme.js');
    assert.equal(plain.headers.get('cache-control'), 'public, max-age=3600');
  });

  it('returns real localized not-found statuses, including direct internal error URLs', async () => {
    for (const [path, body] of [
      ['/missing', 'FR-404'],
      ['/en/missing', 'EN-404'],
      ['/error/404', 'FR-404'],
    ]) {
      const reply = await fetch(baseUrl + path);
      assert.equal(reply.status, 404);
      assert.equal(await reply.text(), body);
      assert.equal(reply.headers.get('cache-control'), 'no-store');
    }
  });

  it('does not confuse admin-like public paths with the administration', async () => {
    const reply = await fetch(baseUrl + '/administrator');
    assert.equal(reply.status, 404);
    assert.equal(await reply.text(), 'FR-404');
  });

  it('keeps APIs unavailable in the standalone browser harness', async () => {
    const reply = await fetch(baseUrl + '/api/auth/login');
    assert.equal(reply.status, 404);
    assert.equal(reply.headers.get('content-type'), 'application/problem+json');
    assert.equal((await reply.json()).code, 'http.404');
  });

  it('rejects malformed encoding and hides dotfiles, traversal and symlink escapes', async () => {
    const malformed = await fetch(baseUrl + '/%');
    assert.equal(malformed.status, 400);
    for (const path of ['/.hidden', '/%2e%2e%2fsite-neighbor/private.txt', '/escape/private.txt']) {
      const reply = await fetch(baseUrl + path);
      assert.equal(reply.status, 404);
      assert.notEqual(await reply.text(), 'ADJACENT');
    }
  });
});
