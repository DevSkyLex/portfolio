/**
 * Function articleOrder
 *
 * @description
 * Matches the mockup's case-study order: `T` is the project shape, featured projects come first, and regular cards rotate so the last home-row card follows the featured article.
 *
 * @param {readonly T[]} projects - Projects in the public home card order.
 *
 * @returns {T[]} Projects in article navigation order.
 */
export function articleOrder<T extends { readonly featured: boolean }>(
  projects: readonly T[],
): T[] {
  const featured: T[] = projects.filter((project: T): boolean => project.featured);
  const regular: T[] = projects.filter((project: T): boolean => !project.featured);
  return [...featured, ...regular.slice(-1), ...regular.slice(0, -1)];
}
