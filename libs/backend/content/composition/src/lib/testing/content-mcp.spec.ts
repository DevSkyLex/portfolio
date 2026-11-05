import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import {
  type ContentDatabaseHandle,
  migrateContentDatabase,
  seedContent,
} from '@vfortin/content-adapters-out';
import { GetAdminProject, PublishProject, ReviseProject } from '@vfortin/content-application';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { ContentModule } from '@internal/content-composition/lib/content.module';
import { configureContentHttp } from '@internal/content-composition/lib/http/content-http/content-http';

const ISSUER: string = 'https://exemple.fr/api/auth';
const RESOURCE: string = 'https://exemple.fr/api/content/mcp';
const ENDPOINT: string = '/api/content/mcp';
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../apps/content-service/migrations', import.meta.url),
);

interface ProjectResponse extends Record<string, unknown> {
  readonly id: string;
  readonly version: number;
  readonly title: { readonly fr: string; readonly en?: string };
}

interface VersionedResponse extends Record<string, unknown> {
  readonly version: number;
}

interface ToolReply<T> {
  readonly result: {
    readonly structuredContent: T;
    readonly isError?: boolean;
    readonly content: readonly { readonly type: string; readonly text: string }[];
  };
}

describe('ContentModule', (): void => {
  let app: INestApplication<Server>;
  let mediaDirectory: string;
  let readToken: string;
  let writeToken: string;
  let publishToken: string;
  let fullToken: string;
  let adminToken: string;
  let expiredToken: string;
  let wrongAudienceToken: string;
  let sequence: number = 0;

  const rpc = (
    method: string,
    params: Record<string, unknown> = {},
    token: string = readToken,
  ): request.Test =>
    request(app.getHttpServer())
      .post(ENDPOINT)
      .set('accept', 'application/json, text/event-stream')
      .set('mcp-protocol-version', '2025-11-25')
      .set('authorization', `Bearer ${token}`)
      .send({ jsonrpc: '2.0', id: ++sequence, method, params });

  const call = (
    name: string,
    args: Record<string, unknown> = {},
    token: string = readToken,
  ): request.Test => rpc('tools/call', { name, arguments: args }, token);

  const data = <T>(response: request.Response): T =>
    (response.body as ToolReply<T>).result.structuredContent;

  beforeAll(async (): Promise<void> => {
    mediaDirectory = mkdtempSync(join(tmpdir(), 'content-mcp-'));
    const { publicKey, privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'mcp-test', alg: 'EdDSA' };
    const sign = (
      claims: Record<string, unknown>,
      audience: string = RESOURCE,
      expires: string = '5m',
    ): Promise<string> =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'EdDSA', kid: 'mcp-test', typ: 'at+jwt' })
        .setSubject('owner')
        .setIssuer(ISSUER)
        .setAudience(audience)
        .setIssuedAt()
        .setNotBefore(new Date())
        .setJti(`token-${++sequence}`)
        .setExpirationTime(expires)
        .sign(privateKey);
    const claims = (scope: string): Record<string, unknown> => ({
      client_id: 'https://client.example/mcp.json',
      scope,
    });
    readToken = await sign(claims('content:read'));
    writeToken = await sign(claims('content:write'));
    publishToken = await sign(claims('content:publish'));
    fullToken = await sign(claims('content:write content:publish content:delete'));
    adminToken = await sign({ role: 'admin', sid: 'admin-session' }, 'portfolio-admin');
    expiredToken = await sign(claims('content:read'), RESOURCE, '-2m');
    wrongAudienceToken = await sign(claims('content:read'), 'https://other.example/mcp');
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ service: 'mcp-test', level: 'silent', pretty: false }),
        AdminAuthModule.forRoot({ issuer: ISSUER, jwks: { keys: [jwk] } }),
        ContentModule.register({
          databaseUrl: 'pglite:memory',
          siteBuild: null,
          workers: false,
          mediaDirectory,
          mcp: { issuer: ISSUER, resource: RESOURCE, jwks: { keys: [jwk] } },
          prepare: async (database: ContentDatabaseHandle): Promise<void> => {
            await migrateContentDatabase(database, MIGRATIONS);
            await seedContent(database.db);
          },
        }),
      ],
    }).compile();
    const express: NestExpressApplication = moduleRef.createNestApplication<NestExpressApplication>(
      {
        bodyParser: false,
      },
    );
    configureContentHttp(express, { mediaDirectory, serveMedia: false });
    app = express as unknown as INestApplication<Server>;
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app?.close();
    if (mediaDirectory) rmSync(mediaDirectory, { recursive: true, force: true });
  });

  it('publishes discovery without authentication and challenges only for reading', async (): Promise<void> => {
    const metadata: request.Response = await request(app.getHttpServer()).get(
      `${ENDPOINT}/.well-known/oauth-protected-resource`,
    );
    expect(metadata.status).toBe(200);
    expect(metadata.body).toMatchObject({
      resource: RESOURCE,
      authorization_servers: [ISSUER],
      scopes_supported: ['content:read', 'content:write', 'content:publish', 'content:delete'],
      bearer_methods_supported: ['header'],
    });
    const denied: request.Response = await request(app.getHttpServer()).post(ENDPOINT).send({});
    expect(denied.status).toBe(401);
    expect(denied.headers['www-authenticate']).toContain('scope="content:read"');
    expect(denied.headers['www-authenticate']).toContain(
      'resource_metadata="https://exemple.fr/.well-known/oauth-protected-resource/api/content/mcp"',
    );
  });

  it('rejects administrator, expired, foreign audience and malformed tokens', async (): Promise<void> => {
    for (const token of [adminToken, expiredToken, wrongAudienceToken, 'invalid']) {
      const response: request.Response = await rpc('tools/list', {}, token);
      expect(response.status).toBe(401);
      expect(response.headers['www-authenticate']).toContain('error="invalid_token"');
    }
    const adminRoute: request.Response = await request(app.getHttpServer())
      .get('/api/content/admin/projects')
      .set('authorization', `Bearer ${fullToken}`);
    expect(adminRoute.status).toBe(401);
  });

  it('initializes a stateless JSON transport and discovers the typed tool catalogue', async (): Promise<void> => {
    const initialized: request.Response = await rpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'portfolio-integration-test', version: '1.0.0' },
    });
    expect(initialized.status).toBe(200);
    expect(initialized.body.result).toMatchObject({
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
    });
    expect(initialized.headers['mcp-session-id']).toBeUndefined();
    const listed: request.Response = await rpc('tools/list');
    expect(listed.status).toBe(200);
    const tools: { name: string; inputSchema: { required?: string[] } }[] =
      listed.body.result.tools;
    expect(tools.map((tool): string => tool.name).sort()).toEqual([
      'create_project',
      'create_timeline_entry',
      'delete_timeline_entry',
      'get_legal_document',
      'get_profile',
      'get_project',
      'get_publication_status',
      'get_timeline_entry',
      'list_projects',
      'list_timeline',
      'publish_project',
      'publish_publication_batch',
      'reorder_timeline',
      'revise_legal_document',
      'revise_profile',
      'revise_project',
      'revise_timeline_entry',
      'start_publication_batch',
      'unpublish_project',
    ]);
    expect(
      tools.find((tool): boolean => tool.name === 'revise_project')?.inputSchema.required,
    ).toEqual(expect.arrayContaining(['id', 'expectedVersion', 'revision']));
  });

  it('reads and revises a real project, rejecting a stale revision without changing it', async (): Promise<void> => {
    const listed: request.Response = await call('list_projects');
    expect(data<{ totalItems: number }>(listed).totalItems).toBeGreaterThan(0);
    const original: ProjectResponse = data(await call('get_project', { id: 'project-crm-kodoka' }));
    const revised: request.Response = await call(
      'revise_project',
      {
        id: original.id,
        expectedVersion: original.version,
        revision: { ...original, title: { fr: 'Updated project', en: 'Updated project' } },
      },
      fullToken,
    );
    expect(revised.status).toBe(200);
    expect(data<ProjectResponse>(revised)).toMatchObject({
      version: original.version + 1,
      title: { fr: 'Updated project', en: 'Updated project' },
    });
    const stale: request.Response = await call(
      'revise_project',
      {
        id: original.id,
        expectedVersion: original.version,
        revision: original,
      },
      fullToken,
    );
    expect(stale.body.result.isError).toBe(true);
    expect(data(stale)).toMatchObject({ status: 412, code: 'content.version-mismatch' });
    expect(data<ProjectResponse>(await call('get_project', { id: original.id })).title.fr).toBe(
      'Updated project',
    );
  });

  it('connects an official SDK client and calls a tool over a real HTTP listener', async (): Promise<void> => {
    await app.listen(0, '127.0.0.1');
    const address: ReturnType<Server['address']> = app.getHttpServer().address();
    if (address === null || typeof address === 'string') throw new Error('Missing HTTP listener.');
    const client: Client = new Client({ name: 'sdk-integration-test', version: '1.0.0' });
    const transport: StreamableHTTPClientTransport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}${ENDPOINT}`),
      { requestInit: { headers: { authorization: `Bearer ${readToken}` } } },
    );
    try {
      await client.connect(transport);
      expect((await client.listTools()).tools).toHaveLength(19);
      const result: Awaited<ReturnType<Client['callTool']>> = await client.callTool({
        name: 'get_project',
        arguments: { id: 'project-crm-kodoka' },
      });
      expect(result.structuredContent).toMatchObject({ id: 'project-crm-kodoka' });
    } finally {
      await client.close();
    }
  });

  it('requires the precise scopes before mutation, preserving data on refusal', async (): Promise<void> => {
    const original: ProjectResponse = data(await call('get_project', { id: 'project-crm-kodoka' }));
    const denied: request.Response = await call('revise_project', {
      id: original.id,
      expectedVersion: original.version,
      revision: original,
    });
    expect(denied.status).toBe(403);
    expect(denied.headers['www-authenticate']).toContain('error="insufficient_scope"');
    expect(denied.headers['www-authenticate']).toContain('content:write');
    const publishedEditDenied: request.Response = await call(
      'revise_project',
      {
        id: original.id,
        expectedVersion: original.version,
        revision: original,
      },
      writeToken,
    );
    expect(publishedEditDenied.status).toBe(403);
    expect(publishedEditDenied.headers['www-authenticate']).toContain('content:publish');
    const publishDenied: request.Response = await call(
      'publish_project',
      {
        id: original.id,
        expectedVersion: original.version,
      },
      writeToken,
    );
    expect(publishDenied.status).toBe(403);
    expect(publishDenied.headers['www-authenticate']).toContain('content:publish');
    expect(data<ProjectResponse>(await call('get_project', { id: original.id })).version).toBe(
      original.version,
    );
    const publicWriteDenied: request.Response = await call(
      'create_timeline_entry',
      {
        kind: 'experience',
        entry: {},
      },
      writeToken,
    );
    expect(publicWriteDenied.status).toBe(403);
    const deleteDenied: request.Response = await call(
      'delete_timeline_entry',
      {
        kind: 'experience',
        id: 'kodoka',
        expectedVersion: 1,
      },
      publishToken,
    );
    expect(deleteDenied.status).toBe(403);
    expect(deleteDenied.headers['www-authenticate']).toContain('content:delete');
  });

  it('creates a draft project with write consent only, its slug free and from the French title', async (): Promise<void> => {
    // A project read back is a valid creation input: the contract drops its identity fields.
    const source: ProjectResponse = data(await call('get_project', { id: 'project-crm-kodoka' }));
    const created: ProjectResponse = data(
      await call('create_project', { project: source }, writeToken),
    );
    expect(created).toMatchObject({ status: 'draft', version: 1, title: source.title });
    expect(created.id).not.toBe(source.id);
    // An earlier test renamed the source, so its slug and the new one differ.
    expect(created['slug']).not.toBe(source['slug']);
    expect(String(created['slug'])).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(data<ProjectResponse>(await call('get_project', { id: created.id })).version).toBe(1);
  });

  it('publishes and unpublishes using the current project version', async (): Promise<void> => {
    const original: ProjectResponse = data(await call('get_project', { id: 'project-crm-kodoka' }));
    const unpublished: request.Response = await call(
      'unpublish_project',
      {
        id: original.id,
        expectedVersion: original.version,
      },
      publishToken,
    );
    expect(data<ProjectResponse>(unpublished)).toMatchObject({ status: 'draft' });
    const draft: ProjectResponse = data(unpublished);
    const editedDraft: request.Response = await call(
      'revise_project',
      {
        id: draft.id,
        expectedVersion: draft.version,
        revision: draft,
      },
      writeToken,
    );
    expect(data<ProjectResponse>(editedDraft)).toMatchObject({
      status: 'draft',
      version: draft.version + 1,
    });
    const published: request.Response = await call(
      'publish_project',
      {
        id: original.id,
        expectedVersion: data<ProjectResponse>(editedDraft).version,
      },
      publishToken,
    );
    expect(data<ProjectResponse>(published)).toMatchObject({ status: 'published' });
  });

  it('denies a predicted future draft version before a concurrent publication can authorize the edit', async (): Promise<void> => {
    const current: ProjectResponse = data(await call('get_project', { id: 'project-iotplatform' }));
    const draft: ProjectResponse = data(
      await call(
        'unpublish_project',
        {
          id: current.id,
          expectedVersion: current.version,
        },
        publishToken,
      ),
    );
    const revise: ReviseProject = app.get<ReviseProject>(ReviseProject);
    const originalExecute: ReviseProject['execute'] = revise.execute.bind(revise);
    const publish: PublishProject = app.get<PublishProject>(PublishProject);
    const spy: ReturnType<typeof vi.spyOn> = vi
      .spyOn(revise, 'execute')
      .mockImplementationOnce(
        async (id, expectedVersion, revision): ReturnType<ReviseProject['execute']> => {
          // An edit permitted against a guessed version must not race this real publication.
          await publish.execute(id, draft.version);
          return originalExecute(id, expectedVersion, revision);
        },
      );
    try {
      const denied: request.Response = await call(
        'revise_project',
        {
          id: draft.id,
          expectedVersion: draft.version + 1,
          revision: {
            ...draft,
            title: { fr: 'Unauthorized public edit', en: 'Unauthorized public edit' },
          },
        },
        writeToken,
      );
      expect(denied.status).toBe(403);
      expect(denied.headers['www-authenticate']).toContain('content:publish');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
    expect(data<ProjectResponse>(await call('get_project', { id: draft.id }))).toMatchObject({
      status: 'draft',
      version: draft.version,
      title: draft.title,
    });
  });

  it('rejects an exact-version draft edit if publication races the mutation', async (): Promise<void> => {
    const current: ProjectResponse = data(await call('get_project', { id: 'project-crm-kodoka' }));
    const draft: ProjectResponse = data(
      await call(
        'unpublish_project',
        {
          id: current.id,
          expectedVersion: current.version,
        },
        publishToken,
      ),
    );
    const revise: ReviseProject = app.get<ReviseProject>(ReviseProject);
    const originalExecute: ReviseProject['execute'] = revise.execute.bind(revise);
    const publish: PublishProject = app.get<PublishProject>(PublishProject);
    const spy: ReturnType<typeof vi.spyOn> = vi
      .spyOn(revise, 'execute')
      .mockImplementationOnce(
        async (id, expectedVersion, revision): ReturnType<ReviseProject['execute']> => {
          await publish.execute(id, draft.version);
          return originalExecute(id, expectedVersion, revision);
        },
      );
    try {
      const conflicted: request.Response = await call(
        'revise_project',
        {
          id: draft.id,
          expectedVersion: draft.version,
          revision: { ...draft, title: { fr: 'Racing edit', en: 'Racing edit' } },
        },
        writeToken,
      );
      expect(conflicted.status).toBe(200);
      expect(conflicted.body.result.isError).toBe(true);
      expect(data(conflicted)).toMatchObject({ status: 412, code: 'content.version-mismatch' });
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      spy.mockRestore();
    }
    expect(data<ProjectResponse>(await call('get_project', { id: draft.id }))).toMatchObject({
      status: 'published',
      version: draft.version + 1,
      title: draft.title,
    });
  });

  it('creates, reads, revises, reorders and deletes a timeline entry', async (): Promise<void> => {
    const entry: Record<string, unknown> = {
      title: { fr: 'Internship', en: 'Internship' },
      place: { fr: 'Blois', en: 'Blois' },
      description: { fr: 'Internal tools.', en: 'Internal tools.' },
      start: { year: 2025, month: 2 },
      end: null,
      techs: ['vue'],
    };
    const created: request.Response = await call(
      'create_timeline_entry',
      {
        kind: 'experience',
        entry,
      },
      fullToken,
    );
    const saved: VersionedResponse & { id: string } = data(created);
    expect(saved).toMatchObject({ kind: 'experience', version: 1 });
    expect(
      data(await call('get_timeline_entry', { kind: 'experience', id: saved.id })),
    ).toMatchObject({ title: entry['title'] });
    const revised: request.Response = await call(
      'revise_timeline_entry',
      {
        kind: 'experience',
        id: saved.id,
        expectedVersion: saved.version,
        entry: { ...entry, end: { year: 2025, month: 7 } },
      },
      fullToken,
    );
    expect(data<VersionedResponse>(revised).version).toBe(2);
    const list: VersionedResponse & { member: { id: string }[] } = data(
      await call('list_timeline', { kind: 'experience' }),
    );
    const reordered: request.Response = await call(
      'reorder_timeline',
      {
        kind: 'experience',
        expectedVersion: list.version,
        ids: list.member.map((item): string => item.id).reverse(),
      },
      fullToken,
    );
    expect(data<{ member: { id: string }[] }>(reordered).member[0]?.id).toBe(saved.id);
    const removed: request.Response = await call(
      'delete_timeline_entry',
      {
        kind: 'experience',
        id: saved.id,
        expectedVersion: 2,
      },
      fullToken,
    );
    expect(removed.body.result.isError).not.toBe(true);
    expect(
      data<{ member: { id: string }[] }>(removed).member.some(
        (item): boolean => item.id === saved.id,
      ),
    ).toBe(false);
  });

  it('revises profile and legal documents through their existing versioned contracts', async (): Promise<void> => {
    const profile: VersionedResponse = data(await call('get_profile'));
    const revised: request.Response = await call(
      'revise_profile',
      {
        expectedVersion: profile.version,
        profile,
      },
      fullToken,
    );
    expect(data<VersionedResponse>(revised).version).toBe(profile.version + 1);
    for (const kind of ['notice', 'privacy']) {
      const legal: VersionedResponse = data(await call('get_legal_document', { kind }));
      const result: request.Response = await call(
        'revise_legal_document',
        {
          kind,
          expectedVersion: legal.version,
          body: legal['body'],
        },
        fullToken,
      );
      expect(data<VersionedResponse>(result).version).toBe(legal.version + 1);
    }
  });

  it('refuses malformed tool input and missing or invalid versions', async (): Promise<void> => {
    for (const expectedVersion of [undefined, 0, -1, 1.2, '1']) {
      const response: request.Response = await call(
        'publish_project',
        {
          id: 'project-crm-kodoka',
          expectedVersion,
        },
        publishToken,
      );
      expect(response.body.result?.isError ?? Boolean(response.body.error)).toBe(true);
    }
    const invalid: request.Response = await call(
      'revise_project',
      {
        id: 'project-crm-kodoka',
        expectedVersion: 1,
        revision: { title: 7 },
      },
      fullToken,
    );
    expect(invalid.body.result?.isError ?? Boolean(invalid.body.error)).toBe(true);
  });

  it('uses safe tool errors for missing data and unexpected backend failures', async (): Promise<void> => {
    const missing: request.Response = await call('get_project', { id: 'absent' });
    expect(missing.body.result.isError).toBe(true);
    expect(data(missing)).toMatchObject({ status: 404, code: 'content.not-found' });
    const spy: ReturnType<typeof vi.spyOn> = vi
      .spyOn(app.get<GetAdminProject>(GetAdminProject), 'execute')
      .mockRejectedValueOnce(new Error('database-password-sensitive-stack'));
    try {
      const failed: request.Response = await call('get_project', { id: 'project-crm-kodoka' });
      expect(failed.body.result.isError).toBe(true);
      expect(JSON.stringify(failed.body)).not.toContain('database-password-sensitive-stack');
    } finally {
      spy.mockRestore();
    }
  });

  it('fails closed when a project status lookup cannot establish permission to edit', async (): Promise<void> => {
    const original: ProjectResponse = data(await call('get_project', { id: 'project-crm-kodoka' }));
    const spy: ReturnType<typeof vi.spyOn> = vi
      .spyOn(app.get<GetAdminProject>(GetAdminProject), 'execute')
      .mockRejectedValueOnce(new Error('unavailable status lookup'));
    try {
      const denied: request.Response = await call(
        'revise_project',
        {
          id: original.id,
          expectedVersion: original.version,
          revision: original,
        },
        writeToken,
      );
      expect(denied.status).toBe(403);
      expect(denied.headers['www-authenticate']).toContain('content:publish');
    } finally {
      spy.mockRestore();
    }
    expect(data<ProjectResponse>(await call('get_project', { id: original.id })).version).toBe(
      original.version,
    );
  });

  it('rejects foreign and invalid origins while allowing the configured origin', async (): Promise<void> => {
    for (const origin of ['https://attacker.example', 'null', 'not-an-origin']) {
      const denied: request.Response = await rpc('tools/list')
        .set('origin', origin)
        .set('host', 'attacker.example')
        .set('x-forwarded-host', 'attacker.example');
      expect(denied.status).toBe(403);
    }
    const allowed: request.Response = await rpc('tools/list').set('origin', 'https://exemple.fr');
    expect(allowed.status).toBe(200);
    const preflight: request.Response = await request(app.getHttpServer())
      .options(ENDPOINT)
      .set('origin', 'https://exemple.fr');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-headers']).toContain('Authorization');
  });

  it('keeps protocol errors in JSON-RPC and accepts initialized notifications', async (): Promise<void> => {
    const unknown: request.Response = await rpc('nonexistent');
    expect(unknown.body.error.code).toBe(-32601);
    const tool: request.Response = await call('nonexistent');
    expect(tool.body.error ?? tool.body.result?.isError).toBeTruthy();
    const notification: request.Response = await request(app.getHttpServer())
      .post(ENDPOINT)
      .set('authorization', `Bearer ${readToken}`)
      .set('accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(notification.status).toBe(202);
    for (const method of ['get', 'delete'] as const) {
      const unsupported: request.Response = await request(app.getHttpServer())
        [method](ENDPOINT)
        .set('authorization', `Bearer ${readToken}`);
      expect(unsupported.status).toBe(405);
    }
  });
});
