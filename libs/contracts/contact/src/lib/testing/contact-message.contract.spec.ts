import {
  type ContactMessageRequest,
  ContactMessageRequestSchema,
} from '@internal/contact-contracts/lib/contact-message.contract';
import fixture from '@internal/contact-contracts/lib/testing/contact-message.fixture.json';

describe('ContactMessageRequestSchema', (): void => {
  it('accepts the fixture shared with the client', (): void => {
    expect(ContactMessageRequestSchema.parse(fixture)).toMatchObject({ subject: 'job' });
  });

  it('trims whitespace before checking the bounds', (): void => {
    const parsed: ContactMessageRequest = ContactMessageRequestSchema.parse({
      ...fixture,
      name: '  Camille  ',
    });
    expect(parsed.name).toBe('Camille');
    expect(ContactMessageRequestSchema.safeParse({ ...fixture, name: '   ' }).success).toBe(false);
  });

  it('reports every invalid field', (): void => {
    const result: ReturnType<typeof ContactMessageRequestSchema.safeParse> =
      ContactMessageRequestSchema.safeParse({
        ...fixture,
        email: 'camille@',
        message: 'Trop court.',
        subject: 'spam',
      });
    expect(result.success).toBe(false);
    const fields: string[] | undefined = result.error?.issues
      .map((issue): string => issue.path.join('.'))
      .sort();
    expect(fields).toEqual(['email', 'message', 'subject']);
  });
});
