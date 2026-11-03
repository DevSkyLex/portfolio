import {
  PaginationDirective,
  PaginationContentDirective,
  PaginationItemDirective,
  PaginationLinkDirective,
  PaginationPreviousComponent,
  PaginationNextComponent,
  PaginationEllipsisComponent,
} from '@internal/ui/lib/pagination/pagination.directive';

/**
 * Constant PAGINATION_IMPORTS
 *
 * @description
 * Standalone pagination directives and components required by the numbered pagination template.
 *
 * @type {readonly (typeof PaginationDirective | typeof PaginationContentDirective | typeof PaginationItemDirective | typeof PaginationLinkDirective | typeof PaginationPreviousComponent | typeof PaginationNextComponent | typeof PaginationEllipsisComponent)[]}
 */
export const PAGINATION_IMPORTS = [
  PaginationDirective,
  PaginationContentDirective,
  PaginationItemDirective,
  PaginationLinkDirective,
  PaginationPreviousComponent,
  PaginationNextComponent,
  PaginationEllipsisComponent,
] as const;
