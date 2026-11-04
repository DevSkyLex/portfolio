import { cva } from 'class-variance-authority';

/**
 * Constant toastVariants
 *
 * @description
 * Defines the raised toast surface, border, compact corner radius, shadow and entrance animation
 * used by the notification mockup.
 */
export const toastVariants = cva([
  'pointer-events-auto flex min-h-11 items-start gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3',
  'animate-fade-up text-small text-fg shadow-float motion-reduce:animate-none',
]);
