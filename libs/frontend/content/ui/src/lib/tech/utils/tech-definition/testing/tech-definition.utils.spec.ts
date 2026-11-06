import { TECHS } from '@internal/content-web-ui/lib/tech/constants/techs.constants';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';

describe('techDefinition', (): void => {
  it('returns the catalogue entry', (): void => {
    expect(techDefinition('angular')).toBe(TECHS['angular']);
    expect(techDefinition('angular').label).toBe('Angular');
  });

  it('resolves an alias to its canonical entry', (): void => {
    expect(techDefinition('postgres')).toBe(TECHS['postgresql']);
    expect(techDefinition('Node.js').label).toBe('Node.js');
  });

  it('keeps an unknown key as its label', (): void => {
    expect(techDefinition('cobol')).toEqual({ label: 'cobol' });
  });
});
