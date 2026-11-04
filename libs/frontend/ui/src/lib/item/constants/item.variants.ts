import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant itemVariants
 *
 * @description
 * Defines the item row's default, outline and muted appearances and its small or medium spacing.
 */
export const itemVariants = cva(
  [
    'group/item flex flex-wrap items-center rounded-lg border border-transparent text-small text-fg',
    'transition-[background-color,border-color] duration-(--dur-pop) ease-orbit motion-reduce:transition-none',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-fg/55 focus-visible:outline-fg/12',
  ],
  {
    variants: {
      variant: {
        default: 'bg-transparent [a&]:hover:bg-surface-raised',
        outline: 'border-border [a&]:hover:border-border-hover [a&]:hover:bg-surface-raised',
        muted: 'bg-surface-raised [a&]:hover:bg-surface-hover',
      },
      size: {
        sm: 'gap-2.5 px-4 py-3',
        md: 'gap-4 p-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

/**
 * Type ItemVariant
 * @type ItemVariant
 *
 * @description
 * Supported visual variants of an item row.
 */
export type ItemVariant = NonNullable<VariantProps<typeof itemVariants>['variant']>;

/**
 * Type ItemSize
 * @type ItemSize
 *
 * @description
 * Supported compact and default spacing sizes of an item row.
 */
export type ItemSize = NonNullable<VariantProps<typeof itemVariants>['size']>;
