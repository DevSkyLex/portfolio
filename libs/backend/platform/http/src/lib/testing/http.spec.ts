import type { Server as NodeHttpServer } from 'node:http';
import {
  type ArgumentsHost,
  BadRequestException,
  Controller,
  Get,
  HttpException,
  type INestApplication,
  Logger,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  IfMatchVersion,
  parseIfMatch,
  versionEtag,
} from '@internal/backend-http/lib/if-match/if-match';
import {
  ProblemDetailsFilter,
  type ProblemMapper,
} from '@internal/backend-http/lib/filters/problem-details/problem-details.filter';
import { ZodValidationPipe } from '@internal/backend-http/lib/pipes/zod-validation/zod-validation.pipe';

/**
 * Class RuleBroken
 * @class RuleBroken
 *
 * @description
 * Test domain error recognized by the problem mapper as a rule violation.
 */
class RuleBroken extends Error {}

/**
 * Constant mapper
 *
 * @description
 * Maps the test rule error to HTTP 422 and leaves unrelated exceptions to the shared filter.
 *
 * @type {ProblemMapper}
 */
const mapper: ProblemMapper = (
  exception: unknown,
): { status: number; code: string; title: string } | null =>
  exception instanceof RuleBroken ? { status: 422, code: 'demo.rule', title: 'Rule' } : null;

/**
 * Minimal response chain recorded by the HTTP problem-filter tests.
 */
interface ResponseDouble {
  readonly headersSent: boolean;
  status(code: number): ResponseDouble;
  type(value: string): ResponseDouble;
  json(body: Record<string, unknown>): ResponseDouble;
  end(): void;
}

/**
 * Function capture
 *
 * @description
 * Runs the filter against minimal request and response doubles and returns the captured status, content type and body.
 *
 * @param {ProblemDetailsFilter} filter - Filter under test.
 * @param {unknown} exception - Exception supplied to the filter.
 * @param {{ originalUrl: string; id?: string }} request - Request URL and optional correlation ID.
 * @param {boolean} headersSent - Whether the response has already started.
 * @returns {{ status?: number; type?: string; body?: Record<string, unknown>; ended?: boolean }} Observable response operations.
 */
function capture(
  filter: ProblemDetailsFilter,
  exception: unknown,
  request: { originalUrl: string; id?: string } = { originalUrl: '/api/demo', id: 'req-12345678' },
  headersSent: boolean = false,
): { status?: number; type?: string; body?: Record<string, unknown>; ended?: boolean } {
  const sent: { status?: number; type?: string; body?: Record<string, unknown>; ended?: boolean } =
    {};
  const response: ResponseDouble = {
    headersSent,
    status(code: number): ResponseDouble {
      sent.status = code;
      return this;
    },
    type(value: string): ResponseDouble {
      sent.type = value;
      return this;
    },
    json(body: Record<string, unknown>): ResponseDouble {
      sent.body = body;
      return this;
    },
    end(): void {
      sent.ended = true;
    },
  };
  const host: ArgumentsHost = {
    switchToHttp: () => ({
      getRequest: (): { originalUrl: string; id?: string } => request,
      getResponse: (): ResponseDouble => response,
    }),
  } as unknown as ArgumentsHost;
  filter.catch(exception, host);
  return sent;
}

