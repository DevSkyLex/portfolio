import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant radioGroupVariants
 *
 * @description
 * Defines the group layout for vertical and horizontal radio arrangements.
 */
export const radioGroupVariants = cva('', {
  variants: {
    orientation: { vertical: 'grid gap-3', horizontal: 'flex flex-wrap gap-x-6 gap-y-3' },
  },
  defaultVariants: { orientation: 'vertical' },
});

/**
 * Type RadioGroupOrientation
 * @type RadioGroupOrientation
 *
 * @description
 * Supported arrangement direction for the radio group.
 *
 * @type {NonNullable<VariantProps<typeof radioGroupVariants>['orientation']>}
 */
export type RadioGroupOrientation = NonNullable<
  VariantProps<typeof radioGroupVariants>['orientation']
>;
