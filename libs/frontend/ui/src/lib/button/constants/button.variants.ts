import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Configuration buttonVariants
 *
 * @description
 * Defines the primary, secondary, and ghost button appearances, sizes, focus treatment, and
 * reduced-motion behavior using Orbite theme tokens.
 */
export const buttonVariants = cva(
  [
    'relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-field border border-transparent text-control whitespace-nowrap',
    '[transition:scale_var(--dur-press)_cubic-bezier(0.16,1,0.3,1),color_var(--dur-wipe)_cubic-bezier(0.76,0,0.24,1),border-color_var(--dur-pop)_cubic-bezier(0.16,1,0.3,1),background-color_var(--dur-pop)_cubic-bezier(0.16,1,0.3,1)] active:scale-98',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-star/55 focus-visible:outline-star/12',
    'motion-reduce:transition-none motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    // Ripple (mockup ob-ripple): a disc of the text color, placed by --rx / --ry and sized by --rs.
    'after:pointer-events-none after:absolute after:top-[var(--ry,50%)] after:left-[var(--rx,50%)] after:-z-1 after:size-[var(--rs,0px)] after:-translate-1/2 after:scale-0 after:rounded-full after:bg-current after:opacity-0',
  ],
  {
    variants: {
      variant: {
        // Filled buttons turn into a control surface when disabled: half-transparent ink reads as neutral grey (D37).
        primary:
          'bg-star text-void hover:bg-star-hover focus-visible:bg-star-hover disabled:bg-line-field disabled:text-star-faint disabled:opacity-100 aria-disabled:bg-line-field aria-disabled:text-star-faint aria-disabled:opacity-100',
        danger:
          'bg-danger text-on-danger hover:bg-danger/88 focus-visible:border-danger/55 focus-visible:bg-danger/88 focus-visible:outline-danger/12 disabled:bg-line-field disabled:text-star-faint disabled:opacity-100 aria-disabled:bg-line-field aria-disabled:text-star-faint aria-disabled:opacity-100',
        secondary:
          'border-line-field text-star hover:border-line-hover hover:bg-star/5 focus-visible:bg-star/5',
        ghost:
          'text-star-muted hover:bg-star/5 hover:text-star focus-visible:border-star-muted/55 focus-visible:outline-star-muted/12',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-11 px-6',
        lg: 'h-14 px-8',
      },
    },
    // Ghost buttons keep their narrow padding at every size.
    compoundVariants: [{ variant: 'ghost', class: 'px-3' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

/**
 * Type ButtonVariant
 * @type ButtonVariant
 *
 * @description
 * Semantic visual treatments accepted by the button directive.
 *
 * @type {NonNullable<VariantProps<typeof buttonVariants>['variant']>}
 */
export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

/**
 * Type ButtonSize
 * @type ButtonSize
 *
 * @description
 * Supported button heights and horizontal padding presets.
 *
 * @type {NonNullable<VariantProps<typeof buttonVariants>['size']>}
 */
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;
