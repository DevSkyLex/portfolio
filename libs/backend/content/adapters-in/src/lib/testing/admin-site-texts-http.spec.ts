import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { PROBLEM_MAPPER, ProblemDetailsFilter } from '@vfortin/backend-http';
import {
  GetAdminLegalDocument,
  GetAdminProfile,
  ManagePublication,
  ManualPublicationDisabledError,
  ReviseLegalDocument,
  ReviseProfile,
  VersionMismatchError,
} from '@vfortin/content-application';
import {
  AdminLegalDocumentDtoSchema,
  AdminProfileDtoSchema,
  type LegalDocumentRevisionRequest,
  type ProfileRevisionRequest,
  type PublicationStatusDto,
} from '@vfortin/content-contracts';
import {
  type ArticleDocumentProps,
  DomainError,
  InvalidValueError,
  LegalDocument,
  type Profile,
  reviseProfile,
} from '@vfortin/content-domain';
import { type JWK, SignJWT, exportJWK, generateKeyPair } from 'jose';
import request from 'supertest';
import { AdminPublicationController } from '@internal/content-adapters-in/lib/http/controllers/admin-publication/admin-publication.controller';
import { AdminLegalController } from '@internal/content-adapters-in/lib/http/controllers/admin-legal/admin-legal.controller';
import { AdminProfileController } from '@internal/content-adapters-in/lib/http/controllers/admin-profile/admin-profile.controller';
import { contentProblemMapper } from '@internal/content-adapters-in/lib/http/mappers/content-problem/content-problem.mapper';

/**
 * Constant ISSUER
 *
 * @description
 * Issuer of the test access token.
 */
const ISSUER: string = 'https://exemple.fr/api/auth';

/**
 * Constant PROFILE_BODY
 *
 * @description
 * Valid profile revision body.
 */
const PROFILE_BODY: ProfileRevisionRequest = {
  heroIntro: { fr: 'Designer fictif à Ville-Exemple.', en: 'Fictional designer in Example Town.' },
  aboutStatement: { fr: 'Phrase', en: 'Statement' },
  aboutLead: { fr: 'Chapeau', en: 'Lead' },
  facts: [
    {
      label: { fr: 'Basé à', en: 'Based in' },
      value: { fr: 'Ville-Exemple', en: 'Ville-Exemple' },
    },
  ],
  links: [
    { kind: 'email', url: 'mailto:morgan@example.com', label: null },
    { kind: 'github', url: 'https://example.com/demo/code', label: null },
  ],
};

/**
 * Function doc
 *
 * @description
 * Document of one paragraph.
 *
 * @param {string} text - Paragraph text.
 * @returns {ArticleDocumentProps} Document.
 */
