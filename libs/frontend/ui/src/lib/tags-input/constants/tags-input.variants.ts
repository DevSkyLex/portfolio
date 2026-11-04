import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant tagsInputVariants
 * @readonly
 *
 * @description
 * Box of `ui-tags-input`: the `uiInput` surface, border and hover, with the input focus ring drawn on
 * the whole box since the focus moves between the text input and the tags. The focus border goes
 * through `has-focus-visible` (a text input always matches `:focus-visible`), which Tailwind sorts
 * after `hover` where `focus-within` sorts before it; the invalid border wins over both, as in
 * `uiInputGroup`. `sm` is the dense admin control (32 px, the D43 `sm`
 * radius, 13 px text), `md` the height of `uiInput size="sm"` (36 px, `md` radius); both grow with
 * the wrapped rows.
 */
export const tagsInputVariants = cva(
  [
    'flex w-full min-w-0 cursor-text flex-wrap items-center gap-1 border border-border-field bg-surface-field p-1 text-fg',
    'transition-[border-color] duration-(--dur-pop) ease-orbit hover:border-border-hover',
    'outline-2 outline-offset-0 outline-transparent focus-within:outline-accent/12 has-focus-visible:border-accent/55',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-invalid:border-danger',
  ],
  {
    variants: {
      size: {
        sm: 'min-h-8 rounded-sm text-[13px]',
        md: 'min-h-9 rounded-md text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Type TagsInputSize
 * @type TagsInputSize
 *
 * @description
 * Non-null size variants of the tags input box.
 */
export type TagsInputSize = NonNullable<VariantProps<typeof tagsInputVariants>['size']>;
