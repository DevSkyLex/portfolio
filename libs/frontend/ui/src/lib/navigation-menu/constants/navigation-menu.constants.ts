/**
 * Constant navigationLinkClasses
 *
 * @description
 * Shared top-level link and disclosure-trigger classes, including current-page and expanded states.
 *
 * @type {string}
 */
export const navigationLinkClasses: string = [
  'group inline-flex h-11 items-center gap-1.5 rounded-option px-3 text-control whitespace-nowrap text-star-muted',
  'transition-colors duration-(--dur-pop) ease-orbit hover:text-star aria-expanded:text-star aria-[current=page]:text-star',
  'motion-reduce:transition-none',
].join(' ');
