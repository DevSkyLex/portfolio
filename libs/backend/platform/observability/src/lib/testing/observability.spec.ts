import { type INestApplication, Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { IncomingMessage, Server as NodeHttpServer, ServerResponse } from 'node:http';
import request from 'supertest';
import {
  LOG_REDACTIONS,
  ObservabilityModule,
  REQUEST_ID_HEADER,
  resolveRequestId,
} from '@internal/backend-observability/lib/observability.module';
import {
  READINESS_CHECKS,
  type ReadinessCheck,
} from '@internal/backend-observability/lib/readiness/readiness';

/**
 * Function exchange
 *
 * @description
 * Creates request and response doubles for request-ID resolution and exposes the value written to the response.
 *
 * @param {string} header - Optional incoming request-ID header value.
 * @returns {{ req: IncomingMessage; res: ServerResponse; sent: () => unknown }} Minimal Node request/response pair and captured header accessor.
 */
function exchange(header?: string): {
  req: IncomingMessage;
  res: ServerResponse;
  sent: () => unknown;
} {
  const headers: Record<string, unknown> = {};
  const req: IncomingMessage = {
    headers: header === undefined ? {} : { [REQUEST_ID_HEADER]: header },
  } as IncomingMessage;
  const res: ServerResponse<IncomingMessage> = {
    setHeader: (name: string, value: unknown): void => {
      headers[name] = value;
    },
  } as unknown as ServerResponse;
  return { req, res, sent: (): unknown => headers[REQUEST_ID_HEADER] };
}

describe('resolveRequestId', (): void => {
  it("reuses the caller's ID and echoes it", (): void => {
    const { req, res, sent } = exchange('front-4f1c2a9b');
    expect(resolveRequestId(req, res)).toBe('front-4f1c2a9b');
    expect(sent()).toBe('front-4f1c2a9b');
  });

  it('creates one when it is missing or malformed', (): void => {
    for (const header of [undefined, 'x', 'with spaces not allowed']) {
      const { req, res, sent } = exchange(header);
      const id: string = resolveRequestId(req, res);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(sent()).toBe(id);
    }
  });
});

describe('LOG_REDACTIONS', (): void => {
  it('hides credentials, the refresh cookie and client addresses', (): void => {
    expect(LOG_REDACTIONS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.remoteAddress',
        'req.headers["x-forwarded-for"]',
      ]),
    );
  });
});

describe('health endpoints', (): void => {
  /**
   * Function start
   *
   * @description
   * Builds and initializes a Nest application with optional readiness checks and the requested log formatting.
   *
   * @param {ReadinessCheck[] | null} checks - Dependency probes to register, or `null` to omit the provider.
   * @param {boolean} pretty - Whether to enable readable test logging.
   * @returns {Promise<INestApplication<NodeHttpServer>>} Initialized application to exercise health routes.
   */
  async function start(
    checks: ReadinessCheck[] | null,
    pretty: boolean = false,
  ): Promise<INestApplication<NodeHttpServer>> {
    @Module({
      providers: checks === null ? [] : [{ provide: READINESS_CHECKS, useValue: checks }],
      exports: checks === null ? [] : [READINESS_CHECKS],
    })
    class ChecksModule {}

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ service: 'test', level: 'silent', pretty }),
        ChecksModule,
      ],
    }).compile();
    const app: INestApplication<NodeHttpServer> =
      moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
    await app.init();
    return app;
  }

  it('answers live and ready when every dependency is up', async (): Promise<void> => {
    const app: INestApplication<NodeHttpServer> = await start([
      { name: 'database', check: async (): Promise<undefined> => undefined },
    ]);
    const server: ReturnType<typeof request> = request(app.getHttpServer());
    expect((await server.get('/health/live')).status).toBe(200);
    const ready: request.Response = await server
      .get('/health/ready')
      .set(REQUEST_ID_HEADER, 'probe-12345678');
    expect(ready.status).toBe(200);
    expect(ready.headers[REQUEST_ID_HEADER]).toBe('probe-12345678');
    expect(ready.body.info.database.status).toBe('up');

    // The checks are looked up once, then reused.
    expect((await server.get('/health/ready')).status).toBe(200);
    await app.close();
  });

  it('answers 503 when a dependency is down', async (): Promise<void> => {
    const app: INestApplication<NodeHttpServer> = await start([
      {
        name: 'database',
        check: (): Promise<void> => Promise.reject(new Error('connection refused')),
      },
    ]);
    const ready: request.Response = await request(app.getHttpServer()).get('/health/ready');
    expect(ready.status).toBe(503);
    await app.close();
  });

  it('is ready without any declared dependency, also with readable logs', async (): Promise<void> => {
    const app: INestApplication<NodeHttpServer> = await start(null, true);
    expect((await request(app.getHttpServer()).get('/health/ready')).status).toBe(200);
    await app.close();
  });
});
