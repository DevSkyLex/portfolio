import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant itemMediaVariants
 *
 * @description
 * Defines transparent, icon and image treatments for media aligned beside item content.
 */
export const itemMediaVariants = cva(
  [
    'flex shrink-0 items-center justify-center gap-2 [&_svg]:pointer-events-none',
    'group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start',
  ],
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: 'size-8 rounded-sm border border-border bg-surface-sunk text-fg-muted',
        image: 'size-10 overflow-hidden rounded-md [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

/**
 * Type ItemMediaVariant
 * @type ItemMediaVariant
 *
 * @description
 * Supported media presentation variants for an item row.
 */
export type ItemMediaVariant = NonNullable<VariantProps<typeof itemMediaVariants>['variant']>;
