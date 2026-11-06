import type { ResizableLayout } from '@vfortin/ui';

/**
 * Constant DASHBOARD_NARROW_QUERY
 *
 * @description
 * Media query below which the dashboard moves its side panel into a « Détails » sheet and its
 * window controls back into the page header, matching the page's `@max-[1180px]` container variants
 * as the project editor does (`PROJECT_EDITOR_NARROW_QUERY`).
 *
 * @type {string}
 */
export const DASHBOARD_NARROW_QUERY = '(max-width: 1179.98px)' as const;

/**
 * Constant DASHBOARD_LAYOUT
 *
 * @description
 * Resizable split of the reports and the side panel (window, refresh, key figures, sources),
 * remembered per viewer like the project editor's (`PROJECT_EDITOR_LAYOUT`): the panel opens at
 * 320 px on every window and stays between 280 and 440 px; the reports keep at least half the page.
 */
export const DASHBOARD_LAYOUT = {
  key: 'portfolio.admin.layout.dashboard',
  sizes: [73.5, 26.5],
  limits: [
    { min: 50, max: 90 },
    { min: '280px', max: '440px' },
  ],
  pixels: { index: 1, default: 320 },
} as const satisfies ResizableLayout;
