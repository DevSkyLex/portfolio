import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { type INestApplication, Logger } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { MCP_TOKEN_VERIFIER, McpAuthModule, type McpPrincipal } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  CreateTimelineEntry,
  DeleteTimelineEntry,
  GetAdminLegalDocument,
  GetAdminProfile,
  GetAdminProject,
  GetAdminTimelineEntry,
  ListAdminProjects,
  ManagePublication,
  ListAdminTimeline,
  NotFoundError,
  PublishProject,
  ReorderTimeline,
  ReviseLegalDocument,
  ReviseProfile,
  ReviseProject,
  CreateProject,
  ReviseTimelineEntry,
  UnpublishProject,
  VersionMismatchError,
} from '@vfortin/content-application';
import {
  type AdminProjectDto,
  type ProfileRevisionRequest,
  ProjectRevisionRequestSchema,
  type TimelineEntryRequest,
} from '@vfortin/content-contracts';
import {
  type ArticleDocumentProps,
  LegalDocument,
  Project,
  Slug,
  TimelineEntry,
  reviseProfile,
} from '@vfortin/content-domain';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import request from 'supertest';
import { ContentMcpController } from '@internal/content-adapters-in/lib/http/controllers/content-mcp/content-mcp.controller';
import { ContentMcpTools } from '@internal/content-adapters-in/lib/mcp/content-mcp-tools/content-mcp-tools';
import { contentProblemMapper } from '@internal/content-adapters-in/lib/http/mappers/content-problem/content-problem.mapper';
import { toProjectRevision } from '@internal/content-adapters-in/lib/http/presenters/admin-project/admin-project.presenter';

