import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Configuration avatarVariants
 *
 * @description
 * Defines circular avatar sizing, border, and fallback typography for the three supported sizes.
 */
export const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-void-sunk font-mono text-star-muted select-none',
  {
    variants: {
      size: {
        sm: 'size-8 text-label',
        md: 'size-11 text-data',
        lg: 'size-14 text-small',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Type AvatarSize
 * @type AvatarSize
 *
 * @description
 * Named avatar sizes supported by the variant configuration.
 *
 * @type {NonNullable<VariantProps<typeof avatarVariants>['size']>}
 */
export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;
