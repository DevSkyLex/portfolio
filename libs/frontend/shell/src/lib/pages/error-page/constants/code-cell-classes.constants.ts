/**
 * Constant CODE_CELL_CLASSES
 *
 * @description
 * Tailwind class sets for lit, faint, and separator grid cells.
 */
export const CODE_CELL_CLASSES = {
  on: 'before:inset-0 before:animate-px-in before:bg-(image:--aurora) before:bg-size-[calc(var(--cols)*100%)_100%] before:bg-position-[calc(var(--t)*100%)_0] before:[animation-delay:calc(var(--k)*26ms+120ms)] motion-reduce:before:animate-none',
  off: 'before:inset-[calc(50%-2px)] before:bg-star before:opacity-14 @max-[768px]:before:inset-[calc(50%-1.5px)]',
  gap: 'before:hidden',
} as const;
