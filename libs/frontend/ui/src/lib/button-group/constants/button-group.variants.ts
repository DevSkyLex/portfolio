import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant buttonGroupVariants
 *
 * @description
 * Class recipe for button groups that join adjacent controls and reset corner radii along the configured axis.
 */
export const buttonGroupVariants = cva(
  [
    'flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2',
    // The focused child rises above its neighbours so that its outline is not covered.
    '[&>*]:focus-visible:z-10 [&>input]:flex-1',
  ],
  {
    variants: {
      orientation: {
        horizontal: [
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none',
          '[&>*:not(:first-child)]:-ml-px',
        ],
        vertical: [
          'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none',
          '[&>*:not(:first-child)]:-mt-px',
        ],
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
);

/**
 * Type ButtonGroupOrientation
 * @type ButtonGroupOrientation
 *
 * @description
 * Supported axis for joined controls and their shared separator.
 *
 * @type {'horizontal' | 'vertical'}
 */
export type ButtonGroupOrientation = NonNullable<
  VariantProps<typeof buttonGroupVariants>['orientation']
>;
