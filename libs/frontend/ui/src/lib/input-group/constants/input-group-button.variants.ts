import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant inputGroupButtonVariants
 * @readonly
 *
 * @description
 * Defines compact button sizes for actions placed inside an input group addon.
 */
export const inputGroupButtonVariants = cva('shadow-none', {
  variants: {
    size: {
      xs: 'h-7 gap-1 rounded-option px-2 text-sm',
      sm: 'h-8 gap-1.5 rounded-option px-2.5',
      'icon-xs': 'size-7 rounded-option p-0',
      'icon-sm': 'size-8 rounded-option p-0',
    },
  },
  defaultVariants: { size: 'xs' },
});

/**
 * Type InputGroupButtonSize
 * @type InputGroupButtonSize
 *
 * @description
 * Allowed compact button sizes supported inside input group addons.
 */
export type InputGroupButtonSize = NonNullable<
  VariantProps<typeof inputGroupButtonVariants>['size']
>;
