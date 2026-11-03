import { cva } from 'class-variance-authority';

/**
 * Constant dialogContentVariants
 *
 * @description
 * Defines the bounded, scrollable modal panel and its entrance motion.
 */
export const dialogContentVariants = cva([
  'relative flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg flex-col gap-5 overflow-y-auto',
  'rounded-card border border-line bg-void-raised p-6 text-star shadow-float outline-none sm:p-8',
  'animate-fade-up motion-reduce:animate-none',
]);
