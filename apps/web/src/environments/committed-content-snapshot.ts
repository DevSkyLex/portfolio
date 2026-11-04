import type { WebShellOptions } from '@vfortin/web-shell';

/**
 * Function loadCommittedContentSnapshot
 *
 * @description
 * Loads the committed locale snapshot (`apps/web/content-snapshot/{fr,en}.json`, D7) as a separate
 * build chunk, so each locale build ships only its own content.
 *
 * @param {Parameters<WebShellOptions['contentSnapshot']>[0]} locale - Locale of the build.
 *
 * @returns {Promise<unknown>} Raw snapshot, validated at prerender time (D10).
 */
export function loadCommittedContentSnapshot(
  locale: Parameters<WebShellOptions['contentSnapshot']>[0],
): Promise<unknown> {
  return locale === 'en'
    ? import('@internal/web-snapshot/en.json').then((m): unknown => m.default)
    : import('@internal/web-snapshot/fr.json').then((m): unknown => m.default);
}
