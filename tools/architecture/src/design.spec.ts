import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type DesignViolation,
  centredTextViolations,
  classTokens,
  colourViolations,
  frontendSources,
  themeColourTokens,
} from '@internal/architecture/support/design-rules';

/*
 * Design-system rules (D37): each rule fails on a fixture, then the real frontend satisfies them.
 */

/**
 * Constant WORKSPACE
 *
 * @description
 * Repository root, resolved from the architecture tool's source directory.
 */
const WORKSPACE: string = join(import.meta.dirname, '..', '..', '..');

/**
 * Constant TOKENS
 *
 * @description
 * Colour tokens declared by the design tokens.
 */
const TOKENS: ReadonlySet<string> = themeColourTokens(
  readFileSync(join(WORKSPACE, 'libs/frontend/design-tokens/src/theme.css'), 'utf8'),
);

/**
 * Constant CENTRED_TEXT_ALLOWED
 *
 * @description
 * Files where centred text is inherent: calendar cells and the per-column alignment of the data table.
 */
const CENTRED_TEXT_ALLOWED: string[] = [
  'libs/frontend/ui/src/lib/calendar/calendar.component.html',
  'libs/frontend/ui/src/lib/data-table/constants/data-table.constants.ts',
];

describe('design rules', (): void => {
  it('reads the token palette, status families included', (): void => {
    for (const token of [
      'void',
      'star-muted',
      'line-field',
      'signal',
      'success-ink',
      'warning',
      'danger-ink',
      'info',
      'on-danger',
    ]) {
      expect(TOKENS.has(token)).toBe(true);
    }
  });

  it('strips variants, important marks and opacity from class tokens', (): void => {
    expect(
      classTokens('class="hover:bg-star/5 @max-[640px]:text-center [&>a]:text-star-muted!"'),
    ).toEqual(
      expect.arrayContaining([
        { raw: 'hover:bg-star/5', utility: 'bg-star' },
        { raw: '@max-[640px]:text-center', utility: 'text-center' },
        { raw: '[&>a]:text-star-muted!', utility: 'text-star-muted' },
      ]),
    );
  });

  it('rejects Tailwind palette colours and raw colours, accepts tokens and keywords', (): void => {
    const rejected: DesignViolation[] = colourViolations(
      'fixture.html',
      '<p class="text-gray-500 bg-white border-zinc-200/40 hover:text-blue-600 bg-[#fafafa] text-[rgb(0_0_0)]">',
      TOKENS,
    );
    expect(rejected.map((v: DesignViolation): string => v.token)).toEqual([
      'text-gray-500',
      'bg-white',
      'border-zinc-200/40',
      'hover:text-blue-600',
      'bg-[#fafafa]',
      'text-[rgb(0_0_0)]',
    ]);
    expect(
      colourViolations(
        'fixture.html',
        '<p class="text-star bg-void-raised border-line-field text-success-ink bg-danger/8 text-current bg-current/12 text-small text-d3 border-b text-[13px]/5 bg-[color-mix(in_srgb,var(--star)_6%,var(--void-raised))]">',
        TOKENS,
      ),
    ).toEqual([]);
  });

  it('rejects centred text outside the allowed files', (): void => {
    expect(
      centredTextViolations('page.html', '<h1 class="text-center">', CENTRED_TEXT_ALLOWED),
    ).toHaveLength(1);
    expect(
      centredTextViolations(CENTRED_TEXT_ALLOWED[0] ?? '', 'text-center', CENTRED_TEXT_ALLOWED),
    ).toEqual([]);
  });

  describe('on the frontend', (): void => {
    const sources: { file: string; text: string }[] = frontendSources(WORKSPACE);

    it('scans every component, template and stylesheet', (): void => {
      expect(sources.length).toBeGreaterThan(300);
      expect(
        sources.some((s: { file: string; text: string }): boolean =>
          s.file.endsWith('button.variants.ts'),
        ),
      ).toBe(true);
    });

    it('colours every component with design tokens only', (): void => {
      expect(
        sources.flatMap((s: { file: string; text: string }): DesignViolation[] =>
          colourViolations(s.file, s.text, TOKENS),
        ),
      ).toEqual([]);
    });

    it('writes no raw colour in the stylesheets: the tokens own every value', (): void => {
      const raw: string[] = sources
        .filter(
          (s: { file: string; text: string }): boolean =>
            s.file.endsWith('.css') && !s.file.includes('design-tokens/'),
        )
        .flatMap((s: { file: string; text: string }): string[] =>
          [
            ...s.text
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/g),
          ].map((match: RegExpExecArray): string => `${s.file}: ${match[0]}`),
        );
      expect(raw).toEqual([]);
    });

    it('keeps text left-aligned outside inherently centred components', (): void => {
      expect(
        sources.flatMap((s: { file: string; text: string }): DesignViolation[] =>
          centredTextViolations(s.file, s.text, CENTRED_TEXT_ALLOWED),
        ),
      ).toEqual([]);
    });
  });
});
