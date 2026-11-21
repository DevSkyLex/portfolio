import { heroLetters } from '@internal/content-web-feature/lib/ui/sections/hero-section/utils/hero-letters/hero-letters.utils';

describe('heroLetters', (): void => {
  it('staggers the letters through the words in reading order', (): void => {
    const [first, middle, last] = heroLetters(['Valentin', 'web', 'Fortin']);
    expect(first?.map((l): string => l.char).join('')).toBe('Valentin');
    expect(last?.map((l): string => l.char).join('')).toBe('Fortin');
    expect(middle?.map((l): number => l.k)).toEqual([8, 9, 10]);
    expect(first?.map((l): number => l.k)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(last?.map((l): number => l.k)).toEqual([11, 12, 13, 14, 15, 16]);
  });

  it('cycles the glyph shapes on the stagger index and the colours within each word', (): void => {
    const [first, last] = heroLetters(['abcde', 'fg']);
    expect(first?.map((l) => l.shape)).toEqual(['dot', 'dot', 'dot', 'dot', 'dot']);
    expect(last?.map((l) => l.shape)).toEqual(['dot', 'dot']);
    expect(first?.map((l): string => l.color)).toEqual([
      'text-aurora-pink',
      'text-aurora-violet',
      'text-aurora-blue',
      'text-aurora-cyan',
      'text-aurora-pink',
    ]);
    expect(last?.[0]?.color).toBe('text-aurora-pink');
  });

  it('returns no word for an empty name', (): void => {
    expect(heroLetters([])).toEqual([]);
  });
});
