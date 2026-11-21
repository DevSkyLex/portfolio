import type { ArticleTerm } from '@vfortin/content-web-model';
import { techDefinition } from '@internal/content-web-ui/lib/tech/utils/tech-definition/tech-definition.utils';
import { techKey } from '@internal/content-web-ui/lib/tech/utils/tech-key/tech-key.utils';

/** Resolves catalogue spellings and combines article tags with the technology keys of older snapshots. */
export function publicationTags(
  tags: readonly ArticleTerm[],
  techs: readonly string[] = [],
): ArticleTerm[] {
  const terms: Map<string, ArticleTerm> = new Map();
  for (const term of [...tags, ...techs.map((key): ArticleTerm => ({ key, label: key }))]) {
    const key: string = techKey(term.key);
    if (terms.has(key)) continue;
    terms.set(key, {
      key,
      label: term.label === term.key ? techDefinition(term.key).label : term.label,
    });
  }
  return [...terms.values()];
}
