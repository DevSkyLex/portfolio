import { DropdownMenuPanelImports } from '@internal/ui/lib/dropdown-menu/constants/dropdown-menu.imports';
import {
  MenubarDirective,
  MenubarTriggerDirective,
} from '@internal/ui/lib/menubar/menubar.directive';

/**
 * Constant MenubarImports
 *
 * @description
 * Standalone menubar directives and dropdown panel parts for application templates.
 */
export const MenubarImports = [
  MenubarDirective,
  MenubarTriggerDirective,
  ...DropdownMenuPanelImports,
] as const;
