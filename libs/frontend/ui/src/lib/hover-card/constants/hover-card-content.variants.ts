import { cva } from 'class-variance-authority';

/**
 * Constant hoverCardContentVariants
 *
 * @description
 * Defines the fixed-width preview panel, border and entrance scale that match the hover-card mockup.
 */
export const hoverCardContentVariants = cva([
  'flex w-70 flex-col gap-3 rounded-card border border-line bg-void-raised p-4 text-small text-star shadow-float',
  'transition-[opacity,scale] duration-(--dur-roll) ease-orbit-roll starting:scale-60 starting:opacity-0',
  'motion-reduce:transition-none',
]);
