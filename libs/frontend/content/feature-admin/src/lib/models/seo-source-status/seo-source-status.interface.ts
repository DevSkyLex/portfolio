import type { SeoStatusIcon } from '@internal/content-web-feature-admin/lib/models/seo-status-icon/seo-status-icon.interface';

/**
 * Interface SeoSourceStatus
 * @interface SeoSourceStatus
 *
 * @description
 * Collection state of one source of the dashboard, as the side panel lists it (D51): the source's
 * name, a sentence on its state with the time it applies to, and the icon of that state.
 */
export interface SeoSourceStatus {
  // #region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identity of the source.
   */
  readonly id: 'search-console' | 'analytics' | 'web-vitals' | 'audit';

  /**
   * Property name
   * @readonly
   *
   * @description
   * Product name of the source (« Search Console »), or « Audit SEO » for the internal audit.
   */
  readonly name: string;

  /**
   * Property detail
   * @readonly
   *
   * @description
   * State of the source, with the time of its latest collection or attempt when there is one.
   */
  readonly detail: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Icon and ink of the state.
   */
  readonly status: SeoStatusIcon;
  // #endregion
}
