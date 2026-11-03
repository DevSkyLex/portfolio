import { ContextMenuTriggerDirective } from '@internal/ui/lib/context-menu/directives/context-menu-trigger/context-menu-trigger.directive';
import { DropdownMenuPanelImports } from '@internal/ui/lib/dropdown-menu/constants/dropdown-menu.imports';

/**
 * Constant ContextMenuImports
 *
 * @description
 * Imports the context trigger adapter and the dropdown-menu primitives required to define its panel.
 *
 * @type {readonly (typeof ContextMenuTriggerDirective | (typeof DropdownMenuPanelImports)[number])[]}
 */
export const ContextMenuImports = [
  ContextMenuTriggerDirective,
  ...DropdownMenuPanelImports,
] as const;
