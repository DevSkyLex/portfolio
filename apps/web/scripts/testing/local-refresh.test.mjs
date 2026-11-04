import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_LOCAL_API_URL,
  contentApiBase,
  formatDuration,
  refreshTsconfig,
} from '../local-refresh.mjs';

describe('contentApiBase', () => {
  it('accepts the snapshot endpoint, an origin or a path prefix', () => {
    assert.equal(contentApiBase(DEFAULT_LOCAL_API_URL), 'http://localhost:8080');
    assert.equal(contentApiBase('http://localhost:3101'), 'http://localhost:3101');
    assert.equal(contentApiBase('http://localhost:3101/'), 'http://localhost:3101');
    assert.equal(
      contentApiBase('https://example.test/stage/api/content/snapshot/'),
      'https://example.test/stage',
    );
  });

  it('refuses another scheme, a query, a fragment or no URL at all', () => {
    for (const value of [
      'ftp://localhost:8080',
      'http://localhost:8080/api/content/snapshot?locale=fr',
      'http://localhost:8080#top',
      'localhost:8080',
    ]) {
      assert.throws(() => contentApiBase(value), /content API URL/, value);
    }
  });
});

describe('refreshTsconfig', () => {
  it('keeps every alias absolute and points only the snapshot alias at the fetched pair', () => {
    const config = refreshTsconfig({
      workspaceRoot: '/repo',
      basePaths: {
        '@vfortin/ui': ['./libs/frontend/ui/src/index.ts'],
        '@internal/web-snapshot/*': ['./apps/web/content-snapshot/*'],
      },
      appTsconfig: '/repo/apps/web/tsconfig.app.json',
      snapshotDirectory: '/repo/tmp/local-refresh/content-snapshot',
    });
    const root = process.platform === 'win32' ? `${process.cwd().slice(0, 2)}/repo` : '/repo';
    assert.deepEqual(config, {
      extends: `${root}/apps/web/tsconfig.app.json`,
      compilerOptions: {
        paths: {
          '@vfortin/ui': [`${root}/libs/frontend/ui/src/index.ts`],
          '@internal/web-snapshot/*': [`${root}/tmp/local-refresh/content-snapshot/*`],
        },
      },
    });
  });

  it('refuses a workspace without the snapshot alias', () => {
    assert.throws(
      () =>
        refreshTsconfig({
          workspaceRoot: '/repo',
          basePaths: {},
          appTsconfig: '/repo/apps/web/tsconfig.app.json',
          snapshotDirectory: '/repo/tmp',
        }),
      /@internal\/web-snapshot/,
    );
  });
});

describe('formatDuration', () => {
  it('prints seconds under a minute, minutes and padded seconds above', () => {
    assert.equal(formatDuration(-5), '0.0 s');
    assert.equal(formatDuration(12_345), '12.3 s');
    assert.equal(formatDuration(125_000), '2 min 05 s');
  });
});
