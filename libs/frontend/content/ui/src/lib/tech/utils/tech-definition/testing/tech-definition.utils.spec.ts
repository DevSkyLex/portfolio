import { TECHS } from '@internal/content-web-ui/lib/tech/constants/techs.constants';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';

describe('techDefinition', (): void => {
  it('returns the catalogue entry, its logo without the pack title', (): void => {
    expect(techDefinition('angular')).toBe(TECHS['angular']);
    expect(techDefinition('angular').label).toBe('Angular');
    expect(techDefinition('angular').icon).not.toContain('<title>');
  });

  it('keeps an unknown key as its label, without an icon', (): void => {
    expect(techDefinition('rust')).toEqual({ label: 'rust' });
  });
});
