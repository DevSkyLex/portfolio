import type { ResizableLayout } from '@vfortin/ui';

/**
 * Constant ADMIN_SIDEBAR_LAYOUT
 *
 * @description
 * Resizable split of the sidebar and the page, remembered per viewer as the sidebar's width in
 * pixels: 232 px by default (D36), between 200 and 360 px whatever the window, so that names and
 * entries never truncate on a laptop. The percentages are the split before the first measure; the
 * page keeps at least half of the window. A percentage layout stored before falls back to 232 px.
 */
export const ADMIN_SIDEBAR_LAYOUT = {
  key: 'portfolio.admin.layout.sidebar',
  sizes: [16, 84],
  limits: [
    { min: '200px', max: '360px' },
    { min: 50, max: 100 },
  ],
  pixels: { index: 0, default: 232 },
} as const satisfies ResizableLayout;

/**
 * Constant ADMIN_SIDEBAR_COLLAPSED_KEY
 *
 * @description
 * `localStorage` key of the sidebar's collapsed state, per viewer: `true` keeps the 56 px icon rail
 * (D36), anything else, missing or unreadable expands the sidebar to its stored width.
 *
 * @type {string}
 */
export const ADMIN_SIDEBAR_COLLAPSED_KEY = 'portfolio.admin.layout.sidebar-collapsed' as const;

/**
 * Constant ADMIN_SIDEBAR_SHORTCUT
 *
 * @description
 * Toggle shortcut of the sidebar, a single `[` outside fields and dialogs. Ctrl/Cmd+B is the article
 * editor's bold and Ctrl/Cmd+\ needs AltGr on a French keyboard, where AltGr itself reports Ctrl; `[`
 * is matched on the character produced, so AltGr+5 (AZERTY) and Option+Shift+5 (Apple AZERTY) work.
 *
 * @type {readonly string[]}
 */
export const ADMIN_SIDEBAR_SHORTCUT: readonly string[] = ['['];
