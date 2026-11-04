import type { WebShellOptions } from '@vfortin/web-shell';
import { loadCommittedContentSnapshot } from '@internal/web/environments/committed-content-snapshot';
import { liveContentSnapshot } from '@internal/web/environments/live-content-snapshot';
import proxy from '../../proxy.conf.json';

/**
 * Constant contentSnapshot
 *
 * @description
 * Development replacement of `content-snapshot.ts` (`fileReplacements` of the `development` build
 * configuration, Angular environments guide): `ng serve` renders the published content of the local
 * content service, the one the dev proxy forwards `/api/content` to, and falls back on the committed
 * snapshot when it is down. Never part of a production build (D7).
 *
 * @type {WebShellOptions['contentSnapshot']}
 */
export const contentSnapshot: WebShellOptions['contentSnapshot'] = liveContentSnapshot({
  serverOrigin: proxy['/api/content'].target,
  fallback: loadCommittedContentSnapshot,
});
