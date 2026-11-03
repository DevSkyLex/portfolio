import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Configuration checkboxVariants
 *
 * @description
 * Defines the compact checkbox wrapper dimensions for the supported small and medium sizes.
 */
export const checkboxVariants = cva('relative inline-flex shrink-0 items-center justify-center', {
  variants: {
    size: { sm: 'size-4', md: 'size-5' },
  },
  defaultVariants: { size: 'md' },
});

/**
 * Type CheckboxSize
 * @type CheckboxSize
 *
 * @description
 * Wrapper sizes accepted by the checkbox component.
 *
 * @type {NonNullable<VariantProps<typeof checkboxVariants>['size']>}
 */
export type CheckboxSize = NonNullable<VariantProps<typeof checkboxVariants>['size']>;
