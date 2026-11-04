import type { ResizableLayout } from '@vfortin/ui';

/**
 * Constant INBOX_NARROW_QUERY
 *
 * @description
 * Media query below which the inbox stops showing two panes and opens a message in a right sheet,
 * matching the `@max-[1024px]` container variants of the administration layout, which spans the
 * viewport (D36).
 *
 * @type {string}
 */
export const INBOX_NARROW_QUERY = '(max-width: 1023.98px)' as const;

/**
 * Constant INBOX_PANES_LAYOUT
 *
 * @description
 * Resizable split of the message list and the reading pane, remembered per viewer. The list stays
 * between 320 and 560 px whatever the window; the reading pane keeps at least 30 % of the page.
 * 31.5 % gives the 380 px default at 1440 px; bound to `defaultSize` as `'<n>px'` from `readPixels`,
 * the list opens at 380 px on every window and keeps its width when the window changes (`pixels`).
 * A stored percentage layout is clamped to the bounds.
 */
export const INBOX_PANES_LAYOUT = {
  key: 'portfolio.admin.layout.inbox',
  sizes: [31.5, 68.5],
  limits: [
    { min: '320px', max: '560px' },
    { min: 30, max: 80 },
  ],
  pixels: { index: 0, default: 380 },
} as const satisfies ResizableLayout;
