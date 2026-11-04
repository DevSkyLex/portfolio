import type { FetchedClientMetadata } from '@vfortin/identity-application';
import type { LookupAddress, LookupAllOptions, LookupOptions } from 'node:dns';
import {
  type ClientRequest,
  type IncomingMessage,
  type RequestOptions,
  type Server,
  type ServerResponse,
  createServer,
  request as httpRequest,
} from 'node:http';
import type { AddressInfo, LookupFunction } from 'node:net';
import type { Mock } from 'vitest';
import {
  HttpsClientMetadataFetcher,
  maxAgeOf,
} from '@internal/identity-adapters-out/lib/oauth/client-metadata-fetcher/client-metadata-fetcher';

const PNG: Buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const DOCUMENT: Record<string, unknown> = {
  client_id: 'https://meta.test/client.json',
  client_name: 'Client',
  redirect_uris: ['https://meta.test/cb'],
};

/**
 * Constant ROUTES
 *
 * @description
 * Answers of the local test server, by path.
 *
 * @type {Record<string, (response: ServerResponse) => void>}
 */
const ROUTES: Record<string, (response: ServerResponse) => void> = {
  '/client.json': (response: ServerResponse): void => {
    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=120',
    });
    response.end(JSON.stringify(DOCUMENT));
  },
  '/no-store.json': (response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end('{}');
  },
  '/vendor.json': (response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'application/oauth-client+json' });
    response.end('{"a":1}');
  },
  '/page.html': (response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('{}');
  },
  '/broken.json': (response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{');
  },
  '/redirect.json': (response: ServerResponse): void => {
    response.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data' });
    response.end();
  },
  '/declared-large.json': (response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'application/json', 'content-length': '10000' });
    response.end('x'.repeat(10_000));
  },
  '/streamed-large.json': (response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.write('x'.repeat(4000));
    response.end('x'.repeat(4000));
  },
  '/slow.json': (): void => undefined,
  '/logo.png': (response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end(PNG);
  },
  '/logo.jpg': (response: ServerResponse): void => {
    response.writeHead(200);
    response.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  },
  '/logo.gif': (response: ServerResponse): void => {
    response.writeHead(200);
    response.end(Buffer.from('GIF89a'));
  },
  '/logo.webp': (response: ServerResponse): void => {
    response.writeHead(200);
    response.end(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]));
  },
  '/logo.svg': (response: ServerResponse): void => {
    response.writeHead(200, { 'content-type': 'image/svg+xml' });
    response.end('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  },
};

/**
 * Function resolveTo
 *
 * @description
 * Fake DNS answering the given addresses for every host.
 *
 * @param {LookupAddress[]} addresses - Answer.
 *
 * @returns {(hostname: string, options: LookupAllOptions, callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void) => void} Lookup.
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

describe('HttpsClientMetadataFetcher', (): void => {
  let server: Server;
  let port: number;
  let fetcher: HttpsClientMetadataFetcher;

  beforeAll(async (): Promise<void> => {
    server = createServer((request: IncomingMessage, response: ServerResponse): void => {
      (ROUTES[request.url ?? ''] ?? ((r: ServerResponse): void => void r.writeHead(404).end()))(
        response,
      );
    });
    await new Promise<void>((resolve: () => void): void => {
      server.listen(0, '127.0.0.1', resolve);
    });
    port = (server.address() as AddressInfo).port;
    // The local server speaks plain HTTP on loopback: the test swaps the transport and the policy,
    // the URL checks, the lookup wiring, the caps and the deadline stay those of production.
    fetcher = new HttpsClientMetadataFetcher({
      request: httpRequest,
      lookup: resolveTo([{ address: '127.0.0.1', family: 4 }]),
      isAllowedAddress: (): boolean => true,
      ports: [port],
      timeoutMs: 300,
    });
  });

  afterAll(async (): Promise<void> => {
    server.closeAllConnections();
    await new Promise<void>(
      (resolve: () => void): void => void server.close((): void => resolve()),
    );
  });

  const url: (path: string) => string = (path: string): string =>
    `https://meta.test:${port}${path}`;

  it('fetches a JSON document with its cache lifetime', async (): Promise<void> => {
    const fetched: FetchedClientMetadata = await fetcher.fetchDocument(url('/client.json'));
    expect(fetched).toEqual({ document: DOCUMENT, maxAgeSeconds: 120 });
    expect((await fetcher.fetchDocument(url('/no-store.json'))).maxAgeSeconds).toBe(0);
    expect(await fetcher.fetchDocument(url('/vendor.json'))).toEqual({
      document: { a: 1 },
      maxAgeSeconds: null,
    });
  });

  it.each([
    ['a non-JSON type', '/page.html'],
    ['invalid JSON', '/broken.json'],
    ['a redirect, never followed', '/redirect.json'],
    ['a declared oversized body', '/declared-large.json'],
    ['a streamed oversized body', '/streamed-large.json'],
    ['a response past the deadline', '/slow.json'],
    ['a missing document', '/missing.json'],
  ])('refuses %s', async (_label: string, path: string): Promise<void> => {
    await expect(fetcher.fetchDocument(url(path))).rejects.toThrow();
  });

  it('returns raster logos as data URLs and nothing else', async (): Promise<void> => {
    expect(await fetcher.fetchLogo(url('/logo.png'))).toBe(
      `data:image/png;base64,${PNG.toString('base64')}`,
    );
    expect(await fetcher.fetchLogo(url('/logo.jpg'))).toMatch(/^data:image\/jpeg;base64,/);
    expect(await fetcher.fetchLogo(url('/logo.gif'))).toMatch(/^data:image\/gif;base64,/);
    expect(await fetcher.fetchLogo(url('/logo.webp'))).toMatch(/^data:image\/webp;base64,/);
    expect(await fetcher.fetchLogo(url('/logo.svg'))).toBeNull();
    expect(await fetcher.fetchLogo(url('/missing.png'))).toBeNull();
    expect(await fetcher.fetchLogo('http://meta.test/logo.png')).toBeNull();
  });

  it('hands the connection the checked address in both lookup modes', async (): Promise<void> => {
    let captured: LookupFunction | undefined;
    const capturing: HttpsClientMetadataFetcher = new HttpsClientMetadataFetcher({
      request: (
        options: RequestOptions,
        callback: (response: IncomingMessage) => void,
      ): ClientRequest => {
        captured = options.lookup;
        return httpRequest(options, callback);
      },
      lookup: resolveTo([
        { address: '127.0.0.1', family: 4 },
        { address: '::1', family: 6 },
      ]),
      isAllowedAddress: (): boolean => true,
      ports: [port],
    });
    await capturing.fetchDocument(url('/client.json'));
    const single: unknown[] = await new Promise<unknown[]>(
      (resolve: (value: unknown[]) => void): void =>
        captured?.(
          'meta.test',
          { all: false } satisfies LookupOptions,
          (...args: unknown[]): void => resolve(args),
        ),
    );
    expect(single).toEqual([null, '127.0.0.1', 4]);
  });

  describe('server-side request forgery refusals', (): void => {
    it.each([
      ['plain http', 'http://meta.test/client.json'],
      ['a loopback IPv4 literal', 'https://127.0.0.1/client.json'],
      ['a loopback IPv6 literal', 'https://[::1]/client.json'],
      ['a cloud metadata literal', 'https://169.254.169.254/latest/meta-data'],
      ['a private literal', 'https://10.0.0.8/client.json'],
      ['credentials', 'https://user:secret@meta.test/client.json'],
      ['another port', 'https://meta.test:8443/client.json'],
      ['an unparsable URL', 'https://'],
    ])(
      'refuses %s before any network access',
      async (_label: string, target: string): Promise<void> => {
        const request: Mock<
          (options: RequestOptions, callback: (response: IncomingMessage) => void) => ClientRequest
        > =
          vi.fn<
            (
              options: RequestOptions,
              callback: (response: IncomingMessage) => void,
            ) => ClientRequest
          >();
        const guarded: HttpsClientMetadataFetcher = new HttpsClientMetadataFetcher({ request });
        await expect(guarded.fetchDocument(target)).rejects.toThrow();
        expect(request).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['a private address', [{ address: '10.1.2.3', family: 4 }]],
      [
        'a mix of public and private addresses',
        [
          { address: '93.184.215.14', family: 4 },
          { address: '192.168.1.10', family: 4 },
        ],
      ],
      ['an IPv4-mapped loopback', [{ address: '::ffff:127.0.0.1', family: 6 }]],
      ['no address', []],
    ])(
      'refuses a host resolving to %s',
      async (_label: string, addresses: LookupAddress[]): Promise<void> => {
        const guarded: HttpsClientMetadataFetcher = new HttpsClientMetadataFetcher({
          request: httpRequest,
          lookup: resolveTo(addresses),
        });
        await expect(guarded.fetchDocument('https://rebind.test/client.json')).rejects.toThrow(
          'Refused address.',
        );
      },
    );

    it('fails when the resolver fails', async (): Promise<void> => {
      const guarded: HttpsClientMetadataFetcher = new HttpsClientMetadataFetcher({
        request: httpRequest,
        lookup: (_hostname, _options, callback): void =>
          callback(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }), []),
      });
      await expect(guarded.fetchDocument('https://nowhere.test/client.json')).rejects.toThrow(
        'ENOTFOUND',
      );
    });
  });
});

describe('maxAgeOf', (): void => {
  it.each([
    [undefined, null],
    ['public', null],
    ['max-age=60', 60],
    ['Public, MAX-AGE=3600', 3600],
    ['no-cache, max-age=60', 0],
    ['private, no-store', 0],
    ['max-age=abc', null],
  ])('reads %s as %s', (header: string | undefined, expected: number | null): void => {
    expect(maxAgeOf(header)).toBe(expected);
  });
});
