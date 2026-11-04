import type { SeoSourceError } from '@vfortin/content-web-data-access/admin';
import type { SeoSectionView } from '@internal/content-web-feature-admin/lib/models/seo-section-view/seo-section-view.interface';

/**
 * Type SeoSection
 *
 * @description
 * Shape shared by the three Google sections of the dashboard contract (D47).
 *
 * @template T - Report type.
 */
type SeoSection<T> =
  | { readonly status: 'not-configured'; readonly fetchedAt: null; readonly missing: string[] }
  | { readonly status: 'pending'; readonly fetchedAt: null }
  | { readonly status: 'ok'; readonly fetchedAt: string; readonly data: T }
  | {
      readonly status: 'error';
      readonly fetchedAt: string | null;
      readonly attemptedAt: string;
      readonly error: SeoSourceError;
      readonly data: T | null;
    };

/**
 * Function seoSectionView
 *
 * @description
 * Flattens a Google section for its template.
 *
 * @template T - Report type.
 *
 * @param {SeoSection<T>} section - Section as the API answers it.
 *
 * @returns {SeoSectionView<T>} Flattened section.
 */
export function seoSectionView<T>(section: SeoSection<T>): SeoSectionView<T> {
  switch (section.status) {
    case 'not-configured':
      return {
        status: section.status,
        data: null,
        fetchedAt: null,
        error: null,
        attemptedAt: null,
        missing: section.missing,
      };
    case 'pending':
      return {
        status: section.status,
        data: null,
        fetchedAt: null,
        error: null,
        attemptedAt: null,
        missing: [],
      };
    case 'ok':
      return {
        status: section.status,
        data: section.data,
        fetchedAt: section.fetchedAt,
        error: null,
        attemptedAt: null,
        missing: [],
      };
    case 'error':
      return {
        status: section.status,
        data: section.data,
        fetchedAt: section.fetchedAt,
        error: section.error,
        attemptedAt: section.attemptedAt,
        missing: [],
      };
  }
}
