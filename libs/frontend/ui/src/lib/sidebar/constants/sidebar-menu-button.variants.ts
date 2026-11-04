import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant sidebarMenuButtonVariants
 *
 * @description
 * Defines menu-button typography, selected and disabled states, and icon-collapse sizing.
 */
export const sidebarMenuButtonVariants = cva(
  [
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-sm border border-transparent p-2 text-left text-control text-fg-muted',
    'transition-[width,height,padding,background-color,color,border-color] duration-(--dur-pop) ease-orbit motion-reduce:transition-none',
    'hover:bg-surface-hover hover:text-fg data-active:bg-surface-hover data-active:text-fg',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-fg/55 focus-visible:outline-fg/12',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    'group-has-data-[slot=sidebar-menu-badge]/menu-item:pr-8',
    'group-data-[collapsible=icon]/sidebar:size-8! group-data-[collapsible=icon]/sidebar:p-2!',
    '[&>ng-icon]:shrink-0 [&>span:last-child]:truncate',
  ],
  {
    variants: {
      size: {
        sm: 'h-7 text-data',
        md: 'h-9',
        lg: 'h-12 group-data-[collapsible=icon]/sidebar:p-0!',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Type SidebarMenuButtonSize
 * @type SidebarMenuButtonSize
 *
 * @description
 * Supported heights and text sizing for sidebar menu buttons.
 *
 * @type {NonNullable<VariantProps<typeof sidebarMenuButtonVariants>['size']>}
 */
export type SidebarMenuButtonSize = NonNullable<
  VariantProps<typeof sidebarMenuButtonVariants>['size']
>;
