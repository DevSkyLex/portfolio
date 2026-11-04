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
 * Files where centred text is inherent: calendar cells, the per-column alignment of the data table, and
 * the catalogue empty state (`uiEmpty`), centred by the owner's decision (D36 empty state revision).
 * Consumers of `uiEmpty` inherit its alignment and never centre text themselves.
 */
const CENTRED_TEXT_ALLOWED: string[] = [
  'libs/frontend/ui/src/lib/calendar/calendar.component.html',
  'libs/frontend/ui/src/lib/data-table/constants/data-table.constants.ts',
  'libs/frontend/ui/src/lib/empty/constants/empty.variants.ts',
  'libs/frontend/ui/src/lib/empty/empty.directive.ts',
];

describe('design rules', (): void => {
  it('reads the token palette, status families included', (): void => {
    for (const token of [
      'surface',
      'surface-hover',
      'fg-muted',
      'border-field',
      'accent',
      'success-ink',
      'warning',
      'danger-ink',
      'info',
      'on-fill',
    ]) {
      expect(TOKENS.has(token)).toBe(true);
    }
  });

  it('strips variants, important marks and opacity from class tokens', (): void => {
    expect(
      classTokens('class="hover:bg-fg/24 @max-[640px]:text-center [&>a]:text-fg-muted!"'),
    ).toEqual(
      expect.arrayContaining([
        { raw: 'hover:bg-fg/24', utility: 'bg-fg' },
        { raw: '@max-[640px]:text-center', utility: 'text-center' },
        { raw: '[&>a]:text-fg-muted!', utility: 'text-fg-muted' },
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
        '<p class="text-fg bg-surface-raised border-border-field text-success-ink bg-danger/8 text-current bg-current/12 text-small text-d3 border-b text-[13px]/5 bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface-raised))]">',
        TOKENS,
      ),
    ).toEqual([]);
  });

  it('rejects faint ink states, which take surface-hover or surface-selected (D41)', (): void => {
    expect(
      colourViolations(
        'fixture.html',
        '<a class="hover:bg-fg/5 aria-selected:bg-fg/8 bg-fg/24 hover:bg-surface-hover">',
        TOKENS,
      ).map((v: DesignViolation): string => v.token),
    ).toEqual(['hover:bg-fg/5', 'aria-selected:bg-fg/8']);
  });

  it('rejects centred text outside the allowed files', (): void => {
    expect(
      centredTextViolations('page.html', '<h1 class="text-center">', CENTRED_TEXT_ALLOWED),
    ).toHaveLength(1);
    expect(
      centredTextViolations(CENTRED_TEXT_ALLOWED[0] ?? '', 'text-center', CENTRED_TEXT_ALLOWED),
    ).toEqual([]);
  });

  it('allows centred text in the empty-state parts only, not in their consumers or siblings', (): void => {
    for (const file of [
      'libs/frontend/ui/src/lib/empty/constants/empty.variants.ts',
      'libs/frontend/ui/src/lib/empty/empty.directive.ts',
    ]) {
      expect(centredTextViolations(file, "'text-center'", CENTRED_TEXT_ALLOWED)).toEqual([]);
    }
    for (const file of [
      'libs/frontend/ui/src/lib/empty/constants/empty-media.variants.ts',
      'libs/frontend/content/feature-admin/src/lib/ui/dataviews/project-list-dataview/project-list-dataview.component.html',
      'libs/frontend/shell/src/lib/admin/layouts/admin-layout/components/command-palette/command-palette.component.html',
    ]) {
      expect(
        centredTextViolations(
          file,
          '<p uiEmptyDescription class="text-center">',
          CENTRED_TEXT_ALLOWED,
        ).map((v: DesignViolation): string => v.token),
      ).toEqual(['text-center']);
    }
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
