import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant progressVariants
 *
 * @description
 * Defines the progress track classes and its supported sizes; the small size matches the mockup
 * reading-progress hairline.
 */
export const progressVariants = cva(
  'relative block w-full overflow-hidden rounded-full bg-border',
  {
    variants: {
      size: {
        /**
         * Mockup hairline used by the compact reading-progress indicator.
         */
        sm: 'h-0.5',
        md: 'h-1.5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Type ProgressSize
 * @type ProgressSize
 *
 * @description
 * Supported track sizes derived from the progress variant configuration.
 *
 * @type {NonNullable<VariantProps<typeof progressVariants>['size']>}
 */
export type ProgressSize = NonNullable<VariantProps<typeof progressVariants>['size']>;
