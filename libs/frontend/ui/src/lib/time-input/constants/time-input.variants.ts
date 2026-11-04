import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant timeInputVariants
 * @readonly
 *
 * @description
 * Box of `ui-time-input`: the `uiInput` surface, border, hover and sizes, with the input focus ring
 * drawn on the whole box since the focus sits on one of its segments. The focus border goes through
 * `has-focus-visible` (a text input always matches `:focus-visible`), which Tailwind sorts after
 * `hover`; the invalid border applies only while no segment has the focus, so focus wins over the
 * error as on `uiInput`.
 */
export const timeInputVariants = cva(
  [
    'flex w-full min-w-0 cursor-text items-center gap-0.5 rounded-md border border-border-field bg-surface-field text-fg tabular-nums',
    'transition-[border-color] duration-(--dur-pop) ease-orbit hover:border-border-hover',
    'outline-2 outline-offset-0 outline-transparent focus-within:outline-accent/12 has-focus-visible:border-accent/55',
    'aria-invalid:not-focus-within:border-danger',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4.5 text-base/6',
        lg: 'h-14 rounded-lg px-5 text-[17px]/6',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Type TimeInputSize
 * @type TimeInputSize
 *
 * @description
 * Non-null size variants of the time input box, the sizes of `uiInput`.
 */
export type TimeInputSize = NonNullable<VariantProps<typeof timeInputVariants>['size']>;
