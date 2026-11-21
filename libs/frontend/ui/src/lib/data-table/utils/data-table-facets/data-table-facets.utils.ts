import type { DataTableFacet } from '@internal/ui/lib/data-table/models/data-table/data-table-facet.interface';
import type { DataTableFacetOption } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-option.interface';
import type { DataTableFacetView } from '@internal/ui/lib/data-table/models/data-table/data-table-facet-view.interface';

/**
 * Function facetValues
 *
 * @description
 * Values of a row for a facet, as a list whatever the accessor returns.
 *
 * @template T - Row model.
 * @param {DataTableFacet<T>} facet - Facet definition.
 * @param {T} row - Row read.
 * @returns {readonly string[]} The row's values for the facet.
 */
export function facetValues<T>(facet: DataTableFacet<T>, row: T): readonly string[] {
  const value: string | readonly string[] = facet.value(row);
  return typeof value === 'string' ? [value] : value;
}

/**
 * Function matchesFacets
 *
 * @description
 * Whether a row passes every facet with checked values (OR within a facet, AND across facets),
 * optionally ignoring one facet, as its own option counts require.
 *
 * @template T - Row model.
 * @param {T} row - Row tested.
 * @param {readonly DataTableFacet<T>[]} facets - Facet definitions.
 * @param {Readonly<Record<string, readonly string[]>>} selected - Checked values per facet id.
 * @param {string} [ignored] - Facet id left out of the test.
 * @returns {boolean} Whether the row passes.
 */
export function matchesFacets<T>(
  row: T,
  facets: readonly DataTableFacet<T>[],
  selected: Readonly<Record<string, readonly string[]>>,
  ignored?: string,
): boolean {
  return facets.every((facet) => {
    const checked: readonly string[] = selected[facet.id] ?? [];
    if (facet.id === ignored || !checked.length) return true;
    return facetValues(facet, row).some((value) => checked.includes(value));
  });
}

/**
 * Function facetOptions
 *
 * @description
 * Options of a facet: the declared ones, or the distinct values of the rows sorted with the collator
 * and labelled by themselves.
 *
 * @template T - Row model.
 * @param {DataTableFacet<T>} facet - Facet definition.
 * @param {readonly T[]} rows - Every row of the table.
 * @param {Intl.Collator} collator - Locale-aware comparator.
 * @returns {readonly DataTableFacetOption[]} Options in display order.
 */
export function facetOptions<T>(
  facet: DataTableFacet<T>,
  rows: readonly T[],
  collator: Intl.Collator,
): readonly DataTableFacetOption[] {
  if (facet.options) return facet.options;
  const values: Set<string> = new Set(rows.flatMap((row) => facetValues(facet, row)));
  return [...values]
    .sort((a, b) => collator.compare(a, b))
    .map((value) => ({ value, label: value }));
}

/** Counts each option within the search and every other selected facet. */
export function buildFacetViews<T>(
  facets: readonly DataTableFacet<T>[],
  rows: readonly T[],
  searched: readonly T[],
  selected: Readonly<Record<string, readonly string[]>>,
  collator: Intl.Collator,
): DataTableFacetView[] {
  return facets
    .map((facet) => {
      const pool: readonly T[] = searched.filter((row) =>
        matchesFacets(row, facets, selected, facet.id),
      );
      const checked: readonly string[] = selected[facet.id] ?? [];
      return {
        id: facet.id,
        label: facet.label,
        ...(facet.icon ? { icon: facet.icon } : {}),
        options: facetOptions(facet, rows, collator).map((option) => ({
          ...option,
          count: pool.filter((row) => facetValues(facet, row).includes(option.value)).length,
          selected: checked.includes(option.value),
        })),
      };
    })
    .filter((facet) => facet.options.length > 0);
}

/**
 * Function toggleValue
 *
 * @description
 * Adds a value to a list, or removes it when present.
 *
 * @param {readonly string[]} values - Current values.
 * @param {string} value - Value toggled.
 * @returns {string[]} New list.
 */
export function toggleValue(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