const FIXTURE: AdminProjectDto = JSON.parse(
  readFileSync(
    new URL(
      '../../../../../../contracts/content/src/lib/testing/admin-project.fixture.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as AdminProjectDto;
const PROFILE: ProfileRevisionRequest = {
  heroIntro: { fr: 'Introduction', en: 'Introduction' },
  aboutStatement: { fr: 'Phrase', en: 'Statement' },
  aboutLead: { fr: 'Chapeau', en: 'Lead' },
  facts: [],
  links: [{ kind: 'github', url: 'https://github.com/example', label: null }],
};
const ENTRY: TimelineEntryRequest = {
  title: { fr: 'Développeur', en: 'Developer' },
  place: { fr: 'Blois', en: 'Blois' },
  description: { fr: 'Interfaces', en: 'Interfaces' },
  start: { year: 2025, month: 2 },
  end: null,
  techs: ['angular'],
};
const DOC: ArticleDocumentProps = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Publisher' }] }],
};

function project(status: 'draft' | 'published' = 'published'): Project {
  return Project.rehydrate({
    ...toProjectRevision(ProjectRevisionRequestSchema.parse(FIXTURE)),
    id: FIXTURE.id,
    slug: Slug.of(FIXTURE.slug),
    status,
    position: 0,
    version: 3,
  });
}

describe('ContentMcpController and ContentMcpTools', (): void => {
  let app: INestApplication<Server>;
  let tools: ContentMcpTools;
  const useCases = {
    listProjects: { execute: vi.fn<ListAdminProjects['execute']>() },
    getProject: { execute: vi.fn<GetAdminProject['execute']>() },
    createProject: { execute: vi.fn<CreateProject['execute']>() },
    reviseProject: { execute: vi.fn<ReviseProject['execute']>() },
    publish: { execute: vi.fn<PublishProject['execute']>() },
    unpublish: { execute: vi.fn<UnpublishProject['execute']>() },
    listTimeline: { execute: vi.fn<ListAdminTimeline['execute']>() },
    getEntry: { execute: vi.fn<GetAdminTimelineEntry['execute']>() },
    createEntry: { execute: vi.fn<CreateTimelineEntry['execute']>() },
    reviseEntry: { execute: vi.fn<ReviseTimelineEntry['execute']>() },
    reorder: { execute: vi.fn<ReorderTimeline['execute']>() },
    deleteEntry: { execute: vi.fn<DeleteTimelineEntry['execute']>() },
    getProfile: { execute: vi.fn<GetAdminProfile['execute']>() },
    reviseProfile: { execute: vi.fn<ReviseProfile['execute']>() },
    getLegal: { execute: vi.fn<GetAdminLegalDocument['execute']>() },
    reviseLegal: { execute: vi.fn<ReviseLegalDocument['execute']>() },
  } as const;

  const rpc = (method: string, params: unknown = {}, token: string = 'full'): request.Test =>
    request(app.getHttpServer())
      .post('/content/mcp')
      .set('authorization', `Bearer ${token}`)
      .set('accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id: 1, method, params });
  const call = (name: string, args: unknown = {}, token: string = 'full'): request.Test =>
    rpc('tools/call', { name, arguments: args }, token);

  beforeAll(async (): Promise<void> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        McpAuthModule.forRoot({
          issuer: 'https://exemple.fr/api/auth',
          resource: 'https://exemple.fr/api/content/mcp',
          jwks: { keys: [] },
        }),
      ],
      controllers: [ContentMcpController],
      providers: [
        ContentMcpTools,
        {
          provide: ManagePublication,
          useValue: {
            status: vi.fn().mockResolvedValue({
              version: 1,
              batching: false,
              pendingChanges: false,
              revision: 0,
              publishedRevision: 0,
            }),
            start: vi.fn(),
            publish: vi.fn(),
          },
        },
        { provide: ListAdminProjects, useValue: useCases.listProjects },
        { provide: GetAdminProject, useValue: useCases.getProject },
        { provide: CreateProject, useValue: useCases.createProject },
        { provide: ReviseProject, useValue: useCases.reviseProject },
        { provide: PublishProject, useValue: useCases.publish },
        { provide: UnpublishProject, useValue: useCases.unpublish },
        { provide: ListAdminTimeline, useValue: useCases.listTimeline },
        { provide: GetAdminTimelineEntry, useValue: useCases.getEntry },
        { provide: CreateTimelineEntry, useValue: useCases.createEntry },
        { provide: ReviseTimelineEntry, useValue: useCases.reviseEntry },
        { provide: ReorderTimeline, useValue: useCases.reorder },
        { provide: DeleteTimelineEntry, useValue: useCases.deleteEntry },
        { provide: GetAdminProfile, useValue: useCases.getProfile },
        { provide: ReviseProfile, useValue: useCases.reviseProfile },
        { provide: GetAdminLegalDocument, useValue: useCases.getLegal },
        { provide: ReviseLegalDocument, useValue: useCases.reviseLegal },
        { provide: PROBLEM_MAPPER, useValue: contentProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    })
      .overrideProvider(MCP_TOKEN_VERIFIER)
      .useValue({
        verify: async (token: string): Promise<McpPrincipal> => ({
          subject: 'owner',
          clientId: 'test-client',
          tokenId: 'test-token',
          scopes:
            token === 'full'
              ? ['content:write', 'content:publish', 'content:delete']
              : token === 'write'
                ? ['content:write']
                : ['content:read'],
        }),
      })
      .compile();
    app = moduleRef.createNestApplication<INestApplication<Server>>();
    tools = moduleRef.get<ContentMcpTools>(ContentMcpTools);
    await app.init();
  });
  afterAll(async (): Promise<void> => {
    await app.close();
  });

  beforeEach((): void => {
    vi.clearAllMocks();
    const aggregate: Project = project();
    const entry: TimelineEntry = TimelineEntry.rehydrate({
      ...TimelineEntry.revisionOf(ENTRY),
      id: 'entry',
      kind: 'experience',
      position: 0,
      version: 2,
    });
    const legal: LegalDocument = LegalDocument.rehydrate({
      kind: 'notice',
      body: LegalDocument.bodyOf({ fr: DOC, en: DOC }),
      version: 4,
      updatedAt: new Date('2026-11-05T09:00:00Z'),
    });
    useCases.listProjects.execute.mockResolvedValue([{ project: aggregate, media: [] }]);
    useCases.getProject.execute.mockResolvedValue({ project: aggregate, media: [] });
    useCases.createProject.execute.mockResolvedValue({
      project: aggregate,
      media: [],
      version: 1,
      revision: null,
    });
    for (const mock of [useCases.reviseProject, useCases.publish, useCases.unpublish])
      mock.execute.mockResolvedValue({ project: aggregate, media: [], version: 5, revision: null });
    for (const mock of [useCases.listTimeline, useCases.reorder, useCases.deleteEntry])
      mock.execute.mockResolvedValue({
        kind: 'experience',
        version: 7,
        entries: [entry],
        revision: 10,
      });
    useCases.getEntry.execute.mockResolvedValue(entry);
    for (const mock of [useCases.createEntry, useCases.reviseEntry])
      mock.execute.mockResolvedValue({ entry, version: 6, revision: 10 });
    useCases.getProfile.execute.mockResolvedValue(reviseProfile(PROFILE, 3));
    useCases.reviseProfile.execute.mockResolvedValue({
      profile: reviseProfile(PROFILE, 4),
      revision: 10,
    });
    useCases.getLegal.execute.mockResolvedValue(legal);
    useCases.reviseLegal.execute.mockResolvedValue({ document: legal, version: 5, revision: 10 });
  });

  it('presents every tool result and passes validated inputs and optimistic versions to use cases', async (): Promise<void> => {
    const cases: [string, Record<string, unknown>, Record<string, unknown>][] = [
      ['list_projects', {}, { totalItems: 1 }],
      ['get_project', { id: FIXTURE.id }, { id: FIXTURE.id, version: 3 }],
      ['create_project', { project: FIXTURE }, { version: 1 }],
      ['revise_project', { id: FIXTURE.id, expectedVersion: 3, revision: FIXTURE }, { version: 5 }],
      ['publish_project', { id: FIXTURE.id, expectedVersion: 3 }, { version: 5 }],
      ['unpublish_project', { id: FIXTURE.id, expectedVersion: 3 }, { version: 5 }],
      ['list_timeline', { kind: 'experience' }, { version: 7, totalItems: 1 }],
      ['get_timeline_entry', { kind: 'experience', id: 'entry' }, { id: 'entry', version: 2 }],
      ['create_timeline_entry', { kind: 'experience', entry: ENTRY }, { version: 6 }],
      [
        'revise_timeline_entry',
        { kind: 'experience', id: 'entry', expectedVersion: 2, entry: ENTRY },
        { version: 6 },
      ],
      [
        'reorder_timeline',
        { kind: 'experience', expectedVersion: 7, ids: ['entry'] },
        { version: 7 },
      ],
      [
        'delete_timeline_entry',
        { kind: 'experience', id: 'entry', expectedVersion: 2 },
        { version: 7 },
      ],
      ['get_profile', {}, { version: 3 }],
      ['revise_profile', { expectedVersion: 3, profile: PROFILE }, { version: 4 }],
      ['get_legal_document', { kind: 'notice' }, { version: 4 }],
      [
        'revise_legal_document',
        { kind: 'notice', expectedVersion: 4, body: { fr: DOC, en: DOC } },
        { version: 5 },
      ],
    ];
    for (const [name, args, expected] of cases) {
      const response: request.Response = await call(name, args);
      expect([name, response.status, response.body.error]).toEqual([name, 200, undefined]);
      expect(response.body.result.isError).not.toBe(true);
      expect(response.body.result.structuredContent).toMatchObject(expected);
      expect(JSON.parse(response.body.result.content[0].text)).toEqual(
        response.body.result.structuredContent,
      );
    }
    expect(useCases.createProject.execute).toHaveBeenCalledWith(
      toProjectRevision(ProjectRevisionRequestSchema.parse(FIXTURE)),
    );
    expect(useCases.reviseProject.execute).toHaveBeenCalledWith(
      FIXTURE.id,
      3,
      toProjectRevision(ProjectRevisionRequestSchema.parse(FIXTURE)),
    );
    expect(useCases.reviseEntry.execute).toHaveBeenCalledWith('experience', 'entry', 2, ENTRY);
    expect(useCases.reorder.execute).toHaveBeenCalledWith('experience', 7, ['entry']);
    expect(useCases.deleteEntry.execute).toHaveBeenCalledWith('experience', 'entry', 2);
    expect(useCases.reviseProfile.execute).toHaveBeenCalledWith(3, PROFILE);
    expect(useCases.reviseLegal.execute).toHaveBeenCalledWith('notice', 4, { fr: DOC, en: DOC });
  });

  it('advertises schemas, handles notifications and reports unknown methods and tools', async (): Promise<void> => {
    const listed: request.Response = await rpc('tools/list');
    expect(listed.body.result.tools).toHaveLength(19);
    const unknownMethod: request.Response = await rpc('no-such-method');
    expect(unknownMethod.body.error.code).toBe(-32601);
    expect((await call('unknown')).body.error.code).toBe(-32602);
    expect(
      (await rpc('tools/call', { name: 'list_projects' })).body.result.structuredContent.totalItems,
    ).toBe(1);
    const notification: request.Response = await request(app.getHttpServer())
      .post('/content/mcp')
      .set('authorization', 'Bearer full')
      .set('accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(notification.status).toBe(202);
    for (const body of [
      null,
      {},
      { method: 'tools/call' },
      { method: 'tools/call', params: null },
      { method: 'tools/call', params: { name: 7 } },
    ]) {
      const malformed: request.Response = await request(app.getHttpServer())
        .post('/content/mcp')
        .set('authorization', 'Bearer full')
        .set('accept', 'application/json, text/event-stream')
        .set('content-type', 'application/json')
        .send(body ?? 'null');
      expect([400, 202]).toContain(malformed.status);
    }
  });

  it('exposes batch state and requires publication consent for batch transitions', async (): Promise<void> => {
    const status: request.Response = await call('get_publication_status');
    expect(status.body.result.structuredContent).toEqual({
      version: 1,
      batching: false,
      pendingChanges: false,
      revision: 0,
      publishedRevision: 0,
    });
    for (const name of ['start_publication_batch', 'publish_publication_batch']) {
      const denied: request.Response = await call(name, { expectedVersion: 1 }, 'write');
      expect(denied.status).toBe(403);
      expect(denied.headers['www-authenticate']).toContain('content:publish');
      const invalid: request.Response = await call(name, { expectedVersion: 0 });
      expect(invalid.body.error.code).toBe(-32602);
    }
  });

  it('validates tool arguments and exposes safe application failures without internal details', async (): Promise<void> => {
    const invalid: request.Response = await call('publish_project', {
      id: FIXTURE.id,
      expectedVersion: 0,
    });
    expect(invalid.body.error).toMatchObject({
      code: -32602,
      data: { errors: [{ field: 'expectedVersion' }] },
    });
    expect(useCases.publish.execute).not.toHaveBeenCalled();
    useCases.getProject.execute.mockRejectedValueOnce(new NotFoundError('Missing.'));
    expect(
      (await call('get_project', { id: 'missing' })).body.result.structuredContent,
    ).toMatchObject({ status: 404, code: 'content.not-found' });
    useCases.publish.execute.mockRejectedValueOnce(new VersionMismatchError('Changed.'));
    expect(
      (await call('publish_project', { id: FIXTURE.id, expectedVersion: 3 })).body.result
        .structuredContent,
    ).toMatchObject({ status: 412 });
    const log: ReturnType<typeof vi.spyOn> = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((): void => undefined);
    try {
      useCases.getProfile.execute.mockRejectedValueOnce(new Error('private-database-detail'));
      const failed: request.Response = await call('get_profile');
      expect(failed.body.result).toMatchObject({
        isError: true,
        structuredContent: { status: 500, code: 'content.internal-error' },
      });
      expect(JSON.stringify(failed.body)).not.toContain('private-database-detail');
    } finally {
      log.mockRestore();
    }
  });

  it('enforces write and publication permissions before execution, including failed lookups', async (): Promise<void> => {
    const args: Record<string, unknown> = { id: FIXTURE.id, expectedVersion: 3, revision: FIXTURE };
    const denied: request.Response = await call('revise_project', args, 'write');
    expect(denied.status).toBe(403);
    expect(denied.headers['www-authenticate']).toContain('content:publish');
    expect(useCases.reviseProject.execute).not.toHaveBeenCalled();
    useCases.getProject.execute.mockResolvedValue({ project: project('draft'), media: [] });
    expect((await call('revise_project', args, 'write')).body.result.isError).not.toBe(true);
    useCases.getProject.execute.mockRejectedValueOnce(new Error('lookup failed'));
    expect((await call('revise_project', args, 'write')).status).toBe(403);
    expect((await call('revise_project', {}, 'read')).status).toBe(403);
    expect((await call('delete_timeline_entry', {}, 'read')).status).toBe(403);
    const malformedId: request.Response = await call('revise_project', { id: 7 }, 'full');
    expect(malformedId.body.error.code).toBe(-32602);
  });

  it('denies write-only edits with predicted future or stale draft versions before mutation', async (): Promise<void> => {
    const draft: Project = project('draft');
    useCases.getProject.execute.mockResolvedValue({ project: draft, media: [] });
    for (const expectedVersion of [draft.version + 1, draft.version - 1]) {
      const denied: request.Response = await call(
        'revise_project',
        {
          id: draft.id,
          expectedVersion,
          revision: FIXTURE,
        },
        'write',
      );
      expect(denied.status).toBe(403);
      expect(denied.headers['www-authenticate']).toContain('content:publish');
    }
    expect(useCases.reviseProject.execute).not.toHaveBeenCalled();
  });

  it('keeps the SDK permission check when invoked without the HTTP scope preflight', async (): Promise<void> => {
    const client: Client = new Client({ name: 'permission-test', version: '1' });
    const server: ReturnType<ContentMcpTools['createServer']> = tools.createServer([
      'content:read',
    ]);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      await expect(
        client.callTool({
          name: 'publish_project',
          arguments: { id: FIXTURE.id, expectedVersion: 3 },
        }),
      ).rejects.toThrow('Insufficient scope');
    } finally {
      await client.close();
      await server.close();
    }
    expect(useCases.publish.execute).not.toHaveBeenCalled();
  });

  it('serves discovery and CORS before authentication and rejects untrusted browser origins', async (): Promise<void> => {
    const metadata: request.Response = await request(app.getHttpServer()).get(
      '/content/mcp/.well-known/oauth-protected-resource',
    );
    expect(metadata.body).toMatchObject({
      resource: 'https://exemple.fr/api/content/mcp',
      authorization_servers: ['https://exemple.fr/api/auth'],
    });
    const challenge: request.Response = await request(app.getHttpServer())
      .post('/content/mcp')
      .set('origin', 'https://exemple.fr')
      .send({});
    expect(challenge.status).toBe(401);
    expect(challenge.headers['access-control-allow-origin']).toBe('https://exemple.fr');
    expect(challenge.headers['access-control-expose-headers']).toContain('WWW-Authenticate');
    expect(challenge.headers['www-authenticate']).toContain('content:read');
    expect((await rpc('tools/list').set('origin', 'null')).status).toBe(403);
    expect((await rpc('tools/list').set('origin', 'https://attacker.example')).status).toBe(403);
    expect((await request(app.getHttpServer()).options('/content/mcp')).status).toBe(204);
    for (const method of ['get', 'delete'] as const) {
      const unsupported: request.Response = await request(app.getHttpServer())
        [method]('/content/mcp')
        .set('authorization', 'Bearer read');
      expect(unsupported.status).toBe(405);
      expect(unsupported.headers['allow']).toBe('POST, OPTIONS');
    }
  });
});
