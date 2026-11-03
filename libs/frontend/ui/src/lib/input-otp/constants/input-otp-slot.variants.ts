import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant inputOtpSlotVariants
 * @readonly
 *
 * @description
 * Defines visual OTP cells across size, active-caret and invalid states.
 * When an active slot is invalid, the compound variant replaces its signal outline with the danger outline.
 */
export const inputOtpSlotVariants = cva(
  [
    'relative flex items-center justify-center border-y border-e border-line-field font-medium text-star',
    'first:rounded-s-field first:border-s last:rounded-e-field',
    'transition-[border-color,outline-color] duration-150 motion-reduce:transition-none',
    'outline-4 outline-offset-0 outline-transparent',
  ],
  {
    variants: {
      size: { sm: 'size-9 text-sm', md: 'size-11 text-[17px]', lg: 'size-14 text-xl' },
      active: { true: 'z-10 border-signal/55 outline-signal/12', false: '' },
      invalid: { true: 'border-danger', false: '' },
    },
    compoundVariants: [{ active: true, invalid: true, class: 'outline-danger/12' }],
    defaultVariants: { size: 'md', active: false, invalid: false },
  },
);

/**
 * Type InputOtpSize
 * @type InputOtpSize
 *
 * @description
 * Non-null size variants shared by the OTP component and its visual slots.
 */
export type InputOtpSize = NonNullable<VariantProps<typeof inputOtpSlotVariants>['size']>;
