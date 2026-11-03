import { cva } from 'class-variance-authority';

/**
 * Constant tooltipVariants
 *
 * @description
 * Defines the floating tooltip surface, compact typography and entrance transition.
 */
export const tooltipVariants = cva([
  'block max-w-xs rounded-option border border-line bg-void-raised px-2.5 py-1.5 text-data text-star shadow-float',
  'transition-[opacity,scale] duration-(--dur-pop) ease-orbit starting:scale-95 starting:opacity-0',
  'motion-reduce:transition-none',
]);
