/**
 * Constant SIDEBAR_ITEM
 *
 * @description
 * Classes of a sidebar entry: 32 px rows in 13 px type, as in a product tool (D36).
 *
 * @type {string}
 */
export const SIDEBAR_ITEM =
  'flex h-8 items-center gap-2.5 rounded-option px-2 text-[13px] font-medium text-star-muted outline-2 outline-offset-0 outline-transparent transition-colors duration-(--dur-pop) ease-orbit hover:bg-star/5 hover:text-star focus-visible:outline-signal/55' as const;