function doc(text: string): ArticleDocumentProps {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

/**
 * Constant LEGAL_BODY
 *
 * @description
 * Valid legal document revision body.
 */
const LEGAL_BODY: LegalDocumentRevisionRequest = {
  body: { fr: doc('Éditeur'), en: doc('Publisher') },
};

/**
 * Function profile
 *
 * @description
 * Builds the profile of the body at the supplied version.
 *
 * @param {number} version - Version.
 * @returns {Profile} Profile.
 */
function profile(version: number): Profile {
  return reviseProfile(PROFILE_BODY, version);
}

/**
 * Function notice
 *
 * @description
 * Builds the legal notice at the supplied version.
 *
 * @param {number} version - Version.
 * @returns {LegalDocument} Document.
 */
function notice(version: number): LegalDocument {
  return LegalDocument.rehydrate({
    kind: 'notice',
    body: LegalDocument.bodyOf(LEGAL_BODY.body),
    updatedAt: new Date('2026-11-04T09:30:00Z'),
    version,
  });
}

describe('AdminProfileController and AdminLegalController', (): void => {
  let app: INestApplication<Server>;
  let token: string;
  const publication = {
    status: vi.fn<ManagePublication['status']>(),
    start: vi.fn<ManagePublication['start']>(),
    publish: vi.fn<ManagePublication['publish']>(),
  } satisfies Pick<ManagePublication, 'status' | 'start' | 'publish'>;
  const state: PublicationStatusDto = {
    version: 4,
    batching: true,
    pendingChanges: true,
    revision: 2,
    publishedRevision: 1,
  };
  const useCases = {
    getProfile: { execute: vi.fn<GetAdminProfile['execute']>() },
    reviseProfile: { execute: vi.fn<ReviseProfile['execute']>() },
    getLegal: { execute: vi.fn<GetAdminLegalDocument['execute']>() },
    reviseLegal: { execute: vi.fn<ReviseLegalDocument['execute']>() },
  } satisfies {
    getProfile: Pick<GetAdminProfile, 'execute'>;
    reviseProfile: Pick<ReviseProfile, 'execute'>;
    getLegal: Pick<GetAdminLegalDocument, 'execute'>;
    reviseLegal: Pick<ReviseLegalDocument, 'execute'>;
  };

  beforeAll(async (): Promise<void> => {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'EdDSA' };
    token = await new SignJWT({ role: 'admin', sid: 'f1' })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1', typ: 'at+jwt' })
      .setSubject('a1')
      .setIssuer(ISSUER)
      .setAudience('portfolio-admin')
      .setIssuedAt()
      .setNotBefore(new Date())
      .setJti('j1')
      .setExpirationTime('5m')
      .sign(privateKey);
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AdminAuthModule.forRoot({ issuer: ISSUER, jwks: { keys: [jwk] } })],
      controllers: [AdminProfileController, AdminLegalController, AdminPublicationController],
      providers: [
        { provide: ManagePublication, useValue: publication },
        { provide: GetAdminProfile, useValue: useCases.getProfile },
        { provide: ReviseProfile, useValue: useCases.reviseProfile },
        { provide: GetAdminLegalDocument, useValue: useCases.getLegal },
        { provide: ReviseLegalDocument, useValue: useCases.reviseLegal },
        { provide: PROBLEM_MAPPER, useValue: contentProblemMapper },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<Server>>();
    await app.init();
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });

  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const server = (): ReturnType<typeof request> => request(app.getHttpServer());
  const admin: (call: request.Test) => request.Test = (call: request.Test): request.Test =>
    call.set('authorization', `Bearer ${token}`);

  it('answers 401 before reading the body of an anonymous call', async (): Promise<void> => {
    const calls: (() => request.Test)[] = [
      (): request.Test => server().get('/content/admin/profile'),
      (): request.Test => server().get('/content/admin/publication'),
      (): request.Test => server().post('/content/admin/publication/start'),
      (): request.Test => server().post('/content/admin/publication/publish'),
      (): request.Test => server().put('/content/admin/profile').send('not json'),
      (): request.Test => server().get('/content/admin/legal/notice'),
      (): request.Test => server().put('/content/admin/legal/cookies').send({ body: 42 }),
    ];
    for (const call of calls) {
      const response: request.Response = await call();
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('auth.unauthorized');
    }
    expect(useCases.reviseProfile.execute).not.toHaveBeenCalled();
    expect(useCases.reviseLegal.execute).not.toHaveBeenCalled();
  });

  it('reads publication status and rejects the retired manual start', async (): Promise<void> => {
    publication.status.mockResolvedValue(state);
    publication.start.mockRejectedValue(new ManualPublicationDisabledError());
    publication.publish.mockRejectedValue(new ManualPublicationDisabledError());
    const loaded: request.Response = await admin(server().get('/content/admin/publication'));
    expect(loaded.status).toBe(200);
    expect(loaded.headers['etag']).toBe('"4"');
    expect(loaded.headers['cache-control']).toBe('no-store');
    expect(loaded.body).toEqual(state);
    const started: request.Response = await admin(
      server().post('/content/admin/publication/start').set('if-match', '"3"'),
    );
    expect(started.status).toBe(410);
    expect(started.body.code).toBe('content.manual-publication-disabled');
    expect(publication.start).toHaveBeenCalledWith(3);
    const published: request.Response = await admin(
      server().post('/content/admin/publication/publish').set('if-match', '"4"'),
    );
    expect(published.status).toBe(410);
    expect(published.body.code).toBe('content.manual-publication-disabled');
    expect(publication.publish).toHaveBeenCalledWith(4);
  });

  it('requires a publication version and reports a stale batch', async (): Promise<void> => {
    expect((await admin(server().post('/content/admin/publication/start'))).status).toBe(428);
    publication.publish.mockRejectedValueOnce(new VersionMismatchError());
    expect(
      (await admin(server().post('/content/admin/publication/publish').set('if-match', '"1"')))
        .status,
    ).toBe(412);
  });

  it('serves the profile with its version as ETag, matching the contract', async (): Promise<void> => {
    useCases.getProfile.execute.mockResolvedValue(profile(3));
    const response: request.Response = await admin(server().get('/content/admin/profile'));
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"3"');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(AdminProfileDtoSchema.parse(response.body)).toEqual({ ...PROFILE_BODY, version: 3 });
  });

  it('revises the profile with If-Match, passing the trimmed draft', async (): Promise<void> => {
    useCases.reviseProfile.execute.mockResolvedValue({ profile: profile(4), revision: 9 });
    const response: request.Response = await admin(
      server()
        .put('/content/admin/profile')
        .set('if-match', '"3"')
        .send({ ...PROFILE_BODY, heroIntro: { fr: '  Développeur ', en: 'Developer ' } }),
    );
    expect(response.status).toBe(200);
    expect(response.headers['etag']).toBe('"4"');
    const [version, draft] = useCases.reviseProfile.execute.mock.calls[0] ?? [];
    expect(version).toBe(3);
    expect(draft?.heroIntro).toEqual({ fr: 'Développeur', en: 'Developer' });
  });

  it('refuses a plain HTTP link (400 with its path) and an unknown legal kind', async (): Promise<void> => {
    const link: request.Response = await admin(
      server()
        .put('/content/admin/profile')
        .set('if-match', '"3"')
        .send({
          ...PROFILE_BODY,
          links: [{ kind: 'website', url: 'http://insecure.example', label: null }],
        }),
    );
    expect(link.status).toBe(400);
    expect(link.body.code).toBe('request.invalid');
    expect(link.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'links.0.url' })]),
    );
    const kind: request.Response = await admin(server().get('/content/admin/legal/cookies'));
    expect(kind.status).toBe(400);
    expect(useCases.reviseProfile.execute).not.toHaveBeenCalled();
    expect(useCases.getLegal.execute).not.toHaveBeenCalled();
  });

  it('answers 422 with field errors for a missing English text and a repeated kind', async (): Promise<void> => {
    useCases.reviseProfile.execute.mockRejectedValueOnce(
      new DomainError('content.profile-incomplete', 'Write both.', ['aboutLead.en']),
    );
    const incomplete: request.Response = await admin(
      server().put('/content/admin/profile').set('if-match', '"3"').send(PROFILE_BODY),
    );
    expect(incomplete.status).toBe(422);
    expect(incomplete.body).toMatchObject({
      code: 'content.profile-incomplete',
      errors: [{ field: 'aboutLead.en', message: 'Write both.' }],
    });
    useCases.reviseProfile.execute.mockRejectedValueOnce(
      new InvalidValueError('links.1.kind', 'only one github link'),
    );
    const repeated: request.Response = await admin(
      server().put('/content/admin/profile').set('if-match', '"3"').send(PROFILE_BODY),
    );
    expect(repeated.status).toBe(422);
    expect(repeated.body.errors).toEqual([
      { field: 'links.1.kind', message: 'links.1.kind: only one github link' },
    ]);
  });

  it('requires If-Match (428) and answers a stale version with 412', async (): Promise<void> => {
    const missing: request.Response = await admin(
      server().put('/content/admin/profile').send(PROFILE_BODY),
    );
    expect(missing.status).toBe(428);
    useCases.reviseLegal.execute.mockRejectedValueOnce(new VersionMismatchError('Changed.'));
    const stale: request.Response = await admin(
      server().put('/content/admin/legal/notice').set('if-match', '"1"').send(LEGAL_BODY),
    );
    expect(stale.status).toBe(412);
    expect(stale.body.code).toBe('content.version-mismatch');
  });

  it('serves and revises a legal document with its ETag, matching the contract', async (): Promise<void> => {
    useCases.getLegal.execute.mockResolvedValue(notice(2));
    const found: request.Response = await admin(server().get('/content/admin/legal/notice'));
    expect(found.status).toBe(200);
    expect(found.headers['etag']).toBe('"2"');
    expect(AdminLegalDocumentDtoSchema.parse(found.body)).toEqual({
      kind: 'notice',
      body: LEGAL_BODY.body,
      updatedAt: '2026-11-04T09:30:00.000Z',
      version: 2,
    });
    expect(useCases.getLegal.execute).toHaveBeenCalledWith('notice');

    useCases.reviseLegal.execute.mockResolvedValue({
      document: notice(2),
      version: 3,
      revision: 8,
    });
    const saved: request.Response = await admin(
      server().put('/content/admin/legal/notice').set('if-match', '"2"').send(LEGAL_BODY),
    );
    expect(saved.status).toBe(200);
    expect(saved.headers['etag']).toBe('"3"');
    expect(saved.body.version).toBe(3);
    expect(useCases.reviseLegal.execute).toHaveBeenCalledWith('notice', 2, LEGAL_BODY.body);
  });

  it('refuses a legal document with a figure (400) and an empty language (422)', async (): Promise<void> => {
    const figure: request.Response = await admin(
      server()
        .put('/content/admin/legal/privacy')
        .set('if-match', '"1"')
        .send({
          body: {
            fr: doc('Texte'),
            en: {
              type: 'doc',
              content: [
                {
                  type: 'figure',
                  attrs: { media: '0b8c7c1e-7a2f-4e0e-9c55-6a1f1c6b2d11', alt: 'x', caption: '' },
                },
              ],
            },
          },
        }),
    );
    expect(figure.status).toBe(400);
    useCases.reviseLegal.execute.mockRejectedValueOnce(
      new DomainError('content.legal-document-incomplete', 'Write both.', ['body.en']),
    );
    const empty: request.Response = await admin(
      server().put('/content/admin/legal/privacy').set('if-match', '"1"').send(LEGAL_BODY),
    );
    expect(empty.status).toBe(422);
    expect(empty.body.errors).toEqual([{ field: 'body.en', message: 'Write both.' }]);
  });
});
