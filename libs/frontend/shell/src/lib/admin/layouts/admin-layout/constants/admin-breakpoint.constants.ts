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
