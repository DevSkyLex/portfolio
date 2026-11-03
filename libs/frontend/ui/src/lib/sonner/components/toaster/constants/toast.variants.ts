import { cva } from 'class-variance-authority';

/**
 * Constant toastVariants
 *
 * @description
 * Defines the raised toast surface, border, compact corner radius, shadow and entrance animation
 * used by the notification mockup.
 */
export const toastVariants = cva([
  'pointer-events-auto flex min-h-11 items-start gap-3 rounded-sm border border-line bg-void-raised px-4 py-3',
  'animate-fade-up text-small text-star shadow-float motion-reduce:animate-none',
]);
