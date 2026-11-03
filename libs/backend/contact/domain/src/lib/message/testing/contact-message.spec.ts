import {
  ContactMessage,
  type ReceiveContactMessage,
  type ContactMessageProps,
} from '@internal/contact-domain/lib/message/contact-message';

/**
 * Constant valid
 * @readonly
 *
 * @description
 * Valid submission fixture with surrounding whitespace and an empty company to exercise normalization.
 *
 * @type {ReceiveContactMessage}
 */
const valid: ReceiveContactMessage = {
  id: 'm1',
  name: '  Camille Martin ',
  company: '  ',
  email: 'camille@exemple.fr',
  subject: 'project',
  body: 'Bonjour, je cherche un développeur pour une application.',
  locale: 'fr',
  receivedAt: new Date('2026-11-02T10:00:00Z'),
};

describe('ContactMessage', (): void => {
  it('trims the fields and sets deletion three years after receipt', (): void => {
    const message: ContactMessageProps = ContactMessage.receive(valid).snapshot();
    expect(message.name).toBe('Camille Martin');
    expect(message.company).toBeNull();
    expect(message.status).toBe('received');
    expect(message.purgeAt.toISOString()).toBe('2029-11-02T10:00:00.000Z');
  });

  it.each([
    ['name', { name: ' ' }],
    ['email', { email: 'camille@' }],
    ['body', { body: 'Trop court.' }],
    ['body', { body: 'x'.repeat(2001) }],
    ['company', { company: 'x'.repeat(121) }],
    ['subject', { subject: 'spam' as never }],
  ])('rejects an invalid %s field', (field, override): void => {
    expect((): ContactMessage => ContactMessage.receive({ ...valid, ...override })).toThrow(
      expect.objectContaining({ details: [field] }),
    );
  });

  it('expires at its deletion date', (): void => {
    const message: ContactMessage = ContactMessage.receive(valid);
    expect(message.isExpired(new Date('2029-11-02T09:59:59Z'))).toBe(false);
    expect(message.isExpired(new Date('2029-11-02T10:00:00Z'))).toBe(true);
  });

  it('is read once, archived from any status, and keeps its version', (): void => {
    const received: ContactMessage = ContactMessage.receive(valid);
    const read: ContactMessage = received.markRead();
    expect(read.status).toBe('read');
    expect(read.markRead()).toBe(read);
    const archived: ContactMessage = read.archive();
    expect(archived.status).toBe('archived');
    expect(archived.markRead()).toBe(archived);
    expect([archived.id, archived.version]).toEqual(['m1', 1]);
    expect(received.status).toBe('received');
  });

  it('rehydrates a stored message unchanged', (): void => {
    const stored: ContactMessageProps = {
      ...ContactMessage.receive(valid).snapshot(),
      status: 'read' as const,
      version: 3,
    };
    expect(ContactMessage.rehydrate(stored).snapshot()).toEqual(stored);
  });

  it('keeps a company name once trimmed', (): void => {
    expect(ContactMessage.receive({ ...valid, company: ' Atelier ' }).snapshot().company).toBe(
      'Atelier',
    );

    // @ts-expect-error -- Exercise normalization of an explicitly undefined optional field at runtime.
    expect(ContactMessage.receive({ ...valid, company: undefined }).snapshot().company).toBeNull();
  });
});
