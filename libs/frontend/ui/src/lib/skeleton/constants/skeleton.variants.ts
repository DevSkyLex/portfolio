import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Constant skeletonVariants
 *
 * @description
 * Placeholder look on the D41 roles: a translucent ink tone (`surface-hover`, the same on any surface)
 * crossed by a calm band of `surface-selected` (`animate-shimmer`, `theme.css`); reduced motion keeps the
 * static tone only. `shape` rounds the placeholder to what it stands for: a block (card, image, field),
 * a text line (`h-3`, give it a width) or a circle (avatar, icon; give it a size).
 */
export const skeletonVariants = cva(
  [
    'block shrink-0 bg-surface-hover',
    'bg-linear-to-r from-transparent via-surface-selected to-transparent bg-size-[200%_100%] bg-no-repeat',
    'animate-shimmer motion-reduce:animate-none motion-reduce:bg-none',
  ],
  {
    variants: {
      shape: {
        block: 'rounded-sm',
        text: 'h-3 rounded-full',
        circle: 'aspect-square rounded-full',
      },
    },
    defaultVariants: { shape: 'block' },
  },
);

/**
 * Type SkeletonShape
 * @type SkeletonShape
 *
 * @description
 * Placeholder outline accepted by `uiSkeleton`.
 */
export type SkeletonShape = NonNullable<VariantProps<typeof skeletonVariants>['shape']>;
