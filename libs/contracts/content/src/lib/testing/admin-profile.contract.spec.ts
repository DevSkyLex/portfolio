import {
  AdminProfileDtoSchema,
  PROFILE_LIMITS,
  type ProfileRevisionRequest,
  ProfileLinkDtoSchema,
  ProfileRevisionRequestSchema,
} from '@internal/content-contracts/lib/admin-profile.contract';
import profile from '@internal/content-contracts/lib/testing/admin-profile.fixture.json';

/**
 * Function requestOf
 *
 * @description
 * Keeps the editable fields of the administrator profile.
 *
 * @param {typeof profile} dto - Profile of the fixture.
 * @returns {Record<string, unknown>} Request payload.
 */
function requestOf(dto: typeof profile): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(dto).filter(([key]: [string, unknown]): boolean => key !== 'version'),
  );
}

/**
 * Function issues
 *
 * @description
 * Paths of the validation issues of a request.
 *
 * @param {unknown} value - Candidate request.
 * @returns {string[]} Dotted issue paths.
 */
function issues(value: unknown): string[] {
  const result: ReturnType<typeof ProfileRevisionRequestSchema.safeParse> =
    ProfileRevisionRequestSchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((issue: { path: PropertyKey[] }): string => issue.path.join('.'));
}

describe('AdminProfileDtoSchema', (): void => {
  it('accepts the fixture shared by the service and the admin screen', (): void => {
    expect(AdminProfileDtoSchema.parse(profile).links.map((link) => link.kind)).toEqual([
      'email',
      'github',
      'linkedin',
      'website',
    ]);
    expect(AdminProfileDtoSchema.safeParse({ ...profile, version: 0 }).success).toBe(false);
  });
});

describe('ProfileRevisionRequestSchema', (): void => {
  it('accepts the request built from the fixture and trims texts and links', (): void => {
    const parsed: ProfileRevisionRequest = ProfileRevisionRequestSchema.parse({
      ...requestOf(profile),
      heroIntro: { fr: '  Intro  ' },
      links: [{ kind: 'malt', url: ' https://www.malt.fr/profile/x ', label: ' Malt ' }],
    });
    expect(parsed.heroIntro).toEqual({ fr: 'Intro' });
    expect(parsed.links).toEqual([
      { kind: 'malt', url: 'https://www.malt.fr/profile/x', label: 'Malt' },
    ]);
  });

  it('accepts the exact bounds', (): void => {
    expect(
      issues({
        ...requestOf(profile),
        heroIntro: { fr: 'x'.repeat(PROFILE_LIMITS.heroIntro), en: 'y'.repeat(240) },
        aboutStatement: { fr: 'x'.repeat(PROFILE_LIMITS.aboutStatement) },
        aboutLead: { fr: 'x'.repeat(PROFILE_LIMITS.aboutLead) },
        facts: Array.from({ length: PROFILE_LIMITS.facts }, () => ({
          label: { fr: 'x'.repeat(PROFILE_LIMITS.factLabel) },
          value: { fr: 'x'.repeat(PROFILE_LIMITS.factValue) },
        })),
        links: Array.from({ length: PROFILE_LIMITS.links }, (_: unknown, i: number) => ({
          kind: 'website',
          url: `https://s${i}.example/${'x'.repeat(PROFILE_LIMITS.linkUrl - 24)}`,
          label: 'x'.repeat(PROFILE_LIMITS.linkLabel),
        })),
      }),
    ).toEqual([]);
  });

  it.each([
    ['an empty French text', { aboutLead: { fr: '  ' } }, 'aboutLead.fr'],
    [
      'a statement over 280 characters',
      { aboutStatement: { fr: 'x'.repeat(281) } },
      'aboutStatement.fr',
    ],
    [
      'nine facts',
      { facts: Array.from({ length: 9 }, () => ({ label: { fr: 'l' }, value: { fr: 'v' } })) },
      'facts',
    ],
    [
      'a fact value over 120 characters',
      { facts: [{ label: { fr: 'l' }, value: { fr: 'v'.repeat(121) } }] },
      'facts.0.value.fr',
    ],
    [
      'an unknown link kind',
      { links: [{ kind: 'twitter', url: 'https://x.com/a', label: null }] },
      'links.0.kind',
    ],
    [
      'an e-mail without mailto:',
      { links: [{ kind: 'email', url: 'morgan@example.com', label: null }] },
      'links.0.url',
    ],
    [
      'a plain HTTP profile',
      { links: [{ kind: 'github', url: 'http://github.com/a', label: null }] },
      'links.0.url',
    ],
    [
      'a script address',
      { links: [{ kind: 'website', url: 'javascript:alert(1)', label: null }] },
      'links.0.url',
    ],
    [
      'a label over 40 characters',
      { links: [{ kind: 'website', url: 'https://a.example', label: 'x'.repeat(41) }] },
      'links.0.label',
    ],
  ])(
    'rejects %s under its path',
    (_label: string, change: Record<string, unknown>, path: string): void => {
      expect(issues({ ...requestOf(profile), ...change })).toContain(path);
    },
  );
});

describe('ProfileLinkDtoSchema', (): void => {
  it('requires a label key, null meaning the default name', (): void => {
    expect(
      ProfileLinkDtoSchema.safeParse({ kind: 'github', url: 'https://github.com/a' }).success,
    ).toBe(false);
  });
});
