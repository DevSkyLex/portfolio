import type { ContactNotificationMail } from '@vfortin/contact-application';
import type Mail from 'nodemailer/lib/mailer';
import type { Mock } from 'vitest';
import { NodemailerMailSender } from '@internal/contact-adapters-out/lib/mail/nodemailer-mail/nodemailer-mail.sender';

/**
 * Constant sendMail
 * @readonly
 *
 * @description
 * Mocked Nodemailer transport operation used to inspect outgoing message options.
 */
const sendMail: Mock<(options: Mail.Options) => Promise<Record<string, never>>> = vi
  .fn<(options: Mail.Options) => Promise<Record<string, never>>>()
  .mockResolvedValue({});

/**
 * Constant createTransport
 * @readonly
 *
 * @description
 * Mock transport factory that returns the shared `sendMail` spy.
 */
const createTransport: Mock<(options: unknown) => { sendMail: typeof sendMail }> = vi.fn<
  (options: unknown) => { sendMail: typeof sendMail }
>(() => ({
  sendMail,
}));
vi.mock(
  'nodemailer',
  (): { createTransport: (options: unknown) => { sendMail: typeof sendMail } } => ({
    createTransport: (options: unknown): { sendMail: typeof sendMail } => createTransport(options),
  }),
);

/**
 * Constant mail
 * @readonly
 *
 * @description
 * Notification fixture used to verify reply-to, subject and stable message identifier mapping.
 */
const mail: ContactNotificationMail = {
  messageId: 'm-1',
  replyTo: { name: 'Camille Martin', email: 'camille@exemple.fr' },
  subject: 'Objet',
  text: 'Texte',
};

describe('NodemailerMailSender', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('sends to the owner, with the sender as reply-to and a stable Message-ID', async (): Promise<void> => {
    const sender: NodemailerMailSender = new NodemailerMailSender({
      url: 'smtp://localhost:1025',
      from: 'Portfolio <noreply@valentin-fortin.pro>',
      to: 'morgan@example.com',
    });
    await sender.send(mail);
    await sender.send(mail);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls[0]?.[0]).toMatchObject({
      to: 'morgan@example.com',
      replyTo: { name: 'Camille Martin', address: 'camille@exemple.fr' },
      messageId: '<m-1@valentin-fortin.pro>',
    });
    expect(sendMail.mock.calls[1]?.[0].messageId).toBe('<m-1@valentin-fortin.pro>');
  });

  it('bounds the SMTP timeouts well below the delivery lease', (): void => {
    new NodemailerMailSender({ url: 'smtps://u:p@smtp.example:465', from: 'a@b.c', to: 'd@e.f' });
    expect(createTransport).toHaveBeenCalledWith({
      url: 'smtps://u:p@smtp.example:465',
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  });

  it('only logs with the json: transport, and falls back to localhost for the Message-ID', async (): Promise<void> => {
    const log: Mock<(line: string) => void> = vi.fn<(line: string) => void>();
    const sender: NodemailerMailSender = new NodemailerMailSender(
      { url: 'json:', from: 'Portfolio', to: 'moi@x.fr' },
      log,
    );
    await sender.send(mail);
    expect(createTransport).toHaveBeenCalledWith({ jsonTransport: true });
    expect(sendMail.mock.calls[0]?.[0].messageId).toBe('<m-1@localhost>');
    expect(log).toHaveBeenCalledWith('Notification not sent (json: transport): Objet');
  });

  it('logs nothing by default', async (): Promise<void> => {
    const sender: NodemailerMailSender = new NodemailerMailSender({
      url: 'json:',
      from: 'a@b.c',
      to: 'd@e.f',
    });
    await expect(sender.send(mail)).resolves.toBeUndefined();
  });
});
