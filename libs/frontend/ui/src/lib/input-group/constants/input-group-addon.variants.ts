import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant inputGroupAddonVariants
 * @readonly
 *
 * @description
 * Defines addon placement at inline or block edges and adjusts edge spacing when an addon contains a button.
 */
export const inputGroupAddonVariants = cva(
  'flex h-auto cursor-text items-center justify-center gap-2 text-star-muted select-none [&>ng-icon]:shrink-0',
  {
    variants: {
      align: {
        'inline-start': 'order-first ps-3.5 has-[>button]:ps-1.5',
        'inline-end': 'order-last pe-3.5 has-[>button]:pe-1.5',
        'block-start': 'order-first w-full justify-start px-4 pt-3',
        'block-end': 'order-last w-full justify-start px-4 pb-3',
      },
    },
    defaultVariants: { align: 'inline-start' },
  },
);

/**
 * Type InputGroupAddonAlign
 * @type InputGroupAddonAlign
 *
 * @description
 * Allowed inline and block edges for an input group addon.
 */
export type InputGroupAddonAlign = NonNullable<
  VariantProps<typeof inputGroupAddonVariants>['align']
>;
