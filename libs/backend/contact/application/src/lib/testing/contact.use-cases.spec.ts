import type { MailSender } from '@internal/contact-application/lib/ports/contact/contact.ports';
import type { MockInstance } from 'vitest';
import {
  NotFoundError,
  RateLimitedError,
  VersionMismatchError,
} from '@internal/contact-application/lib/errors/application-error';
import { ArchiveContactMessage } from '@internal/contact-application/lib/use-cases/archive-contact-message/archive-contact-message.use-case';
import { DeleteContactMessage } from '@internal/contact-application/lib/use-cases/delete-contact-message/delete-contact-message.use-case';
import { ListContactMessages } from '@internal/contact-application/lib/use-cases/list-contact-messages/list-contact-messages.use-case';
import { MarkContactMessageRead } from '@internal/contact-application/lib/use-cases/mark-contact-message-read/mark-contact-message-read.use-case';
import { DeliverPendingNotifications } from '@internal/contact-application/lib/use-cases/deliver-pending-notifications/deliver-pending-notifications.use-case';
import { PurgeExpiredMessages } from '@internal/contact-application/lib/use-cases/purge-expired-messages/purge-expired-messages.use-case';
import {
  SubmitContactMessage,
  type SubmitContactMessageCommand,
} from '@internal/contact-application/lib/use-cases/submit-contact-message/submit-contact-message.use-case';
import {
  type JobEntry,
  FakeMailer,
  FakeRateLimiter,
  FixedClock,
  InMemoryContactStore,
  SequenceIds,
} from '@internal/contact-application/lib/testing/contact.fakes';

/**
 * Constant command
 * @readonly
 *
 * @description
 * Valid use-case submission fixture with a fixed origin fingerprint for rate-limit assertions.
 *
 * @type {SubmitContactMessageCommand}
 */
const command: SubmitContactMessageCommand = {
  name: 'Camille Martin',
  company: 'Atelier Nord',
  email: 'camille@exemple.fr',
  subject: 'job',
  body: 'Bonjour, nous recrutons un développeur Angular à Tours.',
  locale: 'fr',
  clientKey: 'fingerprint',
};

/**
 * Function setup
 *
 * @description
 * Creates fresh in-memory repositories, fakes and use cases for an isolated application test.
 * @returns {object} Store, limiter, mailer, clock and contact use cases wired to those fakes.
 */
function setup(): {
  store: InMemoryContactStore;
  limiter: FakeRateLimiter;
  mailer: FakeMailer;
  clock: FixedClock;
  submit: SubmitContactMessage;
  deliver: DeliverPendingNotifications;
  purge: PurgeExpiredMessages;
} {
  const store: InMemoryContactStore = new InMemoryContactStore();
  const limiter: FakeRateLimiter = new FakeRateLimiter();
  const mailer: FakeMailer = new FakeMailer();
  const clock: FixedClock = new FixedClock(new Date('2026-11-02T10:00:00Z'));
  return {
    store,
    limiter,
    mailer,
    clock,
    submit: new SubmitContactMessage(store, limiter, clock, new SequenceIds()),
    deliver: new DeliverPendingNotifications(store.jobRepository, mailer, clock),
    purge: new PurgeExpiredMessages(store.messageRepository, limiter, clock),
  };
}

describe('SubmitContactMessage', (): void => {
  it('saves the message and its notification together', async (): Promise<void> => {
    const { store, submit } = setup();
    const { id } = await submit.execute(command);
    expect(store.messages.has(id)).toBe(true);
    expect([...store.jobs.values()].map((e): string => e.job.messageId)).toEqual([id]);
  });

  it('saves nothing if the notification cannot be saved', async (): Promise<void> => {
    const { store, submit } = setup();
    store.failJobInsert = true;
    await expect(submit.execute(command)).rejects.toThrow('insert rejected');
    expect(store.messages.size).toBe(0);
  });

  it('limits to five messages per hour and per origin', async (): Promise<void> => {
    const { submit } = setup();
    for (let i: number = 0; i < 5; i++) await submit.execute(command);
    await expect(submit.execute(command)).rejects.toBeInstanceOf(RateLimitedError);
    await expect(submit.execute({ ...command, clientKey: 'other' })).resolves.toBeDefined();
  });
});

