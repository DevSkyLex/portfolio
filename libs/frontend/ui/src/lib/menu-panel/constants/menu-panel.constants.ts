import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Constant menuLabelClasses
 *
 * @description
 * Typography and inset spacing for non-interactive menu section labels.
 */
export const menuLabelClasses: string =
  'px-2.5 pt-2 pb-1 font-mono text-[13px] leading-4 text-star-faint select-none';

/**
 * Constant menuSeparatorClasses
 *
 * @description
 * Thin horizontal rule classes used to separate groups of menu entries.
 */
export const menuSeparatorClasses: string = '-mx-1 my-1 h-px shrink-0 bg-line';

/**
 * Constant menuShortcutClasses
 *
 * @description
 * Trailing monospace alignment and typography for shortcut hints inside menu rows.
 */
export const menuShortcutClasses: string =
  'ml-auto pl-6 font-mono text-[13px] leading-4 tracking-wide text-star-faint';

/**
 * Constant menuIndicatorClasses
 *
 * @description
 * Positions a decorative check or radio dot in the left margin reserved by an inset option row.
 */
export const menuIndicatorClasses: string =
  'pointer-events-none absolute left-2.5 flex size-4 items-center justify-center';

/**
 * Constant submenuPositions
 *
 * @description
 * Preferred and flipped CDK overlay placements for submenus, offset from the parent row to align with panel padding.
 *
 * @type {ConnectedPosition[]}
 */
export const submenuPositions: ConnectedPosition[] = [
  { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 4, offsetY: -5 },
  { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -4, offsetY: -5 },
];
