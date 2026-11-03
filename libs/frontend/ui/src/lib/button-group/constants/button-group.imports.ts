import {
  ButtonGroupDirective,
  ButtonGroupTextDirective,
  ButtonGroupSeparatorDirective,
} from '@internal/ui/lib/button-group/button-group.directive';

/**
 * Constant BUTTON_GROUP_IMPORTS
 *
 * @description
 * Standalone button-group directives for consumer component imports.
 *
 * @type {readonly [typeof ButtonGroupDirective, typeof ButtonGroupTextDirective, typeof ButtonGroupSeparatorDirective]}
 */
export const BUTTON_GROUP_IMPORTS = [
  ButtonGroupDirective,
  ButtonGroupTextDirective,
  ButtonGroupSeparatorDirective,
] as const;
