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
