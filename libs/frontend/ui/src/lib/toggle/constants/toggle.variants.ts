import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant toggleVariants
 *
 * @description
 * Defines pressed-state and size styling for the two-state button.
 *

 */
export const toggleVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-field border border-transparent text-control whitespace-nowrap text-star-muted',
    'transition-[transform,background-color,border-color,color] duration-(--dur-pop) ease-orbit active:scale-98',
    'hover:bg-star/5 hover:text-star aria-pressed:bg-star/8 aria-pressed:text-star',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-star/55 focus-visible:outline-star/12',
    'motion-reduce:transition-none motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        default: '',
        outline: 'border-line-field hover:border-line-hover aria-pressed:border-line-hover',
      },
      size: {
        sm: 'h-9 min-w-9 px-2.5',
        md: 'h-11 min-w-11 px-3',
        lg: 'h-14 min-w-14 px-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

/**
 * Type ToggleVariant
 * @type ToggleVariant
 *
 * @description
 * Visual treatments supported by the toggle button.
 *
 * @type {NonNullable<VariantProps<typeof toggleVariants>['variant']>}
 */
export type ToggleVariant = NonNullable<VariantProps<typeof toggleVariants>['variant']>;

/**
 * Type ToggleSize
 * @type ToggleSize
 *
 * @description
 * Button dimensions supported by the toggle variants.
 *
 * @type {NonNullable<VariantProps<typeof toggleVariants>['size']>}
 */
export type ToggleSize = NonNullable<VariantProps<typeof toggleVariants>['size']>;
