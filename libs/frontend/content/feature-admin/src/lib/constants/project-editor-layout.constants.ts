import type { ResizableLayout } from '@vfortin/ui';

/**
 * Constant PROJECT_EDITOR_NARROW_QUERY
 *
 * @description
 * Media query below which the project editor moves its properties into a right sheet, matching the
 * editor's `@max-[1180px]` container variants (the administration layout spans the viewport).
 *
 * @type {string}
 */
export const PROJECT_EDITOR_NARROW_QUERY = '(max-width: 1179.98px)' as const;

/**
 * Constant PROJECT_EDITOR_LAYOUT
 *
 * @description
 * Resizable split of the project form and the properties panel, remembered per viewer. The panel
 * stays between 300 and 480 px whatever the window, so that its fields keep a usable width; the form
 * keeps at least 40 % of the page. 26.5 % gives the 320 px default at 1440 px; bound to
 * `defaultSize` as `'<n>px'` from `readPixels`, the panel opens at 320 px on every window and keeps
 * its width when the window changes (`pixels`). A stored percentage layout is clamped to the bounds.
 */
export const PROJECT_EDITOR_LAYOUT = {
  key: 'portfolio.admin.layout.project-editor',
  sizes: [73.5, 26.5],
  limits: [
    { min: 40, max: 90 },
    { min: '300px', max: '480px' },
  ],
  pixels: { index: 1, default: 320 },
} as const satisfies ResizableLayout;
