/**
 * Constant navigationLinkClasses
 *
 * @description
 * Shared top-level link and disclosure-trigger classes, including current-page and expanded states.
 *
 * @type {string}
 */
export const navigationLinkClasses: string = [
  'group inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-control whitespace-nowrap text-fg-muted',
  'transition-colors duration-(--dur-pop) ease-orbit hover:text-fg aria-expanded:text-fg aria-[current=page]:text-fg',
  'motion-reduce:transition-none',
].join(' ');
