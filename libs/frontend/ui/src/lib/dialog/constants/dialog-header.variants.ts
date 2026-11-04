import { cva, type VariantProps } from 'class-variance-authority';
import {
  dialogHeaderBarClasses,
  dialogHeaderClasses,
} from '@internal/ui/lib/dialog/constants/dialog-parts.constants';

/**
 * Configuration dialogHeaderVariants
 *
 * @description
 * Dialog header layouts: `default` stacks the title and description inside the panel padding; `bar`
 * is the edge-to-edge header bar, whose end padding (`pr-14`) clears the built-in close button.
 */
export const dialogHeaderVariants = cva('', {
  variants: {
    variant: {
      default: dialogHeaderClasses,
      bar: [dialogHeaderBarClasses, 'pr-14'],
    },
  },
  defaultVariants: { variant: 'default' },
});

/**
 * Type DialogHeaderVariant
 * @type DialogHeaderVariant
 *
 * @description
 * Layouts accepted by the dialog and alert-dialog header directives.
 *
 * @type {NonNullable<VariantProps<typeof dialogHeaderVariants>['variant']>}
 */
export type DialogHeaderVariant = NonNullable<VariantProps<typeof dialogHeaderVariants>['variant']>;
