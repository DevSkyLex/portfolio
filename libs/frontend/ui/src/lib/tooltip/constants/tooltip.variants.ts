import { cva } from 'class-variance-authority';

/**
 * Constant tooltipVariants
 *
 * @description
 * Defines the floating tooltip surface, compact typography and entrance transition.
 */
export const tooltipVariants = cva([
  'block max-w-xs rounded-sm border border-border bg-surface-float px-2 py-1 text-[12px]/4 text-fg shadow-float',
  'transition-[opacity,scale] duration-(--dur-pop) ease-orbit starting:scale-95 starting:opacity-0',
  'motion-reduce:transition-none',
]);
