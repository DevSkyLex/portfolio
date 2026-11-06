import type { LookupAddress, LookupAllOptions } from 'node:dns';
import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
  request as httpRequest,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpsRemoteImageSource } from '@internal/content-adapters-out/lib/media/remote-image/https-remote-image.source';

/**
 * Constant PNG
 *
 * @description
 * PNG signature, enough to tell the bytes passed through unchanged.
 *
 * @type {Buffer}
 */
const PNG: Buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('HttpsRemoteImageSource', (): void => {
  let server: Server;
  let port: number;
  let accept: string | undefined;

  beforeAll(async (): Promise<void> => {
    server = createServer((request: IncomingMessage, response: ServerResponse): void => {
      accept = request.headers.accept;
      if (request.url === '/cdn')
        return void response.writeHead(302, { location: '/image.png' }).end();
      if (request.url === '/image.png') return void response.writeHead(200).end(PNG);
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve: () => void): void => {
      server.listen(0, '127.0.0.1', resolve);
    });
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async (): Promise<void> => {
    server.closeAllConnections();
    await new Promise<void>(
      (resolve: () => void): void => void server.close((): void => resolve()),
    );
  });

  it('downloads the image bytes, following a CDN redirect, within the size cap', async (): Promise<void> => {
    // Plain HTTP on loopback: the test swaps the transport and the policy, the rest is production.
    const source: HttpsRemoteImageSource = new HttpsRemoteImageSource(1024, {
      request: httpRequest,
      lookup: (
        _hostname: string,
        _options: LookupAllOptions,
        callback: (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
      ): void => callback(null, [{ address: '127.0.0.1', family: 4 }]),
      isAllowedAddress: (): boolean => true,
      ports: [port],
      timeoutMs: 500,
    });
    const bytes: Uint8Array = await source.fetch(`https://images.test:${port}/cdn`);
    expect(Buffer.from(bytes).equals(PNG)).toBe(true);
    expect(accept).toContain('image/webp');
    await expect(
      new HttpsRemoteImageSource(4, {
        request: httpRequest,
        lookup: (_hostname, _options, callback): void =>
          callback(null, [{ address: '127.0.0.1', family: 4 }]),
        isAllowedAddress: (): boolean => true,
        ports: [port],
      }).fetch(`https://images.test:${port}/image.png`),
    ).rejects.toThrow('Response too large.');
  });

  it('refuses an address of the server network with its production defaults', async (): Promise<void> => {
    const source: HttpsRemoteImageSource = new HttpsRemoteImageSource(1024);
    await expect(source.fetch('https://127.0.0.1/image.png')).rejects.toThrow(
      'Refused outbound URL.',
    );
    await expect(source.fetch('http://images.example/image.png')).rejects.toThrow(
      'Refused outbound URL.',
    );
  });
});
