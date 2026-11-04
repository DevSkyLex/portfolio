import { loadCommittedContentSnapshot } from '@internal/web/environments/committed-content-snapshot';
import {
  type LiveContentSnapshotOptions,
  liveContentSnapshot,
} from '@internal/web/environments/live-content-snapshot';

/**
 * Function setup
 *
 * @description
 * Builds a loader whose requests, platform and fallback are recorded.
 *
 * @param {(url: string) => Promise<Response>} answer - Response of the content service double.
 * @param {boolean} [server] - Whether the loader runs as server rendering.
 *
 * @returns {{ load: ReturnType<typeof liveContentSnapshot>, urls: string[], signals: (AbortSignal | null | undefined)[], fallbacks: string[] }} Loader and records.
 */
function setup(
  answer: (url: string) => Promise<Response>,
  server: boolean = false,
): {
  load: ReturnType<typeof liveContentSnapshot>;
  urls: string[];
  signals: (AbortSignal | null | undefined)[];
  fallbacks: string[];
} {
  const urls: string[] = [];
  const signals: (AbortSignal | null | undefined)[] = [];
  const fallbacks: string[] = [];
  const options: LiveContentSnapshotOptions = {
    serverOrigin: 'http://content.test/',
    fallback: (locale: string): Promise<unknown> => {
      fallbacks.push(locale);
      return Promise.resolve({ locale, committed: true });
    },
    fetcher: (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      urls.push(String(input));
      signals.push(init?.signal);
      return answer(String(input));
    },
    onServer: (): boolean => server,
  };
  return { load: liveContentSnapshot(options), urls, signals, fallbacks };
}

describe('liveContentSnapshot', (): void => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach((): void => {
    warn = vi.spyOn(console, 'warn').mockImplementation((): void => undefined);
  });

  afterEach((): void => warn.mockRestore());

  it('reads the published snapshot through the dev proxy in the browser', async (): Promise<void> => {
    const { load, urls, signals, fallbacks } = setup((): Promise<Response> =>
      Promise.resolve(Response.json({ locale: 'en', projects: [] })),
    );
    await expect(load('en')).resolves.toEqual({ locale: 'en', projects: [] });
    expect(urls).toEqual(['/api/content/snapshot?locale=en']);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(fallbacks).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('calls the content service directly during server rendering', async (): Promise<void> => {
    const { load, urls } = setup(
      (): Promise<Response> => Promise.resolve(Response.json({ locale: 'fr', projects: [] })),
      true,
    );
    await expect(load('fr')).resolves.toEqual({ locale: 'fr', projects: [] });
    expect(urls).toEqual(['http://content.test/api/content/snapshot?locale=fr']);
  });

  it('falls back on the committed snapshot with a warning when the service is down', async (): Promise<void> => {
    const { load, fallbacks } = setup((): Promise<Response> =>
      Promise.reject(new TypeError('fetch failed')),
    );
    await expect(load('fr')).resolves.toEqual({ locale: 'fr', committed: true });
    expect(fallbacks).toEqual(['fr']);
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Live content snapshot unavailable (/api/content/snapshot?locale=fr: fetch failed); using the committed fr snapshot.',
    );
  });

  it('falls back on an HTTP error, a non-error rejection or another locale', async (): Promise<void> => {
    const answers: (() => Promise<Response>)[] = [
      (): Promise<Response> => Promise.resolve(new Response('', { status: 502 })),
      (): Promise<Response> => Promise.reject('offline'),
      (): Promise<Response> => Promise.resolve(Response.json({ locale: 'fr', projects: [] })),
      (): Promise<Response> => Promise.resolve(Response.json({ locale: 'en' })),
    ];
    const { load, fallbacks } = setup((): Promise<Response> => {
      const next: (() => Promise<Response>) | undefined = answers.shift();
      return next ? next() : Promise.reject(new Error('unexpected request'));
    });
    for (let i: number = 0; i < 4; i++) await load('en');
    expect(fallbacks).toEqual(['en', 'en', 'en', 'en']);
    expect(warn.mock.calls.map((call: unknown[]): unknown => call[0])).toEqual([
      'Live content snapshot unavailable (/api/content/snapshot?locale=en: HTTP 502); using the committed en snapshot.',
      'Live content snapshot unavailable (/api/content/snapshot?locale=en: offline); using the committed en snapshot.',
      'Live content snapshot unavailable (/api/content/snapshot?locale=en: not a en snapshot); using the committed en snapshot.',
      'Live content snapshot unavailable (/api/content/snapshot?locale=en: not a en snapshot); using the committed en snapshot.',
    ]);
  });

  it('detects server rendering and uses the global fetch by default', async (): Promise<void> => {
    const fetcher: ReturnType<typeof vi.fn> = vi.fn((): Promise<Response> =>
      Promise.resolve(Response.json({ locale: 'fr', projects: [] })),
    );
    vi.stubGlobal('fetch', fetcher);
    try {
      const load: ReturnType<typeof liveContentSnapshot> = liveContentSnapshot({
        serverOrigin: 'http://content.test',
        fallback: loadCommittedContentSnapshot,
      });
      await expect(load('fr')).resolves.toEqual({ locale: 'fr', projects: [] });
      // The test environment has a document: the browser path, through the dev proxy.
      expect(fetcher.mock.calls[0]?.[0]).toBe('/api/content/snapshot?locale=fr');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('loadCommittedContentSnapshot', (): void => {
  it('loads the committed snapshot of each locale', async (): Promise<void> => {
    await expect(loadCommittedContentSnapshot('fr')).resolves.toMatchObject({ locale: 'fr' });
    await expect(loadCommittedContentSnapshot('en')).resolves.toMatchObject({ locale: 'en' });
  });
});
