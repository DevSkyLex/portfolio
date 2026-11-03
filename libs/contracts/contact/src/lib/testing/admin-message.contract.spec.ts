import {
  ContactMessageListQuerySchema,
  ContactMessageListSchema,
} from '@internal/contact-contracts/lib/admin-message.contract';
import list from '@internal/contact-contracts/lib/testing/contact-message-list.fixture.json';

describe('ContactMessageListSchema', (): void => {
  it('accepts the fixture shared by the service and the inbox screen', (): void => {
    expect(ContactMessageListSchema.parse(list).member[0]?.status).toBe('received');
  });

  it('rejects an unknown status', (): void => {
    const broken: typeof list = structuredClone<typeof list>(list);
    broken.member = broken.member.map((message) => ({ ...message, status: 'spam' }));
    expect(ContactMessageListSchema.safeParse(broken).success).toBe(false);
  });
});

describe('ContactMessageListQuerySchema', (): void => {
  it('reads the query string, with defaults', (): void => {
    expect(ContactMessageListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(
      ContactMessageListQuerySchema.parse({ status: 'archived', page: '3', pageSize: '50' }),
    ).toEqual({ status: 'archived', page: 3, pageSize: 50 });
  });

  it.each([{ page: '0' }, { pageSize: '51' }, { page: '1.5' }, { status: 'spam' }])(
    'rejects %o',
    (query): void => {
      expect(ContactMessageListQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});
