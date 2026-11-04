import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant sheetVariants
 * @constant
 *
 * @description
 * Defines the sheet panel layout and entrance direction for each supported viewport edge or full-screen mode.
 *
 * @type {(props?: ({ side?: 'top' | 'right' | 'bottom' | 'left' | 'full' | null | undefined } & import('class-variance-authority/types').ClassProp) | undefined) => string}
 */
export const sheetVariants = cva(
  [
    'relative flex flex-col gap-5 overflow-y-auto bg-surface-raised p-6 text-fg shadow-float outline-none',
    'transition-[translate] duration-(--dur-roll) ease-orbit motion-reduce:transition-none',
  ],
  {
    variants: {
      side: {
        top: 'max-h-dvh w-full border-b border-border starting:-translate-y-full',
        right: 'h-full w-screen max-w-sm border-l border-border starting:translate-x-full',
        bottom: 'max-h-dvh w-full border-t border-border starting:translate-y-full',
        left: 'h-full w-screen max-w-sm border-r border-border starting:-translate-x-full',
        // Full-screen menu of the mockup (.ob-menu): page background, fade-up entrance.
        full: 'h-full w-full animate-fade-up bg-surface shadow-none motion-reduce:animate-none',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

/**
 * Type SheetSide
 * @typedef SheetSide
 *
 * @description
 * Non-null panel side options inferred from the sheet variant configuration.
 */
export type SheetSide = NonNullable<VariantProps<typeof sheetVariants>['side']>;
