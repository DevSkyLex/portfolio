/**
 * Type ToggleGroupValue
 * @typedef ToggleGroupValue
 * @template T
 *
 * @description
 * Value shape returned by a toggle group: a single value or null in single mode, and a readonly list in multiple mode.
 */
export type ToggleGroupValue<T> = T | readonly T[] | null;
