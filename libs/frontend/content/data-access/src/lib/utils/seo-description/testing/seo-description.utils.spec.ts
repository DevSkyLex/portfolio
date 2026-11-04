import { seoDescription } from '@internal/content-web-data-access/lib/utils/seo-description/seo-description.utils';

describe('seoDescription', (): void => {
  it('keeps a short text and collapses its whitespace', (): void => {
    expect(seoDescription('  Une application\n mobile   pour suivre ses séries. ')).toBe(
      'Une application mobile pour suivre ses séries.',
    );
  });

  it('keeps a text of exactly the maximum length', (): void => {
    const text: string = 'a'.repeat(160);
    expect(seoDescription(text)).toBe(text);
  });

  it('cuts a long text at the last word boundary and appends an ellipsis', (): void => {
    const result: string = seoDescription(`${'mot '.repeat(50)}fin.`);
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith(' mot…')).toBe(true);
  });

  it('drops the punctuation before the ellipsis', (): void => {
    expect(seoDescription('Première partie, seconde partie suit', 20)).toBe('Première partie…');
  });

  it('cuts inside a single word when no boundary is near the limit', (): void => {
    expect(seoDescription(`a ${'b'.repeat(40)}`, 20)).toBe(`a ${'b'.repeat(17)}…`);
  });
});
