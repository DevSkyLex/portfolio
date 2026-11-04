import type { TagsInputAnnouncements } from '@internal/ui/lib/tags-input/models/tags-input-announcements.interface';

/**
 * Constant TAGS_INPUT_ANNOUNCEMENTS
 * @readonly
 *
 * @description
 * Default French live-region messages of `ui-tags-input`, localized when they are read.
 *
 * @type {TagsInputAnnouncements}
 */
export const TAGS_INPUT_ANNOUNCEMENTS: TagsInputAnnouncements = {
  added: (tag: string): string => $localize`:@@ui.tags-input.added:${tag}:tag: ajouté`,
  removed: (tag: string): string => $localize`:@@ui.tags-input.removed:${tag}:tag: retiré`,
  duplicate: (tag: string): string =>
    $localize`:@@ui.tags-input.duplicate:${tag}:tag: est déjà dans la liste`,
  limit: (max: number): string => $localize`:@@ui.tags-input.limit:${max}:max: valeurs au maximum`,
};
