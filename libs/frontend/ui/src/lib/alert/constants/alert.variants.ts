import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Configuration alertVariants
 *
 * @description
 * Defines the alert surface, icon alignment, and default or danger appearance using catalogue tokens.
 */
export const alertVariants = cva(
  [
    'group/alert relative grid w-full grid-cols-[0_minmax(0,1fr)] items-start gap-y-0.5 rounded-field border bg-void-raised px-4 py-3.5 text-small',
    'has-[>ng-icon]:grid-cols-[16px_minmax(0,1fr)] has-[>ng-icon]:gap-x-3 has-[>ui-icon]:grid-cols-[16px_minmax(0,1fr)] has-[>ui-icon]:gap-x-3',
    '[&>ng-icon]:row-span-2 [&>ng-icon]:translate-y-0.5 [&>ui-icon]:row-span-2 [&>ui-icon]:translate-y-0.5',
    'animate-[fade-up_var(--dur-pop)_var(--ease-orbit)_both] motion-reduce:animate-none',
  ],
  {
    variants: {
      variant: {
        default: 'border-line text-star [&>ng-icon]:text-star-muted [&>ui-icon]:text-star-muted',
        info: 'border-info/35 bg-info/8 text-star [&>ng-icon]:text-info-ink [&>ui-icon]:text-info-ink',
        success:
          'border-success/35 bg-success/8 text-star [&>ng-icon]:text-success-ink [&>ui-icon]:text-success-ink',
        warning:
          'border-warning/35 bg-warning/8 text-star [&>ng-icon]:text-warning-ink [&>ui-icon]:text-warning-ink',
        danger:
          'border-danger/35 bg-danger/8 text-star [&>ng-icon]:text-danger-ink [&>ui-icon]:text-danger-ink',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

/**
 * Type AlertVariant
 * @type AlertVariant
 *
 * @description
 * Supported visual variants exposed by the alert directive.
 *
 * @type {NonNullable<VariantProps<typeof alertVariants>['variant']>}
 */
export type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;
