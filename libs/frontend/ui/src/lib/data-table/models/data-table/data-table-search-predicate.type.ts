/**
 * Type DataTableSearchPredicate
 * @type DataTableSearchPredicate
 *
 * @description
 * Consumer search replacing the default one (every word of the query in the searchable cell values,
 * case and accents ignored); receives the raw, untrimmed query and is only called for a non-blank one.
 *
 * @template T - Row model accepted by the table.
 */
export type DataTableSearchPredicate<T> = (row: T, query: string) => boolean;
