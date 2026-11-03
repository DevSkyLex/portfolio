import {
  AvatarDirective,
  AvatarImageDirective,
  AvatarFallbackDirective,
} from '@internal/ui/lib/avatar/avatar.directive';

/**
 * Constant AVATAR_IMPORTS
 *
 * @description
 * Directives needed to render an avatar image and its load-aware fallback.
 *
 * @type {readonly [typeof AvatarDirective, typeof AvatarImageDirective, typeof AvatarFallbackDirective]}
 */
export const AVATAR_IMPORTS = [
  AvatarDirective,
  AvatarImageDirective,
  AvatarFallbackDirective,
] as const;
