import {
  DisplayDirective,
  H1Directive,
  H2Directive,
  H3Directive,
  H4Directive,
  ParagraphDirective,
  LeadDirective,
  LargeDirective,
  SmallDirective,
  MutedDirective,
  OverlineDirective,
  DataDirective,
  BlockquoteDirective,
  InlineCodeDirective,
  ListDirective,
} from '@internal/ui/lib/typography/typography.directive';

/**
 * Constant TYPOGRAPHY_IMPORTS
 *
 * @description
 * Standalone directives used by templates that need typography styles from the catalogue.
 *
 * @type {readonly (typeof DisplayDirective | typeof H1Directive | typeof H2Directive | typeof H3Directive | typeof H4Directive | typeof ParagraphDirective | typeof LeadDirective | typeof LargeDirective | typeof SmallDirective | typeof MutedDirective | typeof OverlineDirective | typeof DataDirective | typeof BlockquoteDirective | typeof InlineCodeDirective | typeof ListDirective)[]}
 */
export const TYPOGRAPHY_IMPORTS = [
  DisplayDirective,
  H1Directive,
  H2Directive,
  H3Directive,
  H4Directive,
  ParagraphDirective,
  LeadDirective,
  LargeDirective,
  SmallDirective,
  MutedDirective,
  OverlineDirective,
  DataDirective,
  BlockquoteDirective,
  InlineCodeDirective,
  ListDirective,
] as const;
