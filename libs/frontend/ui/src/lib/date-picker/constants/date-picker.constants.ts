import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Constant POSITIONS
 *
 * @description
 * Overlay alignment fallbacks that keep the calendar attached to the trigger and allow it to flip
 * above when the viewport has insufficient room below.
 *
 * @type {ConnectedPosition[]}
 */
export const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
];
