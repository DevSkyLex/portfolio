import { TECH_ALIASES } from '@internal/content-web-ui/lib/tech/constants/tech-aliases.constants';
import { TECH_LOGOS } from '@internal/content-web-ui/lib/tech/constants/tech-logos.constants';
import { TECHS } from '@internal/content-web-ui/lib/tech/constants/techs.constants';
import { techKey } from '@internal/content-web-ui/lib/tech/utils/tech-key/tech-key.utils';

/**
 * Constant KEY
 *
 * @description
 * Kebab-case format the content contracts accept for a stored technology key.
 *
 * @type {RegExp}
 */
const KEY: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('techKey', (): void => {
  it('trims, lower-cases and maps aliases to canonical keys', (): void => {
    expect(techKey('  PostgreSQL ')).toBe('postgresql');
    expect(techKey('postgres')).toBe('postgresql');
    expect(techKey('Node.js')).toBe('nodejs');
    expect(techKey('C#')).toBe('csharp');
    expect(techKey('k8s')).toBe('kubernetes');
  });

  it('keeps any other value as typed, lower-cased', (): void => {
    expect(techKey('Cobol')).toBe('cobol');
  });
});

describe('TECHS', (): void => {
  it('uses keys the content contracts accept', (): void => {
    expect(Object.keys(TECHS).filter((key: string): boolean => !KEY.test(key))).toEqual([]);
  });
});

describe('TECH_ALIASES', (): void => {
  it('points every alias at a catalogue key, never at another alias', (): void => {
    const broken: string[] = Object.entries(TECH_ALIASES)
      .filter(([alias, key]): boolean => !(key in TECHS) || alias in TECHS)
      .map(([alias]): string => alias);
    expect(broken).toEqual([]);
  });
});

describe('TECH_LOGOS', (): void => {
  it('draws logos only for catalogue keys, without the pack title', (): void => {
    const broken: string[] = Object.entries(TECH_LOGOS)
      .filter(
        ([key, svg]): boolean =>
          !(key in TECHS) || !svg.startsWith('<svg') || svg.includes('<title>'),
      )
      .map(([key]): string => key);
    expect(broken).toEqual([]);
    expect(Object.keys(TECH_LOGOS)).toContain('postgresql');
  });
});
