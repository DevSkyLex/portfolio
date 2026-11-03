import { CommandGroupComponent } from '@internal/ui/lib/command/components/command-group/command-group.component';
import { CommandInputComponent } from '@internal/ui/lib/command/components/command-input/command-input.component';
import { CommandItemDirective } from '@internal/ui/lib/command/directives/command-item/command-item.directive';
import {
  CommandEmptyDirective,
  CommandListDirective,
  CommandSeparatorDirective,
  CommandShortcutDirective,
} from '@internal/ui/lib/command/directives/command-parts/command-parts.directive';
import { CommandComponent } from '@internal/ui/lib/command/command.component';

/**
 * Constant CommandImports
 *
 * @description
 * Standalone declarations required to compose the command palette and its search, list, grouping,
 * empty-state, item, separator and shortcut parts in a consumer's `imports` array.
 *
 * @type {readonly (typeof CommandComponent | typeof CommandInputComponent | typeof CommandListDirective | typeof CommandEmptyDirective | typeof CommandGroupComponent | typeof CommandItemDirective | typeof CommandSeparatorDirective | typeof CommandShortcutDirective)[]}
 */
export const CommandImports = [
  CommandComponent,
  CommandInputComponent,
  CommandListDirective,
  CommandEmptyDirective,
  CommandGroupComponent,
  CommandItemDirective,
  CommandSeparatorDirective,
  CommandShortcutDirective,
] as const;
