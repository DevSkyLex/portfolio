/**
 * Constant SIDEBAR_ITEM
 *
 * @description
 * Classes of a sidebar entry: 32 px rows in 13 px type, as in a product tool (D36).
 *
 * @type {string}
 */
export const SIDEBAR_ITEM =
  'flex h-8 items-center gap-2.5 rounded-sm px-2 text-[13px] font-medium text-fg-muted outline-2 outline-offset-0 outline-transparent transition-colors duration-(--dur-pop) ease-orbit hover:bg-surface-hover hover:text-fg focus-visible:outline-accent/55' as const;

/**
 * Constant SIDEBAR_COMPACT_WIDTH
 *
 * @description
 * Sidebar width, in pixels, below which the search entry drops its key caps so that its label never
 * truncates.
 *
 * @type {number}
 */
export const SIDEBAR_COMPACT_WIDTH = 224 as const;
