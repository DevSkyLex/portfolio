import type { ProjectArticle } from '@vfortin/content-web-model';

/**
 * Type ProjectPageSeoSource
 * @type ProjectPageSeoSource
 *
 * @description
 * Fields of a case study its head metadata are computed from (D42): the public page passes the
 * snapshot project, the administrator editor the current form values, so both show the same tags.
 */
export type ProjectPageSeoSource = Pick<
  ProjectArticle,
  'slug' | 'title' | 'summary' | 'techs' | 'cover' | 'seo'
>;
