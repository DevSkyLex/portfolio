import { cva } from 'class-variance-authority';
import { dialogHeaderBarClasses } from '@internal/ui/lib/dialog/constants/dialog-parts.constants';

/**
 * Configuration alertDialogHeaderVariants
 *
 * @description
 * Alert-dialog header layouts: `default` stacks the title and description inside the panel padding;
 * `bar` is the edge-to-edge header bar, with symmetric padding since an alert dialog has no close
 * button.
 */
export const alertDialogHeaderVariants = cva('', {
  variants: {
    variant: {
      default: 'flex flex-col gap-2 text-left',
      bar: dialogHeaderBarClasses,
    },
  },
  defaultVariants: { variant: 'default' },
});
