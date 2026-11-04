import { SeoSourceError } from '@vfortin/content-application';
import {
  field,
  finite,
  googleJson,
  list,
  redact,
  round,
} from '@internal/content-adapters-out/lib/seo/google-http/google-http';

/**
 * Function answering
 *
 * @description
 * Builds a fetch stub answering one status and body (no network).
 *
 * @param {number} status - HTTP status.
 * @param {string} body - Response body.
 * @returns {typeof fetch} Stub.
 */
function answering(status: number, body: string): typeof fetch {
  return async (): Promise<Response> => new Response(body, { status });
}

/**
 * Function call
 *
 * @description
 * Sends a request through `googleJson` with the given transport.
 *
 * @param {typeof fetch} fetcher - Transport.
 * @returns {Promise<unknown>} Parsed body.
 */
const call = (fetcher: typeof fetch): Promise<unknown> =>
  googleJson(
    'https://example.test/api',
    { method: 'GET' },
    {
      service: 'Test API',
      fetcher,
      timeoutMs: 1000,
      secrets: ['s3cr3t-value'],
    },
  );

describe('googleJson', (): void => {
  it('returns the parsed body of a success', async (): Promise<void> => {
    expect(await call(answering(200, '{"rows":[]}'))).toEqual({ rows: [] });
  });

  it('reads Google error bodies of any shape', async (): Promise<void> => {
    await expect(call(answering(403, '{"error":"denied"}'))).rejects.toMatchObject({
      reason: 'permission-denied',
      message: 'Test API refused the request (HTTP 403).',
    });
    await expect(
      call(answering(500, '{"error":{"status":7,"message":"Backend error"}}')),
    ).rejects.toMatchObject({
      reason: 'upstream',
      message: 'Test API refused the request (HTTP 500): Backend error',
    });
    await expect(call(answering(500, '{"error":{"status":"INTERNAL"}}'))).rejects.toMatchObject({
      message: 'Test API refused the request (HTTP 500): INTERNAL',
    });
    await expect(call(answering(404, 'null'))).rejects.toMatchObject({ reason: 'not-found' });
    await expect(call(answering(302, ''))).rejects.toMatchObject({ reason: 'unexpected' });
  });

  it('treats a refused API key as rejected credentials, whatever the status', async (): Promise<void> => {
    await expect(
      call(
        answering(
          400,
          '{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}',
        ),
      ),
    ).rejects.toMatchObject({ reason: 'credentials-rejected' });
  });

  it('reports a timeout and a network failure without detail', async (): Promise<void> => {
    const timeout: typeof fetch = async (): Promise<Response> => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    };
    await expect(call(timeout)).rejects.toMatchObject({
      reason: 'timeout',
      message: 'Test API did not answer within 1 s.',
    });
    const offline: typeof fetch = async (): Promise<Response> => {
      throw new TypeError('fetch failed: s3cr3t-value');
    };
    const error: unknown = await call(offline).catch((rejection: unknown): unknown => rejection);
    expect(error).toBeInstanceOf(SeoSourceError);
    expect(error).toMatchObject({ reason: 'network', message: 'Test API could not be reached.' });
    await expect(call(async (): Promise<Response> => Promise.reject('down'))).rejects.toMatchObject(
      {
        reason: 'network',
      },
    );
  });
});

describe('redact', (): void => {
  it('removes the secrets and anything shaped like a Google credential', (): void => {
    expect(
      redact(
        'token ya29.a0AfH6SM-abc key=AIzaSyA1234567890abcdefghijk&x=1 Authorization: Bearer abc.def s3cr3t',
        ['s3cr3t', ''],
      ),
    ).toBe('token [redacted] key=[redacted]&x=1 Authorization: Bearer [redacted] [redacted]');
  });

  it('flattens whitespace and bounds the length', (): void => {
    const long: string = redact(`a\n\n${'b'.repeat(400)}`, []);
    expect(long).toHaveLength(300);
    expect(long.startsWith('a b')).toBe(true);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('field, list, finite and round', (): void => {
  it('read untrusted JSON defensively', (): void => {
    expect(field({ a: 1 }, 'a')).toBe(1);
    expect(field(null, 'a')).toBeUndefined();
    expect(field('text', 'a')).toBeUndefined();
    expect(list({}, 'rows', 'Test API')).toEqual([]);
    expect((): unknown => list({ rows: {} }, 'rows', 'Test API')).toThrow(
      'Test API answered an unexpected rows.',
    );
    expect(finite('12.5', 'Test API', 'clicks')).toBe(12.5);
    expect((): number => finite(-1, 'Test API', 'clicks')).toThrow(SeoSourceError);
    expect((): number => finite(null, 'Test API', 'clicks')).toThrow('clicks');
    expect(round(1.23456, 2)).toBe(1.23);
  });
});
