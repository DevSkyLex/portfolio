/**
 * Constant INITIAL_FOCUS
 *
 * @description
 * Focuses a cancel control wherever it appears; falls back to the action only when no cancel control
 * is present, independent of footer DOM order.
 */
export const INITIAL_FOCUS: string =
  '[data-slot="alert-dialog-cancel"], [data-slot="alert-dialog-content"]:not(:has([data-slot="alert-dialog-cancel"])) [data-slot="alert-dialog-action"]';
