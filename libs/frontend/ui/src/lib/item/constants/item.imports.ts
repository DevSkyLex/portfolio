import {
  ItemGroupDirective,
  ItemDirective,
  ItemMediaDirective,
  ItemContentDirective,
  ItemTitleDirective,
  ItemDescriptionDirective,
  ItemActionsDirective,
  ItemHeaderDirective,
  ItemFooterDirective,
  ItemSeparatorDirective,
} from '@internal/ui/lib/item/item.directive';

/**
 * Constant ITEM_IMPORTS
 *
 * @description
 * Standalone directives exported as the item component's template import bundle.
 */
export const ITEM_IMPORTS = [
  ItemGroupDirective,
  ItemDirective,
  ItemMediaDirective,
  ItemContentDirective,
  ItemTitleDirective,
  ItemDescriptionDirective,
  ItemActionsDirective,
  ItemHeaderDirective,
  ItemFooterDirective,
  ItemSeparatorDirective,
] as const;
