/**
 * Constant ARTICLE_SECTIONS
 *
 * @description
 * Editable article section keys in the order used to serialize revision requests.
 *
 * @type {readonly ['context', 'work', 'workList', 'choices', 'result', 'lessons', 'captions']}
 */
export const ARTICLE_SECTIONS: readonly [
  'context',
  'work',
  'workList',
  'choices',
  'result',
  'lessons',
  'captions',
] = ['context', 'work', 'workList', 'choices', 'result', 'lessons', 'captions'] as const;

/**
 * Type ArticleSection
 * @type ArticleSection
 *
 * @description
 * Article section key derived from the ordered section list.
 *
 * @type {(typeof ARTICLE_SECTIONS)[number]}
 */
export type ArticleSection = (typeof ARTICLE_SECTIONS)[number];
