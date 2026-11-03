import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant itemVariants
 *
 * @description
 * Defines the item row's default, outline and muted appearances and its small or medium spacing.
 */
export const itemVariants = cva(
  [
    'group/item flex flex-wrap items-center rounded-field border border-transparent text-small text-star',
    'transition-[background-color,border-color] duration-(--dur-pop) ease-orbit motion-reduce:transition-none',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-star/55 focus-visible:outline-star/12',
  ],
  {
    variants: {
      variant: {
        default: 'bg-transparent [a&]:hover:bg-void-raised',
        outline: 'border-line [a&]:hover:border-line-hover [a&]:hover:bg-void-raised',
        muted: 'bg-void-raised [a&]:hover:bg-void-hover',
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
