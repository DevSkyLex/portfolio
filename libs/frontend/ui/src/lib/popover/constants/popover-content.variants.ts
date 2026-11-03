import { cva } from 'class-variance-authority';

/**
 * Constant popoverContentVariants
 *
 * @description
 * Defines the floating panel surface, typography and entrance transition classes.
 */
export const popoverContentVariants = cva([
  'flex w-72 flex-col gap-3 rounded-field border border-line bg-void-raised p-4 text-small text-star shadow-float outline-none',
  'transition-[opacity,scale] duration-(--dur-pop) ease-orbit starting:scale-95 starting:opacity-0',
  'motion-reduce:transition-none',
]);
