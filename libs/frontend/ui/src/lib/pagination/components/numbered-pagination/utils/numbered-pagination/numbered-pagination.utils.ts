import type { PaginationRangeItem } from '@internal/ui/lib/pagination/components/numbered-pagination/models/pagination-range-item.type';

/**
 * Function range
 *
 * @description
 * Creates every integer page number between the inclusive lower and upper bounds.
 *
 * @param {number} from - First page number in the result.
 * @param {number} to - Last page number in the result.
 * @returns {number[]} Consecutive page numbers from `from` through `to`.
 */
function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_: unknown, index: number): number => from + index);
}

/**
 * Function paginationRange
 *
 * @description
 * Builds the visible page sequence with first and last pages, adjacent siblings, and ellipses
 * wherever intermediate pages are omitted. The sequence length stays stable while paging.
 *
 * @param {number} page - Requested current page; values are clamped to the available range.
 * @param {number} totalPages - Requested page count; values below one produce a single page.
 * @param {number} siblings - Number of adjacent pages to include on each side of the current page.
 * @returns {PaginationRangeItem[]} Ordered page numbers and omitted-range markers.
 */
export function paginationRange(
  page: number,
  totalPages: number,
  siblings: number = 1,
): PaginationRangeItem[] {
  const total: number = Math.max(1, Math.floor(totalPages));
  const current: number = Math.min(Math.max(1, Math.floor(page)), total);

  // First, last, current, two siblings sets and two gaps.
  const slots: number = 2 * siblings + 5;
  if (total <= slots) {
    return range(1, total);
  }
  const left: number = Math.max(current - siblings, 1);
  const right: number = Math.min(current + siblings, total);
  const startGap: boolean = left > 2;
  const endGap: boolean = right < total - 1;
  const edge: number = 3 + 2 * siblings;
  if (!startGap) {
    return [...range(1, edge), 'end-ellipsis', total];
  }
  if (!endGap) {
    return [1, 'start-ellipsis', ...range(total - edge + 1, total)];
  }
  return [1, 'start-ellipsis', ...range(left, right), 'end-ellipsis', total];
}
