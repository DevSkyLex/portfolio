import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant tabsTriggerVariants
 *
 * @description
 * Defines tab trigger states and the orientation-specific selection bar used by the design.
 */
export const tabsTriggerVariants = cva(
  [
    'relative inline-flex items-center gap-2 rounded-option border border-transparent text-control whitespace-nowrap text-star-muted',
    'transition-[color,border-color] duration-(--dur-pop) ease-orbit hover:text-star aria-selected:text-star',
    "after:absolute after:rounded-[1px] after:bg-star after:transition-transform after:duration-(--dur-roll) after:ease-orbit after:content-['']",
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-star/55 focus-visible:outline-star/12',
    'disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:after:transition-none',
  ],
  {
    variants: {
      orientation: {
        horizontal: [
          '-mb-px h-11 px-0',
          'after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-right after:scale-x-0',
          'hover:after:origin-left hover:after:scale-x-100 hover:after:bg-line-strong',
          'aria-selected:after:origin-left aria-selected:after:scale-x-100 aria-selected:after:bg-star',
        ],
        vertical: [
          '-ml-px min-h-9 px-4',
          'after:inset-y-2 after:left-0 after:w-0.5 after:origin-bottom after:scale-y-0',
          'hover:after:origin-top hover:after:scale-y-100 hover:after:bg-line-strong',
          'aria-selected:after:origin-top aria-selected:after:scale-y-100 aria-selected:after:bg-star',
        ],
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

/**
 * Type TabsTriggerVariants
 * @type TabsTriggerVariants
 *
 * @description
 * Optional variant selections accepted by the tab trigger styling function.
 *
 * @type {VariantProps<typeof tabsTriggerVariants>}
 */
export type TabsTriggerVariants = VariantProps<typeof tabsTriggerVariants>;
