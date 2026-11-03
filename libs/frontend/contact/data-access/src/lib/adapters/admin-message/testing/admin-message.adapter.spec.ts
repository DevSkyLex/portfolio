import type { AdminMessage } from '@internal/contact-web-data-access/lib/models/admin-message/admin-message.type';
import { toAdminMessage } from '@internal/contact-web-data-access/lib/adapters/admin-message/admin-message.adapter';
import type { ContactMessageDto } from '@vfortin/contact-contracts';

describe('toAdminMessage', () => {
  it('publishes only view fields and retains the observed write version', () => {
    const wire: ContactMessageDto & { futureWireField: string } = {
      id: 'one',
      name: 'Test',
      company: null,
      email: 'test@example.test',
      subject: 'project',
      message: 'A project request',
      locale: 'fr',
      status: 'received',
      receivedAt: '2026-01-01T00:00:00Z',
      purgeAt: '2027-01-01T00:00:00Z',
      version: 4,
      futureWireField: 'not-a-view-field',
    };
    const view: AdminMessage = toAdminMessage(wire);
    expect(view).not.toBe(wire);
    expect(view.version).toBe(4);
    expect(view).not.toHaveProperty('futureWireField');
  });
});
