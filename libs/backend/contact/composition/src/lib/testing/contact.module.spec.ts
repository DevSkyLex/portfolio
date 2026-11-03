import type { Server as NodeHttpServer } from 'node:http';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminAuthModule } from '@vfortin/backend-auth';
import { ObservabilityModule } from '@vfortin/backend-observability';
import { migrateContactDatabase } from '@vfortin/contact-adapters-out';
import {
  type ContactNotificationMail,
  DeliverPendingNotifications,
  type MailSender,
} from '@vfortin/contact-application';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { ContactModule } from '@internal/contact-composition/lib/contact.module';

/**
 * Constant MIGRATIONS
 * @readonly
 *
 * @description
 * Absolute path to the contact service migrations used to prepare the integration database.
 */
const MIGRATIONS: string = fileURLToPath(
  new URL('../../../../../../../apps/contact-service/migrations', import.meta.url),
);

/**
 * Constant valid
 * @readonly
 *
 * @description
 * Valid public submission payload sent through the assembled contact HTTP module.
 */
const valid = {
  name: 'Camille Martin',
  company: 'Atelier Nord',
  email: 'camille@exemple.fr',
  subject: 'job',
  message: 'Bonjour, nous recrutons un développeur Angular à Tours.',
  locale: 'fr',
  website: '',
} as const;

/**
 * Class RecordingMailer
 * @class RecordingMailer
 *
 * @description
 * Test mail adapter that records notification payloads without sending them.
 */
class RecordingMailer implements MailSender {
  // #region Properties
  /**
   * Property sent
   * @readonly
   *
   * @description
   * Notifications accepted by the fake mail transport.
   *
   * @type {ContactNotificationMail[]}
   */
  public readonly sent: ContactNotificationMail[] = [];
  // #endregion

  // #region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Appends the outgoing notification to the collection asserted by the integration test.
   * @param {ContactNotificationMail} mail - Notification payload to record.
   * @returns {Promise<void>} Completion after recording.
   */
  public async send(mail: ContactNotificationMail): Promise<void> {
    this.sent.push(mail);
  }
  // #endregion
}

/** Wiring test: the module starts with its real implementations on a PGlite database. */
describe('ContactModule', (): void => {
  let app: INestApplication<NodeHttpServer>;
  let mailer: RecordingMailer;

  beforeEach(async (): Promise<void> => {
    mailer = new RecordingMailer();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({ service: 'contact-test', level: 'silent', pretty: false }),
        // Admin routes not tested here: no key accepted.
        AdminAuthModule.forRoot({ issuer: 'https://exemple.fr/api/auth', jwks: { keys: [] } }),
        ContactModule.register({
          databaseUrl: 'pglite:memory',
          mail: { url: 'json:', from: 'Portfolio <noreply@exemple.fr>', to: 'moi@exemple.fr' },
          clientKeySecret: 'test-secret',
          workers: false,
          mailSender: mailer,
          prepare: (database): Promise<void> => migrateContactDatabase(database, MIGRATIONS),
        }),
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<NodeHttpServer>>();
    app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
    await app.init();
  });

  afterEach(async (): Promise<void> => {
    await app.close();
  });

  const post: (body: object) => request.Test = (body: object): request.Test =>
    request(app.getHttpServer()).post('/api/contact/messages').send(body);

  it('saves the message, then the worker sends the notification', async (): Promise<void> => {
    const response: request.Response = await post(valid);
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ status: 'received' });

    await expect(
      app.get<DeliverPendingNotifications>(DeliverPendingNotifications).execute(),
    ).resolves.toEqual({
      sent: 1,
      failed: 0,
      lost: 0,
    });
    expect(mailer.sent[0]).toMatchObject({
      replyTo: { name: 'Camille Martin', email: 'camille@exemple.fr' },
      subject: '[Portfolio] Une offre de poste — Camille Martin',
    });
  });

  it('rejects an invalid format, field by field, as problem+json', async (): Promise<void> => {
    const response: request.Response = await post({
      ...valid,
      email: 'camille@',
      message: 'Court.',
    });
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body.code).toBe('request.invalid');
    expect(response.body.errors.map((e: { field: string }): string => e.field).sort()).toEqual([
      'email',
      'message',
    ]);
  });

  it('silently ignores a bot message (honeypot field filled in)', async (): Promise<void> => {
    const response: request.Response = await post({ ...valid, website: 'https://spam.example' });
    expect(response.status).toBe(202);
    await expect(
      app.get<DeliverPendingNotifications>(DeliverPendingNotifications).execute(),
    ).resolves.toEqual({
      sent: 0,
      failed: 0,
      lost: 0,
    });
  });

  it('limits the number of messages per origin', async (): Promise<void> => {
    for (let i: number = 0; i < 5; i++) {
      expect((await post(valid)).status).toBe(202);
    }
    const response: request.Response = await post(valid);
    expect(response.status).toBe(429);
    expect(response.body.code).toBe('contact.rate-limited');
  });

  it('exposes the database readiness', async (): Promise<void> => {
    const response: request.Response = await request(app.getHttpServer()).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.info.database.status).toBe('up');
  });
});
