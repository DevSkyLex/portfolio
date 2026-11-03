import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant switchVariants
 * @constant
 *
 * @description
 * Defines the switch track states, focus treatment and pseudo-element thumb transitions for each supported size.
 *
 * @type {(props?: ({ size?: 'sm' | 'md' | null | undefined } & import('class-variance-authority/types').ClassProp) | undefined) => string}
 */
export const switchVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-line-field bg-void-sunk',
    'transition-[background-color,border-color,outline-color] duration-(--dur-pop) ease-orbit',
    'hover:not-aria-checked:border-line-hover aria-checked:border-star aria-checked:bg-star',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-signal/55 focus-visible:outline-signal/12',
    'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/12',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'before:block before:rounded-full before:bg-star-muted before:transition-[translate,background-color] before:duration-(--dur-pop) before:ease-orbit',
    'aria-checked:before:bg-void motion-reduce:transition-none motion-reduce:before:transition-none',
  ],
  {
    variants: {
      size: {
        sm: 'h-5 w-8 p-0.5 before:size-3.5 aria-checked:before:translate-x-3 rtl:aria-checked:before:-translate-x-3',
        md: 'h-6 w-10 p-[3px] before:size-4 aria-checked:before:translate-x-4 rtl:aria-checked:before:-translate-x-4',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Type SwitchSize
 * @typedef SwitchSize
 *
 * @description
 * Non-null size options inferred from the switch variant configuration.
 */
export type SwitchSize = NonNullable<VariantProps<typeof switchVariants>['size']>;
