import { DomainError, InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import {
  type Profile,
  type ProfileDraft,
  profileLinks,
  reviseProfile,
} from '@internal/content-domain/lib/profile/profile';

/**
 * Constant DRAFT
 *
 * @description
 * Complete bilingual revision with one fact and two links.
 */
const DRAFT: ProfileDraft = {
  heroIntro: { fr: '  Développeur à Blois.  ', en: 'Developer in Blois.' },
  aboutStatement: { fr: 'J’aime le code.', en: 'I like code.' },
  aboutLead: { fr: 'Après un BTS.', en: 'After a BTS.' },
  facts: [{ label: { fr: 'Basé à', en: 'Based in' }, value: { fr: 'Blois', en: 'Blois' } }],
  links: [
    { kind: 'email', url: ' mailto:contact@valentin-fortin.pro ', label: '  ' },
    { kind: 'github', url: 'https://github.com/DevSkyLex', label: null },
  ],
};

/**
 * Function failure
 *
 * @description
 * Runs a revision expected to fail and returns its error.
 *
 * @param {ProfileDraft} draft - Revision to validate.
 * @returns {unknown} Thrown error.
 */
function failure(draft: ProfileDraft): unknown {
  try {
    reviseProfile(draft, 1);
  } catch (error) {
    return error;
  }
  throw new Error('the revision was accepted');
}

describe('reviseProfile', (): void => {
  it('trims the texts and the links and keeps the stored version', (): void => {
    const profile: Profile = reviseProfile(DRAFT, 3);
    expect(profile.heroIntro.fr).toBe('Développeur à Blois.');
    expect(profile.facts[0]?.value.en).toBe('Blois');
    expect(profile.links.map((link) => link.toProps())).toEqual([
      { kind: 'email', url: 'mailto:contact@valentin-fortin.pro', label: null },
      { kind: 'github', url: 'https://github.com/DevSkyLex', label: null },
    ]);
    expect(profile.version).toBe(3);
  });

  it('accepts the exact bounds and empty lists', (): void => {
    const profile: Profile = reviseProfile(
      {
        ...DRAFT,
        heroIntro: { fr: 'x'.repeat(240), en: 'y'.repeat(240) },
        aboutLead: { fr: 'x'.repeat(600), en: 'y'.repeat(600) },
        facts: Array.from({ length: 8 }, () => ({
          label: { fr: 'x'.repeat(40), en: 'y' },
          value: { fr: 'x'.repeat(120), en: 'y' },
        })),
        links: [],
      },
      1,
    );
    expect(profile.facts).toHaveLength(8);
    expect(profile.links).toEqual([]);
  });

  it.each([
    ['a blank French text', { aboutStatement: { fr: '  ', en: 'x' } }, 'aboutStatement.fr'],
    ['an English text too long', { heroIntro: { fr: 'x', en: 'y'.repeat(241) } }, 'heroIntro.en'],
    [
      'a fact label too long',
      { facts: [{ label: { fr: 'x'.repeat(41), en: 'x' }, value: { fr: 'v', en: 'v' } }] },
      'facts.0.label.fr',
    ],
    [
      'nine facts',
      {
        facts: Array.from({ length: 9 }, () => ({
          label: { fr: 'l', en: 'l' },
          value: { fr: 'v', en: 'v' },
        })),
      },
      'facts',
    ],
    [
      'nine links',
      {
        links: Array.from({ length: 9 }, (_: unknown, i: number) => ({
          kind: 'website',
          url: `https://site${i}.example`,
          label: null,
        })),
      },
      'links',
    ],
    [
      'two GitHub links',
      {
        links: [
          { kind: 'github', url: 'https://github.com/a', label: null },
          { kind: 'github', url: 'https://github.com/b', label: null },
        ],
      },
      'links.1.kind',
    ],
    [
      'the same address twice',
      {
        links: [
          { kind: 'website', url: 'https://a.example', label: 'A' },
          { kind: 'website', url: 'https://a.example', label: 'B' },
        ],
      },
      'links.1.url',
    ],
  ])(
    'rejects %s under its contract path',
    (_label: string, change: Partial<ProfileDraft>, path: string): void => {
      const error: unknown = failure({ ...DRAFT, ...change });
      expect(error).toBeInstanceOf(InvalidValueError);
      expect((error as InvalidValueError).details).toEqual([path]);
    },
  );

  it('reports every text missing in English as an incomplete profile', (): void => {
    const error: unknown = failure({
      ...DRAFT,
      aboutLead: { fr: 'Lead' },
      facts: [{ label: { fr: 'Basé à', en: ' ' }, value: { fr: 'Blois', en: 'Blois' } }],
    });
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('content.profile-incomplete');
    expect((error as DomainError).details).toEqual(['aboutLead.en', 'facts.0.label.en']);
  });
});

describe('profileLinks', (): void => {
  it('keeps several websites in order', (): void => {
    expect(
      profileLinks([
        { kind: 'website', url: 'https://a.example', label: 'A' },
        { kind: 'website', url: 'https://b.example/path?x=1', label: 'B' },
      ]).map((link) => link.label),
    ).toEqual(['A', 'B']);
  });
});
