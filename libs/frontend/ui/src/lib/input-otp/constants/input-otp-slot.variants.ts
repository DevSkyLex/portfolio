import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant inputOtpSlotVariants
 * @readonly
 *
 * @description
 * Defines visual OTP cells across size, active-caret and invalid states; cells share the width of the
 * field, the size sets their height.
 * The active slot (the caret) takes the 2 px accent ring of buttons and links; an invalid slot keeps its
 * danger border under it.
 */
export const inputOtpSlotVariants = cva(
  [
    'relative flex min-w-0 flex-1 items-center justify-center border-y border-e border-border-field font-medium text-fg',
    'first:rounded-s-md first:border-s last:rounded-e-md',
    'transition-[border-color,outline-color] duration-150 motion-reduce:transition-none',
    'outline-2 outline-offset-0 outline-transparent',
  ],
  {
    variants: {
      size: { sm: 'h-9 text-sm', md: 'h-11 text-[17px]', lg: 'h-14 text-xl' },
      active: { true: 'z-10 outline-accent/55', false: '' },
      invalid: { true: 'border-danger', false: '' },
    },
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
