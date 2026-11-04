import { cn } from '@internal/ui/lib/class-names/class-names.utils';

/**
 * Constant CONTROL_CLASSES
 *
 * @description
 * Styles the native checkbox input, including checked, mixed, invalid, disabled, focus, and
 * reduced-motion states. Keyboard focus draws the 2 px accent ring of buttons and links. The unchecked border is `border-strong`, 3:1 or more against every surface
 * (WCAG 1.4.11); the pointer strengthens it to `fg-faint`.
 *
 * @type {string}
 */
export const CONTROL_CLASSES: string = cn(
  'peer size-full cursor-pointer appearance-none rounded-xs border border-border-strong bg-transparent',
  'transition-[background-color,border-color,outline-color] duration-(--dur-pop) ease-orbit',
  'hover:not-checked:not-indeterminate:border-fg-faint',
  'checked:border-fg checked:bg-fill indeterminate:border-fg indeterminate:bg-fill',
  'outline-2 outline-offset-0 outline-transparent focus-visible:outline-accent/55',
  'aria-invalid:border-danger',
  'disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
);
