import { InvalidValueError } from '@internal/content-domain/lib/errors/domain-error';
import { ProfileLink } from '@internal/content-domain/lib/values/profile-link/profile-link';

describe('ProfileLink', (): void => {
  it('trims the address and the label, a blank label meaning the default', (): void => {
    expect(
      ProfileLink.of('links.0', {
        kind: 'malt',
        url: ' https://www.malt.fr/profile/x ',
        label: ' Malt ',
      }).toProps(),
    ).toEqual({ kind: 'malt', url: 'https://www.malt.fr/profile/x', label: 'Malt' });
    expect(
      ProfileLink.of('links.0', { kind: 'linkedin', url: 'https://linkedin.com/in/x', label: '' })
        .label,
    ).toBeNull();
  });

  it.each([
    ['an unknown kind', { kind: 'twitter', url: 'https://x.com/a', label: null }, 'links.2.kind'],
    ['an empty address', { kind: 'website', url: '  ', label: null }, 'links.2.url'],
    [
      'an address too long',
      { kind: 'website', url: `https://a.example/${'x'.repeat(300)}`, label: null },
      'links.2.url',
    ],
    ['an e-mail without mailto:', { kind: 'email', url: 'a@b.fr', label: null }, 'links.2.url'],
    ['a plain HTTP page', { kind: 'website', url: 'http://a.example', label: null }, 'links.2.url'],
    [
      'a script address',
      { kind: 'github', url: 'javascript:alert(1)', label: null },
      'links.2.url',
    ],
    ['a mailto: profile', { kind: 'github', url: 'mailto:a@b.fr', label: null }, 'links.2.url'],
    [
      'a label too long',
      { kind: 'website', url: 'https://a.example', label: 'x'.repeat(41) },
      'links.2.label',
    ],
  ])(
    'rejects %s',
    (
      _label: string,
      props: { kind: string; url: string; label: string | null },
      path: string,
    ): void => {
      expect((): ProfileLink => ProfileLink.of('links.2', props)).toThrow(InvalidValueError);
      try {
        ProfileLink.of('links.2', props);
      } catch (error) {
        expect((error as InvalidValueError).details).toEqual([path]);
      }
    },
  );
});
