import type { ContentSnapshot } from '@vfortin/content-contracts';
import {
  fetchPublicContentSnapshot,
  runtimeSitemap,
  provideRuntimeContentSnapshot,
} from '@internal/content-web-data-access/lib/server/public-content/public-content';
import { REQUEST_CONTEXT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CONTENT_SNAPSHOT_LOADER } from '@internal/content-web-data-access/lib/tokens/content-snapshot/content-snapshot-loader.token';
import { SITE_ORIGIN } from '@internal/content-web-data-access/lib/tokens/site-origin/site-origin.token';
import type { ContentSnapshotLoader } from '@internal/content-web-data-access/lib/models/content-snapshot-loader/content-snapshot-loader.type';

const snapshot: ContentSnapshot = {
  locale: 'fr',
  revision: 1,
  profile: { heroIntro: 'Intro', aboutStatement: 'About', aboutLead: 'Lead', facts: [], links: [] },
  projects: [],
  timeline: [],
  skills: [],
  legal: {
    notice: {
      updatedOn: '2026-11-05',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    privacy: {
      updatedOn: '2026-11-05',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  },
};

describe('fetchPublicContentSnapshot', (): void => {
  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('uses the fixed public upstream without credentials or redirects and reads each revision afresh', async (): Promise<void> => {
    let revision: number = 1;
    const fetcher: ReturnType<typeof vi.fn<typeof fetch>> = vi.fn<typeof fetch>(
      async (): Promise<Response> => Response.json({ ...snapshot, revision: revision++ }),
    );
    await expect(
      fetchPublicContentSnapshot('fr', 'http://content:3101', fetcher),
    ).resolves.toMatchObject({ revision: 1 });
    await expect(
      fetchPublicContentSnapshot('fr', 'http://content:3101', fetcher),
    ).resolves.toMatchObject({ revision: 2 });
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'http://content:3101/api/content/snapshot?locale=fr',
    );
    expect(fetcher.mock.calls[0]?.[1]).toEqual({
      headers: { accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });

  it('rejects upstream errors, malformed content and another locale rather than using an old snapshot', async (): Promise<void> => {
    await expect(
      fetchPublicContentSnapshot(
        'fr',
        'http://content',
        async (): Promise<Response> => new Response('', { status: 503 }),
      ),
    ).rejects.toThrow('503');
    await expect(
      fetchPublicContentSnapshot('fr', 'http://content', async (): Promise<Response> =>
        Response.json({}),
      ),
    ).rejects.toThrow();
    await expect(
      fetchPublicContentSnapshot('en', 'http://content', async (): Promise<Response> =>
        Response.json(snapshot),
      ),
    ).rejects.toThrow('locale');
    await expect(fetchPublicContentSnapshot('fr', 'http://user:password@content')).rejects.toThrow(
      'origin',
    );
  });
});

describe('provideRuntimeContentSnapshot', (): void => {
  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('reads runtime origins from the current Angular request context', async (): Promise<void> => {
    const fetcher: ReturnType<typeof vi.fn<typeof fetch>> = vi.fn<typeof fetch>(
      async (): Promise<Response> => Response.json(snapshot),
    );
    vi.stubGlobal('fetch', fetcher);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: REQUEST_CONTEXT,
          useValue: { contentApiUrl: 'http://content:3101', siteOrigin: 'https://portfolio.test/' },
        },
        provideRuntimeContentSnapshot(),
      ],
    });
    await TestBed.inject<ContentSnapshotLoader>(CONTENT_SNAPSHOT_LOADER)('fr');
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'http://content:3101/api/content/snapshot?locale=fr',
    );
    expect(TestBed.inject<string>(SITE_ORIGIN)).toBe('https://portfolio.test');
  });

  it('has fixed development defaults when the CLI supplies no request context', async (): Promise<void> => {
    const fetcher: ReturnType<typeof vi.fn<typeof fetch>> = vi.fn<typeof fetch>(
      async (): Promise<Response> => Response.json(snapshot),
    );
    vi.stubGlobal('fetch', fetcher);
    TestBed.configureTestingModule({
      providers: [{ provide: REQUEST_CONTEXT, useValue: null }, provideRuntimeContentSnapshot()],
    });
    await TestBed.inject<ContentSnapshotLoader>(CONTENT_SNAPSHOT_LOADER)('fr');
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'http://localhost:3101/api/content/snapshot?locale=fr',
    );
  });
});

describe('runtimeSitemap', (): void => {
  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('retries mixed revisions and includes only coherent language alternatives', async (): Promise<void> => {
    let call: number = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input): Promise<Response> => {
        const locale: 'fr' | 'en' = String(input).endsWith('locale=en') ? 'en' : 'fr';
        const revision: number = call++ === 0 ? 1 : 2;
        return Response.json({ ...snapshot, locale, revision });
      }),
    );
    const xml: string = await runtimeSitemap('https://portfolio.test', 'http://content');
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(xml).toContain('<loc>https://portfolio.test/fr/</loc>');
    expect(xml).toContain('hreflang="en"');
    expect(xml).toContain('hreflang="x-default"');
  });

  it('refuses permanently mixed revisions', async (): Promise<void> => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input): Promise<Response> =>
        Response.json({
          ...snapshot,
          locale: String(input).endsWith('locale=en') ? 'en' : 'fr',
          revision: String(input).endsWith('locale=en') ? 2 : 1,
        }),
      ),
    );
    await expect(runtimeSitemap('https://portfolio.test', 'http://content')).rejects.toThrow(
      'converge',
    );
  });
});
