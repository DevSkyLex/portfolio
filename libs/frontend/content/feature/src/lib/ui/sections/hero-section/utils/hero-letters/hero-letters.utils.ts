import { HERO_GLYPH_SHAPES } from '@internal/content-web-feature/lib/ui/sections/hero-section/constants/hero-glyph-shapes.constants';
import { HERO_LETTER_COLORS } from '@internal/content-web-feature/lib/ui/sections/hero-section/constants/hero-letter-colors.constants';
import type { HeroLetter } from '@internal/content-web-feature/lib/ui/sections/hero-section/models/hero-letter/hero-letter.interface';

/**
 * Function heroLetters
 *
 * @description
 * Splits the hero name into letters with their stagger index, glyph shape and aurora colour; the index runs
 * across the words with the first word's length as the stride, the shapes cycle on that index and the colours
 * restart with each word.
 *
 * @param {readonly string[]} words - Words of the displayed name.
 *
 * @returns {readonly (readonly HeroLetter[])[]} Letters grouped by word.
 */
export function heroLetters(words: readonly string[]): readonly (readonly HeroLetter[])[] {
  const stride: number = words[0]?.length ?? 0;
  return words.map((word: string, w: number) =>
    [...word].map((char: string, i: number) => {
      const k: number = w * stride + i;
      return {
        char,
        k,
        shape: HERO_GLYPH_SHAPES[k % 3] ?? 'dot',
        color: HERO_LETTER_COLORS[i % 4] ?? HERO_LETTER_COLORS[0],
      };
    }),
  );
}
