/**
 * Constant CONTACT_LINK_CLASS
 *
 * @description
 * Classes of the e-mail and profile links: full ink, an underline appears under the pointer (D35).
 *
 * @type {string}
 */
export const CONTACT_LINK_CLASS =
  'inline-flex min-h-9 items-center text-[17px]/5 text-star underline decoration-transparent decoration-1 underline-offset-[6px] transition-[text-decoration-color] duration-(--dur-pop) ease-orbit hover:decoration-current focus-visible:decoration-current motion-reduce:transition-none' as const;

/**
 * Constant CONTACT_REVEAL_CLASS
 *
 * @description
 * One-time entrance transition of the two columns; the reveal directive controls visibility and
 * `--rd` staggers it.
 *
 * @type {string}
 */
export const CONTACT_REVEAL_CLASS =
  'transition-[opacity,translate] duration-(--dur-reveal) ease-orbit delay-(--rd) in-data-js:not-data-in:translate-y-6 in-data-js:not-data-in:opacity-0 motion-reduce:transition-none' as const;
