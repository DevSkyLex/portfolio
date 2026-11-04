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
    'relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md border border-transparent text-control font-medium whitespace-nowrap',
    '[transition:scale_var(--dur-press)_cubic-bezier(0.16,1,0.3,1),color_var(--dur-wipe)_cubic-bezier(0.76,0,0.24,1),border-color_var(--dur-pop)_cubic-bezier(0.16,1,0.3,1),background-color_var(--dur-pop)_cubic-bezier(0.16,1,0.3,1)] active:scale-98',
    'outline-4 outline-offset-0 outline-transparent focus-visible:border-fg/55 focus-visible:outline-fg/12',
    'motion-reduce:transition-none motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    // Ripple (mockup ob-ripple): a disc of the text color, placed by --rx / --ry and sized by --rs.
    'after:pointer-events-none after:absolute after:top-[var(--ry,50%)] after:left-[var(--rx,50%)] after:-z-1 after:size-[var(--rs,0px)] after:-translate-1/2 after:scale-0 after:rounded-full after:bg-current after:opacity-0',
  ],
  {
    variants: {
      variant: {
        // Filled buttons rest on the quiet fill-disabled surface when disabled: half-transparent ink reads as
        // neutral grey (D37), and the light theme keeps it lighter than a field border.
        primary:
          'bg-fill text-on-fill hover:bg-fill-hover focus-visible:bg-fill-hover disabled:bg-fill-disabled disabled:text-fg-faint disabled:opacity-100 aria-disabled:bg-fill-disabled aria-disabled:text-fg-faint aria-disabled:opacity-100',
        danger:
          'bg-danger text-on-fill hover:bg-danger/88 focus-visible:border-danger/55 focus-visible:bg-danger/88 focus-visible:outline-danger/12 disabled:bg-fill-disabled disabled:text-fg-faint disabled:opacity-100 aria-disabled:bg-fill-disabled aria-disabled:text-fg-faint aria-disabled:opacity-100',
        secondary:
          'border-border-field text-fg hover:border-border-hover hover:bg-surface-hover focus-visible:bg-surface-hover',
        ghost:
          'text-fg-muted hover:bg-surface-hover hover:text-fg focus-visible:border-fg-muted/55 focus-visible:outline-fg-muted/12',
      },
      // Radius by height (D43): xs and the icon sizes take the small-control step, lg the large one.
      size: {
        xs: 'h-7 gap-1.5 rounded-sm px-2.5 text-[13px]',
        'icon-xs': 'size-7 rounded-sm px-0',
        'icon-sm': 'size-8 rounded-sm px-0',
        sm: 'h-9 px-4',
        md: 'h-11 px-6',
        lg: 'h-14 rounded-lg px-8',
      },
    },
    // Ghost buttons keep a narrow padding at the larger sizes; xs is already narrow.
    compoundVariants: [{ variant: 'ghost', size: ['sm', 'md', 'lg'], class: 'px-3' }],
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
