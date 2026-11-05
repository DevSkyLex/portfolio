import { PublicationStatusSchema } from '@internal/content-contracts/lib/admin-publication.contract';

import STATUS from './admin-publication.fixture.json';
describe('Publication status contract', (): void => {
  it('accepts idle and pending batch states', (): void => {
    expect(PublicationStatusSchema.parse(STATUS)).toEqual(STATUS);
    expect(
      PublicationStatusSchema.safeParse({
        ...STATUS,
        version: 4,
        batching: true,
        pendingChanges: true,
        revision: 2,
        publishedRevision: 1,
      }).success,
    ).toBe(true);
  });
  it.each(['version', 'revision', 'publishedRevision'])(
    'rejects invalid %s bounds and fractions',
    (field: string): void => {
      expect(PublicationStatusSchema.safeParse({ ...STATUS, [field]: -1 }).success).toBe(false);
      expect(PublicationStatusSchema.safeParse({ ...STATUS, [field]: 1.5 }).success).toBe(false);
    },
  );
  it('requires state booleans, positive version and known fields', (): void => {
    expect(PublicationStatusSchema.safeParse({ ...STATUS, version: 0 }).success).toBe(false);
    expect(PublicationStatusSchema.safeParse({ ...STATUS, batching: 'false' }).success).toBe(false);
    expect(PublicationStatusSchema.safeParse({ ...STATUS, unknown: true }).success).toBe(false);
    expect(PublicationStatusSchema.safeParse({ version: 1 }).success).toBe(false);
  });
});
