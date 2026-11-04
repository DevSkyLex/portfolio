import type { AdminMedia } from '@internal/content-web-data-access/lib/admin/models/admin-media/admin-media.interface';
import type { ArticleDocumentDraft } from '@internal/content-web-data-access/lib/admin/models/article-document/article-document-draft.interface';
import type { ProjectPeriod } from '@internal/content-web-data-access/lib/admin/models/project-period/project-period.interface';
import type { ProjectCover } from '@internal/content-web-data-access/lib/admin/models/project-cover/project-cover.interface';
import type { ProjectSeo } from '@internal/content-web-data-access/lib/admin/models/project-seo/project-seo.interface';

/**
 * Type AdminProject
 *
 * @description
 * Administration view model: localized presentation, article document per language (D40), cover,
 * search texts, referenced media, revision identity and publication readiness. Kept independent of transport DTO
 * declarations; the API adapter owns incoming projection.
 */
export type AdminProject = {
  readonly id: string;
  readonly slug: string;
  readonly status: 'draft' | 'published';
  readonly version: number;
  readonly position: number;
  readonly title: { readonly fr: string; readonly en?: string };
  readonly summary: { readonly fr: string; readonly en?: string };
  readonly lead: { readonly fr: string; readonly en?: string };
  readonly period: ProjectPeriod;
  readonly client: { readonly fr: string; readonly en?: string };
  readonly role: { readonly fr: string; readonly en?: string };
  readonly place: { readonly fr: string; readonly en?: string };
  readonly siteUrl: string | null;
  readonly techs: string[];
  readonly featured: boolean;
  /** French document, and the English one once written (`null` before). */
  readonly article: { readonly fr: ArticleDocumentDraft; readonly en: ArticleDocumentDraft | null };
  readonly cover: ProjectCover | null;
  /** Custom search texts; an absent one falls back on the title or the summary. */
  readonly seo: ProjectSeo;
  /** Media referenced by the cover and the figures, to display them in the editor. */
  readonly media: readonly AdminMedia[];
  readonly missing: string[];
};
