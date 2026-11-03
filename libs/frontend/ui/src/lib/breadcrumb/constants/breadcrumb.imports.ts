import {
  BreadcrumbDirective,
  BreadcrumbListDirective,
  BreadcrumbItemDirective,
  BreadcrumbLinkDirective,
  BreadcrumbPageDirective,
  BreadcrumbSeparatorComponent,
  BreadcrumbEllipsisComponent,
} from '@internal/ui/lib/breadcrumb/breadcrumb.directive';

/**
 * Constant BREADCRUMB_IMPORTS
 *
 * @description
 * Standalone breadcrumb directives and components for consumer component imports.
 *
 * @type {readonly [typeof BreadcrumbDirective, typeof BreadcrumbListDirective, typeof BreadcrumbItemDirective, typeof BreadcrumbLinkDirective, typeof BreadcrumbPageDirective, typeof BreadcrumbSeparatorComponent, typeof BreadcrumbEllipsisComponent]}
 */
export const BREADCRUMB_IMPORTS = [
  BreadcrumbDirective,
  BreadcrumbListDirective,
  BreadcrumbItemDirective,
  BreadcrumbLinkDirective,
  BreadcrumbPageDirective,
  BreadcrumbSeparatorComponent,
  BreadcrumbEllipsisComponent,
] as const;
