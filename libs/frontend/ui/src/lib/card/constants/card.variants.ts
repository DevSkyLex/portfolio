import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant cardVariants
 *
 * @description
 * Class recipe for card surfaces, with raised default, inset sunk, and border-only outline variants.
 */
export const cardVariants = cva('flex flex-col gap-6 rounded-card py-6 text-star', {
  variants: {
    variant: {
      // Use the raised filled surface for the default card treatment.
      default: 'bg-void-raised',
      // Use an inset surface when the card sits within another raised surface.
      sunk: 'bg-void-sunk',
      outline: 'border border-line',
    },
  },
  defaultVariants: { variant: 'default' },
});

/**
 * Type CardVariant
 * @type CardVariant
 *
 * @description
 * Surface treatments available to card hosts.
 *
 * @type {'default' | 'sunk' | 'outline'}
 */
export type CardVariant = NonNullable<VariantProps<typeof cardVariants>['variant']>;
