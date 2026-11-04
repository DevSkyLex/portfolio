/**
 * Constant dialogHeaderClasses
 *
 * @description
 * Shared spacing and close-button clearance for the dialog header.
 *
 * @type {string}
 */
export const dialogHeaderClasses: string = 'flex flex-col gap-2 pr-8 text-left';

/**
 * Constant dialogHeaderBarClasses
 *
 * @description
 * Header bar flush with the panel's top and side edges (Linear and Raycast modals, D36): negative
 * margins cancel the panel's `--dialog-inset` padding and a hairline separates it from the body. It
 * keeps the panel's own surface. Its height matches the footer bar (`min-h-13`), its inline padding
 * matches the panel's and never drops below `--spacing(4)`; the dialog header adds the clearance of
 * the built-in close button, which the panel then centres on the bar's first line.
 *
 * @type {string}
 */
export const dialogHeaderBarClasses: string =
  '-mx-(--dialog-inset) -mt-(--dialog-inset) flex min-h-13 flex-col justify-center gap-0.5 border-b border-border px-[max(--spacing(4),var(--dialog-inset))] py-3 text-left';

/**
 * Constant dialogTitleClasses
 *
 * @description
 * Display typography and foreground color used for dialog titles.
 *
 * @type {string}
 */
export const dialogTitleClasses: string = 'text-d3 text-fg';

/**
 * Constant dialogDescriptionClasses
 *
 * @description
 * Small muted text treatment used for dialog descriptions.
 *
 * @type {string}
 */
export const dialogDescriptionClasses: string = 'text-small text-fg-muted';

/**
 * Constant dialogFooterClasses
 *
 * @description
 * Responsive footer layout that stacks actions on narrow screens and aligns them at wider sizes.
 *
 * @type {string}
 */
export const dialogFooterClasses: string =
  'flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end';

/**
 * Constant dialogFooterBarClasses
 *
 * @description
 * Footer bar flush with the panel's bottom and side edges (Linear and Raycast modals, D36): negative
 * margins cancel the panel's `--dialog-inset` padding, the panel's `overflow-y-auto` clips it to the
 * rounded corners, and `sticky` keeps it visible while a long body scrolls, on the panel's own
 * surface so the body passes under it unseen (`z-30` keeps it above the body's raised layers, such as
 * the `z-20` native input of `ui-input-otp`); only a hairline separates it from the body. Browsers
 * resolve a sticky offset against the scroll container's padding-inset edge, so `bottom-0` would stop
 * the bar `--dialog-inset` above the panel edge, over the last lines of the body, with an empty strip
 * below it; `-bottom-(--dialog-inset)` moves that edge back to the panel's padding box, where the
 * negative bottom margin already rests the bar in the flow, so the bar never shifts.
 * Keyboard hints sit at the start; a trailing group pushed with `ml-auto` holds the actions and wraps
 * under the hints on narrow screens. Its height matches the header bar (`min-h-13`) and its inline
 * padding matches the panel's, never dropping below `--spacing(4)`.
 *
 * @type {string}
 */
export const dialogFooterBarClasses: string =
  'sticky -bottom-(--dialog-inset) z-30 -mx-(--dialog-inset) -mb-(--dialog-inset) flex min-h-13 flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-surface-raised px-[max(--spacing(4),var(--dialog-inset))] py-2.5';
