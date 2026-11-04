import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant inputGroupVariants
 * @readonly
 *
 * @description
 * Defines the bordered input group, deriving its focus and invalid states from the nested native control.
 * It rests on `surface-field`, the fill of `uiInput`, so that a toolbar's fields read alike.
 */
export const inputGroupVariants = cva(
  [
    'group/input-group relative flex w-full min-w-0 items-center rounded-md border border-border-field bg-surface-field text-fg',
    'transition-[border-color,outline-color] duration-150 hover:border-border-hover motion-reduce:transition-none',
    'outline-2 outline-offset-0 outline-transparent',
    'has-[[data-slot=input-group-control]:focus-visible]:border-accent/55 has-[[data-slot=input-group-control]:focus-visible]:outline-accent/12',
    'has-[[data-slot=input-group-control][aria-expanded=true]]:border-accent/55',
    'has-[[data-slot=input-group-control][aria-invalid=true]]:border-danger has-[[data-slot=input-group-control][aria-invalid=true]:focus-visible]:outline-danger/12',
    'has-[[data-slot=input-group-control]:disabled]:cursor-not-allowed has-[[data-slot=input-group-control]:disabled]:opacity-50',
    'has-[>textarea]:h-auto',
    'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col',
    'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col',
    'has-[>[data-align=inline-end]]:[&>input]:pe-2 has-[>[data-align=inline-start]]:[&>input]:ps-2',
  ],
  {
    variants: {
      size: { sm: 'h-9 text-sm', md: 'h-11 text-[15px]', lg: 'h-14 rounded-lg text-base' },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Type InputGroupSize
 * @type InputGroupSize
 *
 * @description
 * Non-null group size variants that size both the wrapper and its nested input.
 */
export type InputGroupSize = NonNullable<VariantProps<typeof inputGroupVariants>['size']>;
