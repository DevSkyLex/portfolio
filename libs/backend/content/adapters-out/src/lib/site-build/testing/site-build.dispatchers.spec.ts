import type { Mock } from 'vitest';
import {
  GithubSiteBuildDispatcher,
  LogSiteBuildDispatcher,
} from '@internal/content-adapters-out/lib/site-build/site-build.dispatchers';

describe('GithubSiteBuildDispatcher', (): void => {
  it('triggers the workflow with the revision', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    await new GithubSiteBuildDispatcher(
      { repository: 'moi/portfolio', workflow: 'site-build.yml', ref: 'main', token: 't' },
      fetcher,
    ).dispatch(7);
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.github.com/repos/moi/portfolio/actions/workflows/site-build.yml/dispatches',
    );
    expect(JSON.parse(String(init.body))).toEqual({ ref: 'main', inputs: { revision: '7' } });
  });

  it('fails if GitHub refuses', async (): Promise<void> => {
    const fetcher: Mock<typeof fetch> = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 403 }));
    await expect(
      new GithubSiteBuildDispatcher(
        { repository: 'moi/portfolio', workflow: 'site-build.yml', ref: 'main', token: 't' },
        fetcher,
      ).dispatch(7),
    ).rejects.toThrow('HTTP 403');
  });
});

describe('LogSiteBuildDispatcher', (): void => {
  it('logs the requested revision without triggering anything', async (): Promise<void> => {
    const log: Mock<(line: string) => void> = vi.fn<(line: string) => void>();
    await new LogSiteBuildDispatcher(log).dispatch(7);
    expect(log).toHaveBeenCalledWith(
      'Site rebuild requested (revision 7) — not triggered in development.',
    );
  });
});
