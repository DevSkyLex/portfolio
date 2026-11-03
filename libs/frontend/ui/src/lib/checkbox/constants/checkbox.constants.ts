import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Constant CONTROL_CLASSES
 *
 * @description
 * Styles the native checkbox input, including checked, mixed, invalid, disabled, focus, and
 * reduced-motion states.
 *
 * @type {string}
 */
export const CONTROL_CLASSES: string = cn(
  'peer size-full cursor-pointer appearance-none rounded-option border border-line-field bg-transparent',
  'transition-[background-color,border-color,outline-color] duration-(--dur-pop) ease-orbit',
  'hover:not-checked:not-indeterminate:border-line-hover',
  'checked:border-star checked:bg-star indeterminate:border-star indeterminate:bg-star',
  'outline-4 outline-offset-0 outline-transparent focus-visible:border-signal/55 focus-visible:outline-signal/12',
  'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/12',
  'disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
);
