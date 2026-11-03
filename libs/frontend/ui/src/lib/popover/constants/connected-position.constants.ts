import type { OverlaySide } from '@internal/ui/lib/popover/models/overlay/overlay-side.type';

/**
 * Constant opposite
 *
 * @description
 * Maps each overlay side to the side used when the preferred placement does not fit.
 *
 * @type {Record<OverlaySide, OverlaySide>}
 */
export const opposite: Record<OverlaySide, OverlaySide> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};
