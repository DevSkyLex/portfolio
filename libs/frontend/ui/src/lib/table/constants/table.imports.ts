import {
  TableContainerDirective,
  TableDirective,
  TableHeaderDirective,
  TableBodyDirective,
  TableFooterDirective,
  TableRowDirective,
  TableHeadDirective,
  TableCellDirective,
  TableCaptionDirective,
} from '@internal/ui/lib/table/table.directive';

/**
 * Constant TABLE_IMPORTS
 *
 * @description
 * Standalone directives used to compose the generic table structure.
 *
 * @type {readonly (typeof TableContainerDirective | typeof TableDirective | typeof TableHeaderDirective | typeof TableBodyDirective | typeof TableFooterDirective | typeof TableRowDirective | typeof TableHeadDirective | typeof TableCellDirective | typeof TableCaptionDirective)[]}
 */
export const TABLE_IMPORTS = [
  TableContainerDirective,
  TableDirective,
  TableHeaderDirective,
  TableBodyDirective,
  TableFooterDirective,
  TableRowDirective,
  TableHeadDirective,
  TableCellDirective,
  TableCaptionDirective,
] as const;
