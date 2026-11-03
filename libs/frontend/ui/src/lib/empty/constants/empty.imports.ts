import {
  EmptyDirective,
  EmptyHeaderDirective,
  EmptyMediaDirective,
  EmptyTitleDirective,
  EmptyDescriptionDirective,
  EmptyContentDirective,
} from '@internal/ui/lib/empty/empty.directive';

/**
 * Constant EMPTY_IMPORTS
 *
 * @description
 * Standalone empty-state directives required to compose its container, heading, media, title,
 * description and action content.
 *
 * @type {readonly (typeof EmptyDirective | typeof EmptyHeaderDirective | typeof EmptyMediaDirective | typeof EmptyTitleDirective | typeof EmptyDescriptionDirective | typeof EmptyContentDirective)[]}
 */
export const EMPTY_IMPORTS = [
  EmptyDirective,
  EmptyHeaderDirective,
  EmptyMediaDirective,
  EmptyTitleDirective,
  EmptyDescriptionDirective,
  EmptyContentDirective,
] as const;
