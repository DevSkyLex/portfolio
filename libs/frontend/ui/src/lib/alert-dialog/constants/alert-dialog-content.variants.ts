import { cva } from 'class-variance-authority';

/**
 * Configuration alertDialogContentVariants
 *
 * @description
 * Defines the alert confirmation panel's bounded viewport size, raised surface, and entrance motion.
 */
export const alertDialogContentVariants = cva([
  'relative flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md flex-col gap-5 overflow-y-auto',
  'rounded-card border border-line bg-void-raised p-6 text-star shadow-float outline-none sm:p-8',
  'animate-fade-up motion-reduce:animate-none',
]);
