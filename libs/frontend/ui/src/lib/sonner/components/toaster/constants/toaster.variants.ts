import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant toasterVariants
 *
 * @description
 * Defines the fixed viewport positions and stack direction for the toast region.
 */
export const toasterVariants = cva(
  'pointer-events-none fixed z-1100 flex w-[calc(100vw-2rem)] max-w-sm gap-2',
  {
    variants: {
      position: {
        'top-left': 'top-4 left-4 flex-col-reverse sm:top-6 sm:left-6',
        'top-center': 'top-4 left-1/2 -translate-x-1/2 flex-col-reverse sm:top-6',
        'top-right': 'top-4 right-4 flex-col-reverse sm:top-6 sm:right-6',
        'bottom-left': 'bottom-4 left-4 flex-col sm:bottom-6 sm:left-6',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 flex-col sm:bottom-6',
        'bottom-right': 'right-4 bottom-4 flex-col sm:right-6 sm:bottom-6',
      },
    },
    defaultVariants: { position: 'bottom-right' },
  },
);

/**
 * Type ToasterPosition
 * @type ToasterPosition
 *
 * @description
 * Supported corner and center positions for the toast region.
 *
 * @type {NonNullable<VariantProps<typeof toasterVariants>['position']>}
 */
export type ToasterPosition = NonNullable<VariantProps<typeof toasterVariants>['position']>;
