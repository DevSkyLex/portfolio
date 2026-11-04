import { cva } from 'class-variance-authority';

/**
 * Constant tabsListVariants
 *
 * @description
 * Defines orientation-specific tab-list layout and divider classes.
 */
export const tabsListVariants = cva('relative flex', {
  variants: {
    orientation: {
      horizontal: 'items-center gap-6 border-b border-border',
      vertical: 'flex-col items-stretch gap-1 border-l border-border',
    },
  },
  defaultVariants: { orientation: 'horizontal' },
});
