/**
 * Constant OPTION_MOTION
 * @constant
 *
 * @description
 * Defines staggered option entry and shared exit transitions used with the select's sliding selection indicator.
 *
 * @type {string}
 */
export const OPTION_MOTION: string = [
  'z-1 bg-transparent hover:bg-transparent focus:bg-transparent data-active:bg-transparent',
  'transition-[opacity,translate,filter,background-color,color] duration-[300ms,400ms,300ms,150ms,150ms] ease-orbit',
  'delay-[calc(80ms+var(--i,0)*35ms),calc(80ms+var(--i,0)*35ms),calc(80ms+var(--i,0)*35ms),0s,0s]',
  'starting:-translate-y-1.5 starting:opacity-0 starting:blur-[3px]',
  'in-data-closing:-translate-y-1.5 in-data-closing:opacity-0 in-data-closing:blur-[3px] in-data-closing:duration-80 in-data-closing:delay-0',
  'motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100 motion-reduce:starting:blur-none',
  'motion-reduce:in-data-closing:translate-y-0 motion-reduce:in-data-closing:opacity-100 motion-reduce:in-data-closing:blur-none',
].join(' ');
