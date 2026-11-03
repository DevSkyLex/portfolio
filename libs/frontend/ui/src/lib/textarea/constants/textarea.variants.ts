import { cva } from 'class-variance-authority';

/**
 * Constant textareaVariants
 *
 * @description
 * Defines size and content-resizing classes for the multiline field, including the mockup's
 * small and large text-area spacing.
 *

 */
export const textareaVariants = cva('', {
  variants: {
    size: {
      sm: 'min-h-30 px-3 py-2',
      md: 'min-h-42 px-4.5 py-3 leading-6',
      lg: 'min-h-50 px-5 py-4 leading-6',
    },
    // Enables content-based sizing where supported and keeps manual resizing as the fallback.
    autoResize: {
      true: 'field-sizing-content resize-y supports-[field-sizing:content]:resize-none',
      false: 'resize-y',
    },
  },
  defaultVariants: { size: 'md', autoResize: false },
});
