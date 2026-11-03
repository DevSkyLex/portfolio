import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant inputVariants
 * @readonly
 *
 * @description
 * Defines the shared input control surface, with size, multiline and native-select variants.
 * The focus outline takes precedence over the invalid border to match the control mockup.
 */
export const inputVariants = cva(
  [
    'w-full rounded-field border border-line-field bg-void-raised text-star placeholder:text-star-faint',
    'transition-[border-color] duration-(--dur-pop) ease-orbit hover:border-line-hover',
    'outline-4 outline-offset-0 outline-transparent focus:border-signal/55 focus:outline-signal/12',
    // Focus wins over the error border, as in the mockup.
    'aria-invalid:not-focus:border-danger',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4.5 text-base/6',
        lg: 'h-14 px-5 text-[17px]/6',
      },
      multiline: { true: 'h-auto min-h-36 py-3', false: '' },
      /** Native select: arrow drawn by the parent component, on the right. */
      select: { true: 'cursor-pointer appearance-none pr-10', false: '' },
    },
    defaultVariants: { size: 'md', multiline: false, select: false },
  },
);

/**
 * Type InputSize
 * @type InputSize
 *
 * @description
 * Non-null size variants accepted by the shared input control.
 */
export type InputSize = NonNullable<VariantProps<typeof inputVariants>['size']>;
