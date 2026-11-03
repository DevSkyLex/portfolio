import type { ConnectedPosition } from '@angular/cdk/overlay';
import { opposite } from '@internal/ui/lib/popover/constants/connected-position.constants';
import type { OverlayAlign } from '@internal/ui/lib/popover/models/overlay/overlay-align.type';
import type { OverlaySide } from '@internal/ui/lib/popover/models/overlay/overlay-side.type';

/**
 * Function position
 *
 * @description
 * Converts a side, alignment and gap into the CDK origin and overlay attachment points.
 *
 * @param {OverlaySide} side - Preferred side of the trigger.
 * @param {OverlayAlign} align - Alignment along the selected side.
 * @param {number} offset - Gap between the trigger and panel in pixels.
 * @returns {ConnectedPosition} CDK connected-position configuration for this placement.
 */
function position(side: OverlaySide, align: OverlayAlign, offset: number): ConnectedPosition {
  if (side === 'top' || side === 'bottom') {
    return {
      originX: align,
      overlayX: align,
      originY: side,
      overlayY: side === 'top' ? 'bottom' : 'top',
      offsetY: side === 'top' ? -offset : offset,
    };
  }
  const y: 'center' | 'top' | 'bottom' =
    align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center';
  return {
    originX: side === 'left' ? 'start' : 'end',
    overlayX: side === 'left' ? 'end' : 'start',
    originY: y,
    overlayY: y,
    offsetX: side === 'left' ? -offset : offset,
  };
}

/**
 * Function connectedPositions
 *
 * @description
 * Returns the preferred overlay placement followed by its opposite-side fallback.
 *
 * @param {OverlaySide} side - Preferred side of the trigger.
 * @param {OverlayAlign} align - Alignment along each candidate side.
 * @param {number} offset - Gap between the trigger and panel in pixels.
 * @returns {ConnectedPosition[]} Ordered CDK placements for viewport fitting.
 */
export function connectedPositions(
  side: OverlaySide,
  align: OverlayAlign,
  offset: number,
): ConnectedPosition[] {
  return [position(side, align, offset), position(opposite[side], align, offset)];
}
