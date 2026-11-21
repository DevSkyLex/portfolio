import { HERO_GLYPH_SHAPES } from '@internal/content-web-feature/lib/ui/sections/hero-section/constants/hero-glyph-shapes.constants';
import { HERO_LETTER_COLORS } from '@internal/content-web-feature/lib/ui/sections/hero-section/constants/hero-letter-colors.constants';
import type { HeroLetter } from '@internal/content-web-feature/lib/ui/sections/hero-section/models/hero-letter/hero-letter.interface';

/**
 * Function heroLetters
 *
 * @description
 * Splits the hero title into letters with their stagger index, glyph shape and aurora colour; the index runs
 * through every letter in reading order, the shapes cycle on that index and the colours restart with each word.
 *
 * @param {readonly string[]} words - Words of the displayed title.
 *
 * @returns {readonly (readonly HeroLetter[])[]} Letters grouped by word.
 */
export function heroLetters(words: readonly string[]): readonly (readonly HeroLetter[])[] {
  let next: number = 0;
  return words.map((word: string) =>
    [...word].map((char: string, i: number) => {
      const k: number = next++;
      return {
        char,
        k,
        shape: HERO_GLYPH_SHAPES[k % HERO_GLYPH_SHAPES.length] ?? 'dot',
        color: HERO_LETTER_COLORS[i % 4] ?? HERO_LETTER_COLORS[0],
      };
    }),
  );
}
