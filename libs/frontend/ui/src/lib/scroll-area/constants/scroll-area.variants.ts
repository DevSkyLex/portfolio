import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant scrollAreaVariants
 * @constant
 *
 * @description
 * Builds the thin themed scrollbar and orientation-specific overflow classes; WebKit pseudo-elements provide the
 * thumb where native `scrollbar-color` support is unavailable.
 *
 * @type {(props?: ({ orientation?: 'vertical' | 'horizontal' | 'both' | null | undefined } & import('class-variance-authority/types').ClassProp) | undefined) => string}
 */
export const scrollAreaVariants = cva(
  [
    'relative overscroll-contain rounded-field',
    '[scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--star)_24%,transparent)_transparent]',
    'hover:[scrollbar-color:color-mix(in_srgb,var(--star)_36%,transparent)_transparent]',
    '[&::-webkit-scrollbar]:size-3 [&::-webkit-scrollbar]:bg-transparent [&::-webkit-scrollbar-button]:hidden',
    '[&::-webkit-scrollbar-thumb]:min-h-12 [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:border-3',
    '[&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-star/24 [&::-webkit-scrollbar-thumb]:bg-clip-padding',
    '[&::-webkit-scrollbar-thumb:active]:bg-signal/55 [&::-webkit-scrollbar-thumb:hover]:bg-star/36',
    'outline-2 outline-offset-2 outline-transparent focus-visible:outline-star/55',
  ],
  {
    variants: {
      orientation: {
        vertical: 'overflow-x-hidden overflow-y-auto',
        horizontal: 'overflow-x-auto overflow-y-hidden',
        both: 'overflow-auto',
      },
    },
    defaultVariants: { orientation: 'vertical' },
  },
);

/**
 * Type ScrollAreaOrientation
 * @typedef ScrollAreaOrientation
 *
 * @description
 * Non-null orientation options accepted by the variant builder and directive input.
 */
export type ScrollAreaOrientation = NonNullable<
  VariantProps<typeof scrollAreaVariants>['orientation']
>;
