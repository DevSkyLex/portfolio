import { cva } from 'class-variance-authority';

/**
 * Constant menuPanelVariants
 *
 * @description
 * Defines shared floating panel classes for menu and listbox overlays, including their entrance treatment and optional scrolling.
 */
export const menuPanelVariants = cva(
  [
    'z-50 flex min-w-48 flex-col rounded-field border border-line bg-void-raised p-1 shadow-float outline-none light:bg-void',
    'transition-[opacity,translate,clip-path] duration-300 ease-orbit [clip-path:inset(-64px_round_10px)]',
    'starting:-translate-y-1 starting:opacity-0 starting:[clip-path:inset(0_0_calc(100%_-_8px)_0_round_10px)]',
    'motion-reduce:transition-none',
  ],
  {
    variants: {
      /** Listboxes scroll; menus grow (their submenus are separate overlays). */
      scroll: { true: 'max-h-80 overflow-y-auto overscroll-contain', false: '' },
    },
    defaultVariants: { scroll: false },
  },
);
