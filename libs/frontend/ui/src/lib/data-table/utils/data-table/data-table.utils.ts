import type { CellValue } from '@internal/ui/lib/data-table/models/data-table/cell-value.type';
import type { DataTableSort } from '@internal/ui/lib/data-table/models/data-table/data-table-sort.interface';
import type { SortDirection } from '@internal/ui/lib/data-table/models/data-table/sort-direction.type';

/**
 * Function compareValues
 *
 * @description
 * Compares supported cell values, ordering empty values after populated values and using the supplied
 * locale collator for mixed or textual values.
 *
 * @param {CellValue} a - First cell value.
 * @param {CellValue} b - Second cell value.
 * @param {Intl.Collator} collator - Locale-aware comparator used for string representations.
 * @returns {number} Negative, zero or positive comparison result.
 */
export function compareValues(a: CellValue, b: CellValue, collator: Intl.Collator): number {
  const empty = (value: CellValue): boolean =>
    value === null || value === undefined || value === '';
  if (empty(a) || empty(b)) return Number(empty(a)) - Number(empty(b));
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

/**
 * Function sortRows
 *
 * @description
 * Sorts rows by a derived cell value while preserving input order for equal values and keeping empty
 * cells last in either direction.
 *
 * @template T - Row model being sorted.
 * @param {readonly T[]} rows - Rows to order.
 * @param {(row: T) => CellValue} value - Cell value selector.
 * @param {SortDirection} direction - Requested populated-value order.
 * @param {Intl.Collator} collator - Locale-aware comparator for textual values.
 * @returns {T[]} Sorted row copy; the input array is not mutated.
 */
export function sortRows<T>(
  rows: readonly T[],
  value: (row: T) => CellValue,
  direction: SortDirection,
  collator: Intl.Collator,
): T[] {
  const sign: 1 | -1 = direction === 'asc' ? 1 : -1;
  const empty = (cell: CellValue): boolean => cell === null || cell === undefined || cell === '';
  return rows
    .map((row) => ({ row, cell: value(row) }))
    .sort((a, b) => {
      if (empty(a.cell) || empty(b.cell)) return compareValues(a.cell, b.cell, collator);
      return sign * compareValues(a.cell, b.cell, collator);
    })
    .map(({ row }) => row);
}

/**
 * Function normalizeText
 *
 * @description
 * Removes combining diacritics and lowercases text so French queries match accented cell values.
 *
 * @param {string} text - Text to normalize.
 * @returns {string} Lowercase text without combining diacritic marks.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Function filterRows
 *
 * @description
 * Retains rows where every normalized query word occurs in the joined selected cell values.
 *
 * @template T - Row model being filtered.
 * @param {readonly T[]} rows - Candidate rows.
 * @param {string} query - Space-separated search terms.
 * @param {(row: T) => readonly CellValue[]} values - Values included in text matching.
 * @returns {T[]} Filtered row copy, preserving the original order.
 */
export function filterRows<T>(
  rows: readonly T[],
  query: string,
  values: (row: T) => readonly CellValue[],
): T[] {
  const words: string[] = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...rows];
  return rows.filter((row) => {
    const text: string = normalizeText(
      values(row)
        .filter((value) => value !== null && value !== undefined)
        .map((value) => (value instanceof Date ? value.toISOString() : String(value)))
        .join(' '),
    );
    return words.every((word) => text.includes(word));
  });
}

/**
 * Function pageCount
 *
 * @description
 * Computes the number of pages while retaining one empty page for an empty collection and guarding
 * against a zero page size.
 *
 * @param {number} total - Number of filtered and sorted rows.
 * @param {number} pageSize - Requested rows per page.
 * @returns {number} At least one page.
 */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/**
 * Function pageRows
 *
 * @description
 * Returns the slice of rows belonging to a zero-based page.
 *
 * @template T - Row model contained by the page.
 * @param {readonly T[]} rows - Ordered rows to paginate.
 * @param {number} page - Zero-based page index.
 * @param {number} pageSize - Maximum rows returned for this page.
 * @returns {T[]} Page rows in source order.
 */
export function pageRows<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  return rows.slice(page * pageSize, (page + 1) * pageSize);
}

/**
 * Function nextSort
 *
 * @description
 * Advances a header through ascending, descending and unsorted states; choosing another column starts
 * in ascending order.
 *
 * @param {DataTableSort | null} current - Existing sort state.
 * @param {string} column - Column id whose header was activated.
 * @returns {DataTableSort | null} Next sort state, or `null` when the current column is cleared.
 */
export function nextSort(current: DataTableSort | null, column: string): DataTableSort | null {
  if (current?.column !== column) return { column, direction: 'asc' };
  return current.direction === 'asc' ? { column, direction: 'desc' } : null;
}
