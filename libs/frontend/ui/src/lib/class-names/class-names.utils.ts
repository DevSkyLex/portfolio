import { type ClassValue, clsx } from 'clsx';
import { type ClassNameValue, extendTailwindMerge } from 'tailwind-merge';

/**
 * Configuration twMerge
 *
 * @description
 * Extends Tailwind conflict groups with Orbite font sizes, radii, easings, and animations so these
 * utility classes merge without being mistaken for built-in colour or spacing groups.
 */
const twMerge: (...classLists: ClassNameValue[]) => string = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'hero',
        'hero-sm',
        'd1',
        'd1-sm',
        'd2',
        'd2-sm',
        'd3',
        'lead',
        'lead-sm',
        'body',
        'small',
        'control',
        'label',
        'data',
        'code',
      ],
      radius: ['field', 'option', 'card'],
      ease: ['orbit', 'orbit-in-out', 'orbit-roll'],
      animate: ['fade-up', 'menu-in'],
    },
  },
});

/**
 * Function cn
 *
 * @description
 * Combines conditional class values and resolves conflicting Tailwind utilities with the Orbite
 * theme groups configured by this module.
 *
 * @param {...ClassValue[]} inputs - Class values accepted by `clsx`.
 *
 * @returns {string} Normalized class list with the last conflicting utility retained.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
