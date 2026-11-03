import {
  CardDirective,
  CardHeaderDirective,
  CardTitleDirective,
  CardDescriptionDirective,
  CardActionDirective,
  CardContentDirective,
  CardFooterDirective,
} from '@internal/ui/lib/card/card.directive';

/**
 * Constant CARD_IMPORTS
 *
 * @description
 * Standalone card directives for consumer component imports.
 *
 * @type {readonly [typeof CardDirective, typeof CardHeaderDirective, typeof CardTitleDirective, typeof CardDescriptionDirective, typeof CardActionDirective, typeof CardContentDirective, typeof CardFooterDirective]}
 */
export const CARD_IMPORTS = [
  CardDirective,
  CardHeaderDirective,
  CardTitleDirective,
  CardDescriptionDirective,
  CardActionDirective,
  CardContentDirective,
  CardFooterDirective,
] as const;
