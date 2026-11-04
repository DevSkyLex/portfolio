import { slugify } from '@internal/content-web-data-access/lib/utils/slugify/slugify.utils';

/**
 * Constant LAYOUT_IDS
 *
 * @description
 * Element ids of the site layout (skip-link target, menus, footer); a section never takes one, so a
 * heading such as « Content » cannot steal the skip link's target.
 */
const LAYOUT_IDS: readonly string[] = ['content', 'site-menu', 'footer-nav', 'footer-legal'];

/**
 * Function sectionIds
 *
 * @description
 * Gives each section of an article a unique fragment identifier: the slug of its label, `section-<n>`
 * (its one-based position) when the slug is empty, and the first free `-2`, `-3`… suffix when the
 * identifier is already taken by an earlier section or by the site layout (`LAYOUT_IDS`).
 *
 * @param {readonly string[]} labels - Section labels in document order.
 *
 * @returns {string[]} One identifier per label, in the same order.
 */
export function sectionIds(labels: readonly string[]): string[] {
  const used: Set<string> = new Set<string>(LAYOUT_IDS);
  return labels.map((label: string, index: number): string => {
    const base: string = slugify(label) || `section-${index + 1}`;
    let id: string = base;
    for (let suffix: number = 2; used.has(id); suffix++) id = `${base}-${suffix}`;
    used.add(id);
    return id;
  });
}
