import type { NotificationJobProps } from '@internal/contact-domain/lib/notification/notification-job';
import {
  MAX_ATTEMPTS,
  NotificationJob,
  retryDelay,
} from '@internal/contact-domain/lib/notification/notification-job';

/**
 * Constant now
 * @readonly
 *
 * @description
 * Fixed instant used to make notification due dates and delivery outcomes deterministic.
 *
 * @type {Date}
 */
const now: Date = new Date('2026-11-02T10:00:00Z');

describe('NotificationJob', (): void => {
  it('is due as soon as it is created', (): void => {
    const job: NotificationJobProps = NotificationJob.forMessage('j1', 'm1', now).snapshot();
    expect(job).toMatchObject({ status: 'pending', attempts: 0, nextAttemptAt: now });
  });

  it('spaces out attempts after a failure', (): void => {
    const job: NotificationJobProps = NotificationJob.forMessage('j1', 'm1', now)
      .failed('SMTP 421', now)
      .snapshot();
    expect(job).toMatchObject({ status: 'pending', attempts: 1, lastError: 'SMTP 421' });
    expect(job.nextAttemptAt.getTime() - now.getTime()).toBe(60_000);
  });

  it(`gives up after ${MAX_ATTEMPTS} failures`, (): void => {
    let job: NotificationJob = NotificationJob.forMessage('j1', 'm1', now);
    for (let i: number = 0; i < MAX_ATTEMPTS; i++) {
      job = job.failed('rejected', now);
    }
    expect(job.status).toBe('failed');
  });

  it('caps the delay at six hours', (): void => {
    expect(retryDelay(3)).toBe(4 * 60_000);
    expect(retryDelay(20)).toBe(6 * 60 * 60_000);
  });

  it('records the send date', (): void => {
    const job: NotificationJobProps = NotificationJob.forMessage('j1', 'm1', now)
      .succeeded(now)
      .snapshot();
    expect(job).toMatchObject({ status: 'sent', attempts: 1, sentAt: now });
  });

  it('rehydrates a stored job and refuses an invalid attempt count', (): void => {
    const stored: NotificationJobProps = NotificationJob.forMessage('j1', 'm1', now)
      .failed('x', now)
      .snapshot();
    const job: NotificationJob = NotificationJob.rehydrate(stored);
    expect([job.id, job.messageId, job.status]).toEqual(['j1', 'm1', 'pending']);
    expect((): NotificationJob => NotificationJob.rehydrate({ ...stored, attempts: -1 })).toThrow(
      /attempts/,
    );
    expect((): NotificationJob => NotificationJob.rehydrate({ ...stored, attempts: 1.5 })).toThrow(
      /attempts/,
    );
  });

  it('keeps only the start of a long error', (): void => {
    const job: NotificationJob = NotificationJob.forMessage('j1', 'm1', now).failed(
      'x'.repeat(800),
      now,
    );
    expect(job.snapshot().lastError).toHaveLength(500);
    expect(retryDelay(0)).toBe(60_000);
  });
});
