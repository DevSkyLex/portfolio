import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant fieldLegendVariants
 *
 * @description
 * Styles a fieldset legend as a display heading or as a field label.
 */
export const fieldLegendVariants = cva('mb-1 p-0 text-star', {
  variants: {
    /** `legend`: title of the set; `label`: the size of a field label (`ui-field`). */
    variant: {
      legend: 'font-display text-d3',
      label: 'text-sm font-medium',
    },
  },
  defaultVariants: { variant: 'legend' },
});

/**
 * Type FieldLegendVariant
 * @type FieldLegendVariant
 *
 * @description
 * Visual role supported by the fieldset legend directive.
 *
 * @type {NonNullable<VariantProps<typeof fieldLegendVariants>['variant']>}
 */
export type FieldLegendVariant = NonNullable<VariantProps<typeof fieldLegendVariants>['variant']>;
