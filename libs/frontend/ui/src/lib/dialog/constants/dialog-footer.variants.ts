import { cva, type VariantProps } from 'class-variance-authority';
import {
  dialogFooterBarClasses,
  dialogFooterClasses,
} from '@internal/ui/lib/dialog/constants/dialog-parts.constants';

/**
 * Configuration dialogFooterVariants
 *
 * @description
 * Footer layouts shared by `uiDialogFooter` and `uiAlertDialogFooter`: `actions` (the default) lines
 * the buttons up at the end inside the panel padding; `bar` is the edge-to-edge footer bar with
 * keyboard hints at the start and actions at the end.
 */
export const dialogFooterVariants = cva('', {
  variants: {
    variant: {
      actions: dialogFooterClasses,
      bar: dialogFooterBarClasses,
    },
  },
  defaultVariants: { variant: 'actions' },
});

/**
 * Type DialogFooterVariant
 * @type DialogFooterVariant
 *
 * @description
 * Layouts accepted by the dialog and alert-dialog footer directives.
 *
 * @type {NonNullable<VariantProps<typeof dialogFooterVariants>['variant']>}
 */
export type DialogFooterVariant = NonNullable<VariantProps<typeof dialogFooterVariants>['variant']>;
