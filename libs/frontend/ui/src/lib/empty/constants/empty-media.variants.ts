import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant emptyMediaVariants
 *
 * @description
 * Defines the base empty-state media treatment and its available visual variants.
 */
export const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        /** Round mark of the mockup's confirmation (`.ob-sent-mark`). */
        icon: 'size-12 rounded-full border border-line-field text-star-muted',
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
