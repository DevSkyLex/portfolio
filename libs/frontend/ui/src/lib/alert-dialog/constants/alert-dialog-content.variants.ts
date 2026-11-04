import { cva } from 'class-variance-authority';

/**
 * Configuration alertDialogContentVariants
 *
 * @description
 * Defines the alert confirmation panel's bounded viewport size, raised surface, and entrance motion.
 * Its padding reads `--dialog-inset`, cancelled by a bar footer (`uiAlertDialogFooter variant="bar"`);
 * a caller resizing the padding sets the variable so the bar follows. It shares the dialog widths:
 * `sm` 420 px (the default) and `md` 512 px.
 */
export const alertDialogContentVariants = cva(
  [
    'relative flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-5 overflow-y-auto',
    'rounded-xl border border-border bg-surface-raised p-(--dialog-inset) text-fg shadow-float outline-none',
    '[--dialog-inset:--spacing(6)]',
    'animate-fade-up motion-reduce:animate-none',
  ],
  {
    variants: { size: { sm: 'max-w-[420px]', md: 'max-w-lg', lg: 'max-w-xl' } },
    defaultVariants: { size: 'sm' },
  },
);
