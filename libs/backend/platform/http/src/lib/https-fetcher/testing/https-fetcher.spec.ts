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
});
