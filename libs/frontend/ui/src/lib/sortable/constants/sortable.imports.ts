import {
  SortableHandleDirective,
  SortableItemDirective,
  SortableListDirective,
} from '@internal/ui/lib/sortable/sortable.directives';

/**
 * Constant SORTABLE_IMPORTS
 *
 * @description
 * The three sortable directives, imported together by a template.
 */
export const SORTABLE_IMPORTS = [
  SortableListDirective,
  SortableItemDirective,
  SortableHandleDirective,
] as const;
