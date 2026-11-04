import type { DataTableDensity } from '@internal/ui/lib/data-table/models/data-table/data-table-density.type';

/**
 * Constant dataTableDensityClasses
 *
 * @description
 * Header, cell and text classes of each density: `compact` is the D36 admin list (32 px heading, 44 px
 * rows, 13 px text), `comfortable` the catalogue default.
 *
 * @type {Readonly<Record<DataTableDensity, { readonly table: string; readonly header: string; readonly cell: string }>>}
 */
export const dataTableDensityClasses: Readonly<
  Record<
    DataTableDensity,
    { readonly table: string; readonly header: string; readonly cell: string }
  >
> = {
  compact: {
    table: 'text-[13px] leading-5',
    header: 'h-8 px-3 text-[12px] font-medium text-fg-faint',
    cell: 'h-11 px-3 py-1.5',
  },
  comfortable: {
    table: 'text-data',
    header: 'h-11 px-3 font-mono text-label font-normal text-fg-faint uppercase',
    cell: 'px-3 py-3',
  },
};
