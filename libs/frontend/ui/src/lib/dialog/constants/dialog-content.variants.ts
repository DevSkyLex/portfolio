import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant dialogContentVariants
 *
 * @description
 * Defines the bounded, scrollable modal panel and its entrance motion. The padding reads
 * `--dialog-inset`, 24 px for every dialog at every width (one inset across the admin), which a bar footer (`uiDialogFooter variant="bar"`) cancels to reach the panel
 * edges; a caller resizing the padding sets the variable (`sm:[--dialog-inset:--spacing(6)]`) so the
 * bar follows, while a plain `p-*` class still overrides the padding alone. Two widths: `sm` 420 px,
 * `md` 512 px (the default).
 */
export const dialogContentVariants = cva(
  [
    'relative flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col gap-5 overflow-y-auto',
    'rounded-xl border border-border bg-surface-raised p-(--dialog-inset) text-fg shadow-float outline-none',
    '[--dialog-inset:--spacing(6)]',
    'animate-fade-up motion-reduce:animate-none',
  ],
  {
    variants: { size: { sm: 'max-w-[420px]', md: 'max-w-lg', lg: 'max-w-xl' } },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Type DialogSize
 * @type DialogSize
 *
 * @description
 * Widths shared by dialogs and alert dialogs: `sm` 420 px, `md` 512 px.
 */
export type DialogSize = NonNullable<VariantProps<typeof dialogContentVariants>['size']>;