describe('ProblemDetailsFilter', (): void => {
  beforeEach((): void => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation((): undefined => undefined);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('translates a context error with its mapper', (): void => {
    const sent: {
      status?: number;
      type?: string;
      body?: Record<string, unknown>;
      ended?: boolean;
    } = capture(new ProblemDetailsFilter(mapper), new RuleBroken());
    expect(sent.status).toBe(422);
    expect(sent.type).toBe('application/problem+json');
    expect(sent.body).toMatchObject({
      type: 'about:blank',
      code: 'demo.rule',
      instance: '/api/demo',
      requestId: 'req-12345678',
    });
  });

  it('keeps the status and field errors of an HTTP error', (): void => {
    const sent: {
      status?: number;
      type?: string;
      body?: Record<string, unknown>;
      ended?: boolean;
    } = capture(
      new ProblemDetailsFilter(mapper),
      new BadRequestException({ code: 'request.invalid', errors: [{ field: 'email' }] }),
    );
    expect(sent.status).toBe(400);
    expect(sent.body).toMatchObject({ code: 'request.invalid', errors: [{ field: 'email' }] });
  });

  it('gives an HTTP error without a code a generic one', (): void => {
    const sent: {
      status?: number;
      type?: string;
      body?: Record<string, unknown>;
      ended?: boolean;
    } = capture(new ProblemDetailsFilter(), new HttpException('Gone', 410), {
      originalUrl: '/api/old',
    });
    expect(sent.status).toBe(410);
    expect(sent.body).toEqual({
      type: 'about:blank',
      instance: '/api/old',
      title: 'Gone',
      status: 410,
      code: 'http.410',
    });
  });

  it('keeps the status of a body-parser error, and still hides an unexposed one', (): void => {
    const tooLarge: Error & { status: number; expose: boolean; type: string } = Object.assign(
      new Error('request entity too large'),
      { status: 413, expose: true, type: 'entity.too.large' },
    );
    const sent: {
      status?: number;
      type?: string;
      body?: Record<string, unknown>;
      ended?: boolean;
    } = capture(new ProblemDetailsFilter(), tooLarge, { originalUrl: '/api/demo' });
    expect(sent.status).toBe(413);
    expect(sent.type).toBe('application/problem+json');
    expect(sent.body).toEqual({
      type: 'about:blank',
      instance: '/api/demo',
      title: 'request entity too large',
      status: 413,
      code: 'http.413',
    });
    const hidden: Error & { status: number } = Object.assign(new Error('hidden'), { status: 400 });
    expect(capture(new ProblemDetailsFilter(), hidden).status).toBe(500);
    const server: Error & { status: number; expose: boolean } = Object.assign(new Error('db'), {
      status: 503,
      expose: true,
    });
    expect(capture(new ProblemDetailsFilter(), server).status).toBe(500);
  });

  it('hides the detail of an unknown error and logs it', (): void => {
    const sent: {
      status?: number;
      type?: string;
      body?: Record<string, unknown>;
      ended?: boolean;
    } = capture(new ProblemDetailsFilter(), new Error('secret'));
    expect(sent.status).toBe(500);
    expect(sent.body).toMatchObject({ code: 'internal', title: 'Internal server error' });
    expect(JSON.stringify(sent.body)).not.toContain('secret');
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('secret'));
    capture(new ProblemDetailsFilter(), 'thrown text');
    expect(Logger.prototype.error).toHaveBeenLastCalledWith('thrown text');
  });

  it('only ends a response that already started', (): void => {
    const sent: {
      status?: number;
      type?: string;
      body?: Record<string, unknown>;
      ended?: boolean;
    } = capture(new ProblemDetailsFilter(), new Error('late'), undefined, true);
    expect(sent).toEqual({ ended: true });
  });
});

describe('ZodValidationPipe', (): void => {
  it('lists the invalid fields', (): void => {
    const pipe: ZodValidationPipe<{ email: string }> = new ZodValidationPipe<{ email: string }>({
      safeParse: (): {
        success: false;
        error: { issues: { path: string[]; message: string }[] };
      } => ({
        success: false,
        error: { issues: [{ path: ['email'], message: 'Invalid address' }] },
      }),
    });
    try {
      pipe.transform({});
      expect.unreachable();
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'request.invalid',
        errors: [{ field: 'email', message: 'Invalid address' }],
      });
    }
  });

  it('returns the parsed value', (): void => {
    const pipe: ZodValidationPipe<{ page: number }> = new ZodValidationPipe<{ page: number }>({
      safeParse: (): { success: true; data: { page: number } } => ({
        success: true,
        data: { page: 2 },
      }),
    });
    expect(pipe.transform({ page: '2' })).toEqual({ page: 2 });
  });
});

describe('If-Match', (): void => {
  it('reads a strong or weak version ETag', (): void => {
    expect(versionEtag(3)).toBe('"3"');
    expect(parseIfMatch('"3"')).toBe(3);
    expect(parseIfMatch(' W/"12" ')).toBe(12);
  });

  it.each([undefined, '', '*', '3', '"x"', '"1234567890"'])(
    'requires a version (%s)',
    (header: string | undefined): void => {
      try {
        parseIfMatch(header);
        expect.unreachable();
      } catch (error: unknown) {
        expect((error as HttpException).getStatus()).toBe(428);
        expect((error as HttpException).getResponse()).toMatchObject({
          code: 'request.precondition-required',
        });
      }
    },
  );

  describe('as a route parameter', (): void => {
    @Controller('demo')
    class DemoController {
      @Get()
      public read(@IfMatchVersion() version: number): { version: number } {
        return { version };
      }
    }

    let app: INestApplication<NodeHttpServer>;

    beforeAll(async (): Promise<void> => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [DemoController],
      }).compile();
      app = moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
      app.useGlobalFilters(new ProblemDetailsFilter());
      await app.init();
    });

    afterAll(async (): Promise<void> => {
      await app.close();
    });

    it('passes the expected version, or answers 428 as problem+json', async (): Promise<void> => {
      const ok: request.Response = await request(app.getHttpServer())
        .get('/demo')
        .set('if-match', '"5"');
      expect(ok.body).toEqual({ version: 5 });
      const missing: request.Response = await request(app.getHttpServer()).get('/demo');
      expect(missing.status).toBe(428);
      expect(missing.headers['content-type']).toContain('application/problem+json');
    });
  });
});
