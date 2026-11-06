import type { LookupAddress, LookupAllOptions } from 'node:dns';
import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
  request as httpRequest,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  type HttpsFetchedBody,
  HttpsFetcher,
} from '@internal/backend-http/lib/https-fetcher/https-fetcher';

/**
 * Function resolveTo
 *
 * @description
 * DNS lookup double that answers every host with the given addresses.
 */
function resolveTo(
  addresses: LookupAddress[],
): (
  hostname: string,
  options: LookupAllOptions,
  callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
) => void {
  return (_hostname, _options, callback): void => callback(null, addresses);
}

describe('HttpsFetcher', (): void => {
  let server: Server;
  let port: number;
  let fetcher: HttpsFetcher;
  const url: (path: string) => string = (path: string): string =>
    `https://images.test:${port}${path}`;

  beforeAll(async (): Promise<void> => {
    server = createServer((request: IncomingMessage, response: ServerResponse): void => {
      const path: string = request.url ?? '';
      if (path === '/image') return void response.writeHead(200).end('bytes');
      if (path === '/one') return void response.writeHead(302, { location: '/image' }).end();
      if (path === '/two') return void response.writeHead(301, { location: url('/one') }).end();
      if (path === '/plain')
        return void response.writeHead(302, { location: 'http://images.test/image' }).end();
      if (path === '/big') return void response.writeHead(200).end('x'.repeat(64));
      if (path === '/declared-big')
        return void response.writeHead(200, { 'content-length': '64' }).end('x'.repeat(64));
      if (path === '/no-location') return void response.writeHead(302).end();
      // Never answers: the deadline must end the request.
      if (path === '/slow') return;
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve: () => void): void => {
      server.listen(0, '127.0.0.1', resolve);
    });
    port = (server.address() as AddressInfo).port;
    // Plain HTTP on loopback: the test swaps the transport and the policy; URL checks, redirects,
    // caps and the deadline stay those of production.
    fetcher = new HttpsFetcher({
      request: httpRequest,
      lookup: resolveTo([{ address: '127.0.0.1', family: 4 }]),
      isAllowedAddress: (): boolean => true,
      ports: [port],
      timeoutMs: 300,
      userAgent: 'test',
    });
  });

  afterAll(async (): Promise<void> => {
    server.closeAllConnections();
    await new Promise<void>(
      (resolve: () => void): void => void server.close((): void => resolve()),
    );
  });

  it('follows redirects within the budget and reports the final URL', async (): Promise<void> => {
    const fetched: HttpsFetchedBody = await fetcher.fetch(url('/two'), {
      maxBytes: 32,
      accept: '*/*',
      redirects: 2,
    });
    expect(fetched.body.toString()).toBe('bytes');
    expect(fetched.url).toBe(url('/image'));
  });

  it('refuses a redirect beyond the budget, or by default', async (): Promise<void> => {
    await expect(
      fetcher.fetch(url('/two'), { maxBytes: 32, accept: '*/*', redirects: 1 }),
    ).rejects.toThrow('Refused response (302).');
    await expect(fetcher.fetch(url('/one'), { maxBytes: 32, accept: '*/*' })).rejects.toThrow(
      'Refused response (302).',
    );
  });

  it('checks every redirect target like the first URL', async (): Promise<void> => {
    await expect(
      fetcher.fetch(url('/plain'), { maxBytes: 32, accept: '*/*', redirects: 3 }),
    ).rejects.toThrow('Refused outbound URL.');
  });

  it('refuses a body over the limit and a missing page', async (): Promise<void> => {
    await expect(fetcher.fetch(url('/big'), { maxBytes: 32, accept: '*/*' })).rejects.toThrow(
      'Response too large.',
    );
    await expect(fetcher.fetch(url('/missing'), { maxBytes: 32, accept: '*/*' })).rejects.toThrow(
      'Refused response (404).',
    );
  });

  it('refuses a body declared over the limit, a redirect without target and a slow server', async (): Promise<void> => {
    await expect(
      fetcher.fetch(url('/declared-big'), { maxBytes: 32, accept: '*/*' }),
    ).rejects.toThrow('Response too large.');
    await expect(
      fetcher.fetch(url('/no-location'), { maxBytes: 32, accept: '*/*', redirects: 3 }),
    ).rejects.toThrow('Refused response (302).');
    await expect(fetcher.fetch(url('/slow'), { maxBytes: 32, accept: '*/*' })).rejects.toThrow(
      'Outbound fetch timed out.',
    );
  });

  it('refuses private addresses, failed lookups and URLs outside https on 443', async (): Promise<void> => {
    const guarded: HttpsFetcher = new HttpsFetcher({ timeoutMs: 300, userAgent: 'test' });
    for (const target of [
      'http://images.test/x.png',
      'https://images.test:8443/x.png',
      'https://user:secret@images.test/x.png',
      'https://10.0.0.1/x.png',
      'https://[::1]/x.png',
    ]) {
      await expect(guarded.fetch(target, { maxBytes: 32, accept: '*/*' })).rejects.toThrow(
        'Refused outbound URL.',
      );
    }
    const privateHost: HttpsFetcher = new HttpsFetcher({
      request: httpRequest,
      lookup: resolveTo([
        { address: '127.0.0.1', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ]),
      isAllowedAddress: (address: string): boolean => address === '127.0.0.1',
      ports: [port],
      timeoutMs: 300,
      userAgent: 'test',
    });
    await expect(privateHost.fetch(url('/image'), { maxBytes: 32, accept: '*/*' })).rejects.toThrow(
      'Refused address.',
    );
    const unresolved: HttpsFetcher = new HttpsFetcher({
      request: httpRequest,
      lookup: (_hostname, _options, callback): void =>
        callback(
          Object.assign(new Error('getaddrinfo ENOTFOUND images.test'), { code: 'ENOTFOUND' }),
          [],
        ),
      ports: [port],
      timeoutMs: 300,
      userAgent: 'test',
    });
    await expect(unresolved.fetch(url('/image'), { maxBytes: 32, accept: '*/*' })).rejects.toThrow(
      'ENOTFOUND',
    );
  });
});
