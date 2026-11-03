import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Configuration badgeVariants
 *
 * @description
 * Defines the compact badge appearance and the default, secondary, outlined, and danger variants.
 */
export const badgeVariants = cva(
  [
    'inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-[12px]/4 font-medium whitespace-nowrap',
    'transition-[background-color,border-color,color] duration-(--dur-pop) ease-orbit motion-reduce:transition-none',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-star/55 focus-visible:outline-star/12',
    '[&>ng-icon]:shrink-0 [&>ui-icon]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: 'bg-void-raised text-star-muted [a&]:hover:text-star',
        secondary: 'bg-void-sunk text-star-muted [a&]:hover:text-star',
        outline: 'border-line text-star-muted [a&]:hover:border-line-hover [a&]:hover:text-star',
        info: 'bg-info/12 text-info-ink [a&]:hover:bg-info/20',
        success: 'bg-success/12 text-success-ink [a&]:hover:bg-success/20',
        warning: 'bg-warning/12 text-warning-ink [a&]:hover:bg-warning/20',
        danger: 'bg-danger/12 text-danger-ink [a&]:hover:bg-danger/20',
      },
      dot: {
        true: "before:size-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-['']",
        false: '',
      },
    },
    defaultVariants: { variant: 'default', dot: false },
  },
);

/**
 * Type BadgeVariant
 * @type BadgeVariant
 *
 * @description
 * Visual variants accepted by the badge directive.
 *
 * @type {NonNullable<VariantProps<typeof badgeVariants>['variant']>}
 */
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
