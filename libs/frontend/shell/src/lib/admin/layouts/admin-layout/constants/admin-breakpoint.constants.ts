/**
 * Constant ADMIN_NARROW_QUERY
 *
 * @description
 * Media query of the narrow administration layout: below 1024 px the sidebar turns into a top bar
 * whose secondary entries show their icon only, matching the layout's `@max-[1024px]` container
 * variants (the layout spans the viewport).
 *
 * @type {string}
 */
export const ADMIN_NARROW_QUERY = '(max-width: 1023.98px)' as const;

/**
 * Constant ADMIN_DOCUMENT_ATTRIBUTE
 *
 * @description
 * Attribute set on `<html>` while the administration layout is mounted; `apps/web/src/admin.css`
 * drops the stable scrollbar gutter under it, so that the CDK overlay container and the right-based
 * positions of end-aligned menus share one width. The public site keeps its gutter.
 *
 * @type {string}
 */
export const ADMIN_DOCUMENT_ATTRIBUTE = 'data-admin' as const;

/**
 * Constant ADMIN_SCROLLBAR_PROPERTY
 *
 * @description
 * Custom property on `<html>` holding the window scrollbar's width in pixels, given back by the
 * viewport-wide administration layout as its page margin.
 *
 * @type {string}
 */
export const ADMIN_SCROLLBAR_PROPERTY = '--admin-scrollbar' as const;
