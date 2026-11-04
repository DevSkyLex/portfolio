import {
  PageHeaderActionsDirective,
  PageHeaderMetaDirective,
  PageHeaderTabsDirective,
  PageHeaderTitleDirective,
} from '@internal/ui/lib/page-header/directives/page-header-parts/page-header-parts.directive';
import { PageHeaderComponent } from '@internal/ui/lib/page-header/page-header.component';

/**
 * Constant PAGE_HEADER_IMPORTS
 *
 * @description
 * The page header band and its slot directives for consumer component imports.
 *
 * @type {readonly [typeof PageHeaderComponent, typeof PageHeaderTitleDirective, typeof PageHeaderMetaDirective, typeof PageHeaderActionsDirective, typeof PageHeaderTabsDirective]}
 */
export const PAGE_HEADER_IMPORTS = [
  PageHeaderComponent,
  PageHeaderTitleDirective,
  PageHeaderMetaDirective,
  PageHeaderActionsDirective,
  PageHeaderTabsDirective,
] as const;
