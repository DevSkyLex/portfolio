import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant emptyMediaVariants
 *
 * @description
 * Defines the base empty-state media treatment and its available visual variants.
 */
export const emptyMediaVariants = cva(
  'mb-3 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent text-fg-muted',
        /**
         * 36 px tile on the field radius over the raised surface, the tile of the settings rows
         * (D36 settings page revision), holding a 16 px icon.
         */
        icon: 'size-9 rounded-md border border-border bg-surface-raised text-fg-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

/**
 * Type EmptyMediaVariant
 * @type EmptyMediaVariant
 *
 * @description
 * Named media styles accepted by the empty-state illustration directive.
 *
 * @type {NonNullable<VariantProps<typeof emptyMediaVariants>['variant']>}
 */
export type EmptyMediaVariant = NonNullable<VariantProps<typeof emptyMediaVariants>['variant']>;
