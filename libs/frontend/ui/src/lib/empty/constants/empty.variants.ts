import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant emptyVariants
 *
 * @description
 * Height rule of an empty state, chosen from its position (D36 empty state revision):
 * - `fill`: the last thing in its page column (nothing follows it). It takes the remaining height
 *   (`flex-1`, at least 18rem) with the page gutters, its content centred in the free room.
 * - `inline`: something follows it (pagination, another section, more options in a list). Fixed
 *   32 px block padding, no stretching and no gutter of its own.
 * - `panel`: the only content of a bounded box (a pane, a sheet, a media frame). It fills the box
 *   (`h-full`, `min-h-0` so it never makes the box scroll) with a 16 px inset, its content centred
 *   in the box.
 *
 * Every layout centres its content horizontally: the owner's exception to the left-aligned text of
 * the admin (D36 empty state revision, D37).
 *
 * `appearance` `dashed` frames it (owner review): a dashed `border-hover` outline on a surface a
 * little lighter than the page, with generous room, for an empty list inside a settings section.
 */
export const emptyVariants = cva('flex min-w-0 flex-col items-center text-center', {
  variants: {
    layout: {
      fill: 'min-h-72 flex-1 justify-center px-6 py-10 @max-[640px]:px-4',
      inline: 'py-8',
      panel: 'h-full min-h-0 flex-1 justify-center p-4',
    },
    appearance: {
      plain: '',
      dashed: 'rounded-xl border border-dashed border-border-hover bg-surface-raised/50 px-6 py-10',
    },
  },
  defaultVariants: { layout: 'inline', appearance: 'plain' },
});

/**
 * Type EmptyLayout
 * @type EmptyLayout
 *
 * @description
 * Height rule of an empty state: `fill`, `inline` or `panel` (`emptyVariants`).
 *
 * @type {NonNullable<VariantProps<typeof emptyVariants>['layout']>}
 */
export type EmptyLayout = NonNullable<VariantProps<typeof emptyVariants>['layout']>;

/**
 * Type EmptyAppearance
 * @type EmptyAppearance
 *
 * @description
 * Look of an empty state: `plain` (default) or `dashed` (`emptyVariants`).
 *
 * @type {NonNullable<VariantProps<typeof emptyVariants>['appearance']>}
 */
export type EmptyAppearance = NonNullable<VariantProps<typeof emptyVariants>['appearance']>;
