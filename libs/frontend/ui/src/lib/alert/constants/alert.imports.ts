import {
  AlertDirective,
  AlertTitleDirective,
  AlertDescriptionDirective,
} from '@internal/ui/lib/alert/alert.directive';

/**
 * Constant ALERT_IMPORTS
 *
 * @description
 * Directives required to render an alert container, title, and description.
 *
 * @type {readonly [typeof AlertDirective, typeof AlertTitleDirective, typeof AlertDescriptionDirective]}
 */
export const ALERT_IMPORTS = [
  AlertDirective,
  AlertTitleDirective,
  AlertDescriptionDirective,
] as const;
