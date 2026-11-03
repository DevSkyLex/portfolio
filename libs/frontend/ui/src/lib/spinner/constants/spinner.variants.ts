import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant spinnerVariants
 *
 * @description
 * Defines spinner dimensions and its motion-safe rotating ring treatment.
 *

 */
export const spinnerVariants = cva(
  [
    'inline-block shrink-0 rounded-full border-current border-r-transparent',
    'animate-[spin_700ms_linear_infinite] motion-reduce:animate-none',
  ],
  {
    variants: {
      size: {
        sm: 'size-4 border-[1.5px]',
        md: 'size-5 border-2',
        lg: 'size-6 border-2',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

/**
 * Type SpinnerSize
 * @type SpinnerSize
 *
 * @description
 * Spinner sizes available from the variant configuration.
 *
 * @type {NonNullable<VariantProps<typeof spinnerVariants>['size']>}
 */
export type SpinnerSize = NonNullable<VariantProps<typeof spinnerVariants>['size']>;
