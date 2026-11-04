import {
  ContentSnapshotQuerySchema,
  ContentSnapshotSchema,
} from '@internal/content-contracts/lib/content-snapshot.contract';
import snapshot from '@internal/content-contracts/lib/testing/content-snapshot.fixture.json';

describe('ContentSnapshotSchema', (): void => {
  it('accepts the fixture shared by the service and the site', (): void => {
    expect(ContentSnapshotSchema.parse(snapshot).projects[0]?.slug).toBe('movah');
  });

  it('rejects a malformed tech key', (): void => {
    const broken: typeof snapshot = structuredClone<typeof snapshot>(snapshot);
    broken.projects = broken.projects.map((project) => ({ ...project, techs: ['Vue.js'] }));
    expect(ContentSnapshotSchema.safeParse(broken).success).toBe(false);
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

  it('requires the legal documents', (): void => {
    const older: Partial<typeof snapshot> = structuredClone(snapshot);
    delete older.legal;
    expect(ContentSnapshotSchema.safeParse(older).success).toBe(false);
  });
});
