import type { WebShellOptions } from '@vfortin/web-shell';

/**
 * Type SnapshotLoader
 *
 * @description
 * Locale snapshot loader expected by the web shell.
 */
type SnapshotLoader = WebShellOptions['contentSnapshot'];

/**
 * Interface LiveContentSnapshotOptions
 * @interface LiveContentSnapshotOptions
 *
 * @description
 * Endpoints and fallback of the development loader; tests pass their own process boundaries.
 */
export interface LiveContentSnapshotOptions {
  // #region Properties
  /** Content service origin used where relative URLs cannot resolve (server rendering in Node). */
  readonly serverOrigin: string;
  /** Committed snapshot loader used when the content service cannot answer. */
  readonly fallback: SnapshotLoader;
  /** HTTP client; the global `fetch` by default. */
  readonly fetcher?: typeof fetch;
  /** Whether the code runs without a document (server rendering); detected by default. */
  readonly onServer?: () => boolean;
  /** Request bound in milliseconds, response body included. */
  readonly timeoutMs?: number;
  // #endregion
}

/**
 * Function isLocaleSnapshot
 *
 * @description
 * Envelope check before the snapshot replaces the committed one; the full contract stays with the
 * server-side validator (D10).
 *
 * @param {unknown} value - Parsed response body.
 * @param {string} locale - Requested locale.
 *
 * @returns {boolean} Whether the body is a snapshot of that locale.
 */
function isLocaleSnapshot(value: unknown, locale: string): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'locale' in value &&
    value.locale === locale &&
    'projects' in value &&
    Array.isArray(value.projects)
  );
}

/**
 * Function liveContentSnapshot
 *
 * @description
 * Development loader reading the published snapshot from the content API, so that an admin change
 * shows on the dev server after a reload. The browser requests `/api/content/snapshot` through the
 * dev proxy (`apps/web/proxy.conf.json`); server rendering, which has no page URL to resolve against,
 * calls `serverOrigin` directly. The result goes through the same provider as the committed snapshot:
 * validated on the server, then handed to the browser by `TransferState`, so hydration and
 * `@defer (hydrate on viewport)` blocks read the server's copy without a second request (D16, D22).
 * Any failure (service down, HTTP error, timeout, unexpected body) warns once per load and falls back
 * on the committed snapshot.
 *
 * @param {LiveContentSnapshotOptions} options - Endpoints, fallback and process boundaries.
 *
 * @returns {SnapshotLoader} Loader for the web shell.
 */
export function liveContentSnapshot({
  serverOrigin,
  fallback,
  fetcher = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => fetch(input, init),
  onServer = (): boolean => typeof document === 'undefined',
  timeoutMs = 5_000,
}: LiveContentSnapshotOptions): SnapshotLoader {
  return async (locale: Parameters<SnapshotLoader>[0]): Promise<unknown> => {
    const origin: string = onServer() ? serverOrigin.replace(/\/+$/, '') : '';
    const url: string = `${origin}/api/content/snapshot?locale=${locale}`;
    try {
      const response: Response = await fetcher(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (!isLocaleSnapshot(body, locale)) throw new Error(`not a ${locale} snapshot`);
      return body;
    } catch (error: unknown) {
      const reason: string = error instanceof Error ? error.message : String(error);
      console.warn(
        `Live content snapshot unavailable (${url}: ${reason}); using the committed ${locale} snapshot.`,
      );
      return fallback(locale);
    }
  };
}
