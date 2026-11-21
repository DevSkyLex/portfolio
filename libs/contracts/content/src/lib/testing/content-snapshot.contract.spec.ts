import {
  ContentSnapshotQuerySchema,
  ContentSnapshotSchema,
} from '@internal/content-contracts/lib/content-snapshot.contract';
import snapshot from '@internal/content-contracts/lib/testing/content-snapshot.fixture.json';

describe('ContentSnapshotSchema', (): void => {
  it('accepts the fixture shared by the service and the site', (): void => {
    expect(ContentSnapshotSchema.parse(snapshot).projects[0]?.slug).toBe('library-trails');
  });

  it('rejects a malformed tech key', (): void => {
    const broken: typeof snapshot = structuredClone<typeof snapshot>(snapshot);
    broken.projects = broken.projects.map((project) => ({ ...project, techs: ['Vue.js'] }));
    expect(ContentSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it('reads the FAQ in its order and rejects an empty answer', (): void => {
    expect(ContentSnapshotSchema.parse(snapshot).faq.map((e): string => e.id)).toEqual([
      'availability',
      'contact',
    ]);
    const broken: typeof snapshot = structuredClone<typeof snapshot>(snapshot);
    broken.faq = broken.faq.map((entry) => ({ ...entry, answer: '' }));
    expect(ContentSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it('reads the maintenance state and rejects a message over 500 characters', (): void => {
    const on: typeof snapshot = structuredClone<typeof snapshot>(snapshot);
    on.maintenance = { enabled: true, message: 'Retour à 14 h.' };
    expect(ContentSnapshotSchema.parse(on).maintenance).toEqual(on.maintenance);
    on.maintenance = { enabled: true, message: 'a'.repeat(501) };
    expect(ContentSnapshotSchema.safeParse(on).success).toBe(false);
  });

  it('rejects an unpublished locale', (): void => {
    expect(ContentSnapshotQuerySchema.safeParse({ locale: 'de' }).success).toBe(false);
  });
});

describe('ContentSnapshotSchema backward compatibility', (): void => {
  it('reads a snapshot written before the public links as having none', (): void => {
    const older: Record<string, unknown> = structuredClone(snapshot);
    const profile: Partial<typeof snapshot.profile> = structuredClone(snapshot.profile);
    delete profile.links;
    older['profile'] = profile;
    expect(ContentSnapshotSchema.parse(older).profile.links).toEqual([]);
  });

  it('reads a snapshot written before the FAQ as having none', (): void => {
    const older: Partial<typeof snapshot> = structuredClone(snapshot);
    delete older.faq;
    expect(ContentSnapshotSchema.parse(older).faq).toEqual([]);
  });

  it('reads a snapshot written before the maintenance mode as disabled', (): void => {
    const older: Partial<typeof snapshot> = structuredClone(snapshot);
    delete older.maintenance;
    expect(ContentSnapshotSchema.parse(older).maintenance).toEqual({ enabled: false, message: '' });
  });

  it('requires the legal documents', (): void => {
    const older: Partial<typeof snapshot> = structuredClone(snapshot);
    delete older.legal;
    expect(ContentSnapshotSchema.safeParse(older).success).toBe(false);
  });
});
