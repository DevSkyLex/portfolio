import { contentSnapshot } from '@internal/web/environments/content-snapshot';

describe('contentSnapshot', (): void => {
  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('loads the requested locale through the same-origin public API', async (): Promise<void> => {
    const fetcher: ReturnType<typeof vi.fn<typeof fetch>> = vi.fn<typeof fetch>(
      async (): Promise<Response> => Response.json({ locale: 'en' }),
    );
    vi.stubGlobal('fetch', fetcher);
    await expect(contentSnapshot('en')).resolves.toEqual({ locale: 'en' });
    expect(fetcher).toHaveBeenCalledWith('/api/content/snapshot?locale=en', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    });
  });

  it('propagates failures without falling back to a build-time snapshot', async (): Promise<void> => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (): Promise<Response> => new Response('', { status: 503 })),
    );
    await expect(contentSnapshot('fr')).rejects.toThrow('503');
  });
});