describe('DeliverPendingNotifications', (): void => {
  it('sends the notification, with the sender as reply-to', async (): Promise<void> => {
    const { store, submit, deliver, mailer } = setup();
    const { id } = await submit.execute(command);
    await expect(deliver.execute()).resolves.toEqual({ sent: 1, failed: 0, lost: 0 });
    expect(mailer.sent[0]).toMatchObject({
      messageId: id,
      replyTo: { email: 'camille@exemple.fr' },
      subject: '[Portfolio] Une offre de poste — Camille Martin',
    });
    expect(mailer.sent[0]?.text).toContain('Camille Martin (Atelier Nord)');
    expect([...store.jobs.values()][0]?.job.status).toBe('sent');
    await expect(deliver.execute()).resolves.toEqual({ sent: 0, failed: 0, lost: 0 });
  });

  it('retries later after a failure', async (): Promise<void> => {
    const { store, submit, deliver, mailer, clock } = setup();
    await submit.execute(command);
    mailer.failWith = 'SMTP unavailable';
    await expect(deliver.execute()).resolves.toEqual({ sent: 0, failed: 1, lost: 0 });
    const entry: JobEntry | undefined = [...store.jobs.values()][0];
    expect(entry?.job.snapshot()).toMatchObject({ status: 'pending', attempts: 1 });

    mailer.failWith = null;
    await expect(deliver.execute()).resolves.toEqual({ sent: 0, failed: 0, lost: 0 });
    clock.current = new Date(clock.current.getTime() + 60_000);
    await expect(deliver.execute()).resolves.toEqual({ sent: 1, failed: 0, lost: 0 });
  });
});

describe('DeliverPendingNotifications (edge cases)', (): void => {
  it('records a non-Error rejection as text', async (): Promise<void> => {
    const { store, submit, clock } = setup();
    await submit.execute(command);
    const deliver: DeliverPendingNotifications = new DeliverPendingNotifications(
      store.jobRepository,
      { send: (): Promise<void> => Promise.reject('connection reset') },
      clock,
    );
    await expect(deliver.execute()).resolves.toEqual({ sent: 0, failed: 1, lost: 0 });
    expect([...store.jobs.values()][0]?.job.snapshot().lastError).toBe('connection reset');
  });

  it('does not overwrite a notification taken over by another worker', async (): Promise<void> => {
    const { store, submit, clock } = setup();
    await submit.execute(command);

    // The send outlasts the lease: another worker claims the notification meanwhile.
    const slowMailer: MailSender = {
      send: async (): Promise<void> => {
        await store.jobRepository.claimDue(
          new Date('2026-11-02T11:00:00Z'),
          10,
          new Date('2026-11-02T11:05:00Z'),
        );
      },
    };
    const deliver: DeliverPendingNotifications = new DeliverPendingNotifications(
      store.jobRepository,
      slowMailer,
      clock,
    );
    await expect(deliver.execute()).resolves.toEqual({ sent: 1, failed: 0, lost: 1 });
    expect([...store.jobs.values()][0]?.job.status).toBe('pending');
  });

  it('formats the notification without a company', async (): Promise<void> => {
    const { submit, deliver, mailer } = setup();
    await submit.execute({ ...command, company: null, subject: 'other' });
    await deliver.execute();
    expect(mailer.sent[0]?.text).toContain('De : Camille Martin <camille@exemple.fr>');
    expect(mailer.sent[0]?.subject).toBe('[Portfolio] Autre chose — Camille Martin');
  });
});

describe('PurgeExpiredMessages', (): void => {
  it('deletes messages after three years', async (): Promise<void> => {
    const { store, submit, purge, clock, limiter } = setup();
    await submit.execute(command);
    await expect(purge.execute()).resolves.toEqual({ deleted: 0 });
    clock.current = new Date('2029-11-02T10:00:00Z');
    await expect(purge.execute()).resolves.toEqual({ deleted: 1 });
    expect(store.messages.size).toBe(0);
    expect(limiter.purged).toBe(true);
  });
});

describe('inbox', (): void => {
  it('lists, marks as read, archives with optimistic locking, then deletes', async (): Promise<void> => {
    const { store, submit } = setup();
    const { id } = await submit.execute(command);
    const list: ListContactMessages = new ListContactMessages(store.messageRepository);
    await expect(
      list.execute({ status: 'received', page: 1, pageSize: 500 }),
    ).resolves.toMatchObject({
      total: 1,
    });

    const read: Awaited<ReturnType<MarkContactMessageRead['execute']>> =
      await new MarkContactMessageRead(store.messageRepository).execute(id, 1);
    expect(read).toMatchObject({ version: 2 });
    expect(read.message.status).toBe('read');
    await expect(
      new ArchiveContactMessage(store.messageRepository).execute(id, 1),
    ).rejects.toBeInstanceOf(VersionMismatchError);

    const remove: DeleteContactMessage = new DeleteContactMessage(store.messageRepository);
    await remove.execute(id);
    await expect(remove.execute(id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new ArchiveContactMessage(store.messageRepository).execute(id, 2),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('bounds the page and the page size', async (): Promise<void> => {
    const { store } = setup();
    const list: MockInstance<InMemoryContactStore['messageRepository']['list']> = vi.spyOn(
      store.messageRepository,
      'list',
    );
    await new ListContactMessages(store.messageRepository).execute({
      status: null,
      page: 0,
      pageSize: 500.7,
    });
    expect(list).toHaveBeenCalledWith({ status: null, page: 1, pageSize: 50 });
  });
});
