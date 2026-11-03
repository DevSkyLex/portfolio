import {
  DropdownMenuContentDirective,
  DropdownMenuSubContentDirective,
} from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-content/dropdown-menu-content.directive';
import {
  DropdownMenuItemIndicatorComponent,
  DropdownMenuSubIndicatorComponent,
} from '@internal/ui/lib/dropdown-menu/components/dropdown-menu-indicator/dropdown-menu-indicator.component';
import {
  DropdownMenuItemDirective,
  DropdownMenuSubTriggerDirective,
} from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-item/dropdown-menu-item.directive';
import {
  DropdownMenuGroupDirective,
  DropdownMenuLabelDirective,
  DropdownMenuSeparatorDirective,
  DropdownMenuShortcutDirective,
} from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-parts/dropdown-menu-parts.directive';
import {
  DropdownMenuCheckboxItemDirective,
  DropdownMenuRadioGroupDirective,
  DropdownMenuRadioItemDirective,
} from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-selectable/dropdown-menu-selectable.directive';
import { DropdownMenuTriggerDirective } from '@internal/ui/lib/dropdown-menu/directives/dropdown-menu-trigger/dropdown-menu-trigger.directive';

/**
 * Constant DropdownMenuPanelImports
 *
 * @description
 * Dropdown panel directives and indicators composed by dropdown, context and menubar triggers.
 *
 * @type {readonly (typeof DropdownMenuContentDirective | typeof DropdownMenuSubContentDirective | typeof DropdownMenuItemDirective | typeof DropdownMenuSubTriggerDirective | typeof DropdownMenuCheckboxItemDirective | typeof DropdownMenuRadioGroupDirective | typeof DropdownMenuRadioItemDirective | typeof DropdownMenuItemIndicatorComponent | typeof DropdownMenuSubIndicatorComponent | typeof DropdownMenuLabelDirective | typeof DropdownMenuGroupDirective | typeof DropdownMenuSeparatorDirective | typeof DropdownMenuShortcutDirective)[]}
 */
export const DropdownMenuPanelImports = [
  DropdownMenuContentDirective,
  DropdownMenuSubContentDirective,
  DropdownMenuItemDirective,
  DropdownMenuSubTriggerDirective,
  DropdownMenuCheckboxItemDirective,
  DropdownMenuRadioGroupDirective,
  DropdownMenuRadioItemDirective,
  DropdownMenuItemIndicatorComponent,
  DropdownMenuSubIndicatorComponent,
  DropdownMenuLabelDirective,
  DropdownMenuGroupDirective,
  DropdownMenuSeparatorDirective,
  DropdownMenuShortcutDirective,
] as const;

/**
 * Constant DropdownMenuImports
 *
 * @description
 * Complete dropdown menu import set containing its trigger and all shared panel parts.
 *
 * @type {readonly (typeof DropdownMenuTriggerDirective | (typeof DropdownMenuPanelImports)[number])[]}
 */
export const DropdownMenuImports = [
  DropdownMenuTriggerDirective,
  ...DropdownMenuPanelImports,
] as const;
