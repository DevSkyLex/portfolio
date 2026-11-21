import type {
  AdminProject,
  PublicationTaxonomyDraft,
} from '@vfortin/content-web-data-access/admin';
import { articleTags, publicationTagKey } from '@vfortin/content-web-data-access/admin';
import { TECHS, publicationTags, techDefinition, techKey } from '@vfortin/content-web-ui';
import type { ContentLocale } from '@internal/content-web-feature-admin/lib/models/content-locale/content-locale.type';

/** Fills catalogue labels for legacy keys and keeps the preferred bilingual tag for each key. */
export function editableArticleTags(
  tags: NonNullable<AdminProject['taxonomy']>['tags'],
): PublicationTaxonomyDraft['tags'] {
  const choices: Map<string, PublicationTaxonomyDraft['tags'][number]> = new Map();
  for (const tag of tags) {
    const key: string = techKey(tag.key);
    if (choices.has(key)) continue;
    const catalogueLabel: string = techDefinition(key).label;
    choices.set(key, {
      key,
      label: {
        fr: tag.label.fr === tag.key ? catalogueLabel : tag.label.fr,
        en: tag.label.en === tag.key ? catalogueLabel : (tag.label.en ?? ''),
      },
    });
  }
  return [...choices.values()];
}

/** Reads the same display names and keys as the public catalogue for an admin list row. */
export function localizedArticleTags(
  article: Pick<AdminProject, 'taxonomy' | 'techs'>,
  locale: ContentLocale,
): ReturnType<typeof publicationTags> {
  return publicationTags(
    articleTags(article).map(({ key, label }) => ({ key, label: label[locale] || label.fr })),
  );
}

/** Resolves a manually entered known technology onto its catalogue key before saving. */
export function editedTagKey(tag: PublicationTaxonomyDraft['tags'][number]): string {
  if (tag.key) return tag.key;
  const key: string = techKey(tag.label.fr);
  return Object.hasOwn(TECHS, key) ? key : publicationTagKey(tag.label.fr);
}
