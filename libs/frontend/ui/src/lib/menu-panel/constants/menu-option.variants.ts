import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant menuOptionVariants
 *
 * @description
 * Defines menu and listbox option row sizes, danger styling, indicator inset and staggered entrance animation.
 */
export const menuOptionVariants = cva(
  [
    'group relative flex w-full cursor-pointer items-center gap-2.5 rounded-sm text-left whitespace-nowrap text-fg-muted outline-none select-none',
    'transition-[background-color,color] duration-150 ease-orbit motion-reduce:transition-none',
    'hover:bg-surface-hover hover:text-fg focus:bg-surface-hover focus:text-fg data-active:bg-surface-hover data-active:text-fg',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: 'min-h-8 px-2 text-[13px]/5',
        md: 'min-h-10 px-2.5 text-[15px] leading-5',
        lg: 'min-h-12 px-3 text-base',
      },
      variant: {
        default: '',
        danger:
          'text-danger-ink hover:bg-danger/10 hover:text-danger-ink focus:bg-danger/10 focus:text-danger-ink data-active:bg-danger/10 data-active:text-danger-ink',
      },
      /** Room on the left for an indicator (check, radio dot) or to align with such rows. */
      inset: { true: 'pl-7', false: '' },
      /** Entrance in cascade: 90ms wait then 45ms per rank (`--i`, capped at 8). */
      cascade: {
        true: 'animate-menu-in [animation-delay:calc(90ms+min(var(--i,0),8)*45ms)] motion-reduce:animate-none',
        false: '',
      },
    },
    // Menus, context menus and the command palette use the compact density; selects pass the size of
    // their trigger.
    defaultVariants: { size: 'sm', variant: 'default', inset: false, cascade: true },
  },
);

/**
 * Type MenuOptionSize
 * @type MenuOptionSize
 *
 * @description
 * Supported compact, default and large sizes for menu option rows.
 */
export type MenuOptionSize = NonNullable<VariantProps<typeof menuOptionVariants>['size']>;

/**
 * Type MenuItemVariant
 * @type MenuItemVariant
 *
 * @description
 * Supported default and danger treatments for menu option rows.
 */
export type MenuItemVariant = NonNullable<VariantProps<typeof menuOptionVariants>['variant']>;
