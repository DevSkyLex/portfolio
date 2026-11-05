import type {
  Project,
  ProjectCover,
  ProjectProps,
} from '@internal/content-domain/lib/project/project';
import type { ArticleDocument } from '@internal/content-domain/lib/values/article-document/article-document';
import {
  LOCALES,
  type Locale,
} from '@internal/content-domain/lib/values/localized-text/localized-text';
import {
  PROJECT_SEO_DESCRIPTION_MAX_LENGTH,
  PROJECT_SEO_TITLE_MAX_LENGTH,
  type LocalizedProjectSeo,
} from '@internal/content-domain/lib/values/project-seo/project-seo';

/**
 * Constant SEO_TITLE_MIN_LENGTH
 *
 * @description
 * Shortest search title the audit accepts without a warning: a shorter one leaves most of the result
 * line unused. The longest is `PROJECT_SEO_TITLE_MAX_LENGTH` (D42).
 */
export const SEO_TITLE_MIN_LENGTH: number = 30;

/**
 * Constant SEO_DESCRIPTION_MIN_LENGTH
 *
 * @description
 * Shortest search description the audit accepts without a warning; the longest is
 * `PROJECT_SEO_DESCRIPTION_MAX_LENGTH` (D42).
 */
export const SEO_DESCRIPTION_MIN_LENGTH: number = 70;

/**
 * Constant SEO_FALLBACK_DESCRIPTION_LENGTH
 *
 * @description
 * Length near which a page without a search description cuts its summary, mirroring
 * `seoDescription` of the content web data access (D42).
 */
export const SEO_FALLBACK_DESCRIPTION_LENGTH: number = 160;

/**
 * Constant SEO_SITE_NAME
 *
 * @description
 * Suffix of the fallback search title (`<project title> — Valentin Fortin`), mirroring
 * `SITE_IDENTITY.name` of the content web data access.
 */
export const SEO_SITE_NAME: string = 'Valentin Fortin';

/**
 * Type SeoAuditSeverity
 * @type SeoAuditSeverity
 *
 * @description
 * `error` for what search engines or assistive technologies miss, `warning` for what weakens a
 * result, `info` for a fallback the page applies on its own.
 */
export type SeoAuditSeverity = 'error' | 'warning' | 'info';

/**
 * Type SeoAuditCode
 * @type SeoAuditCode
 *
 * @description
 * Kind of a finding of the internal SEO audit (D47).
 */
export type SeoAuditCode =
  | 'search-title-missing'
  | 'search-title-too-short'
  | 'search-title-too-long'
  | 'search-description-missing'
  | 'search-description-too-short'
  | 'search-description-too-long'
  | 'keywords-missing'
  | 'cover-missing'
  | 'cover-alt-missing'
  | 'image-alt-missing'
  | 'translation-missing';

/**
 * Interface SeoAuditIssue
 * @interface SeoAuditIssue
 *
 * @description
 * One finding of the audit, with the figures its message needs.
 */
export interface SeoAuditIssue {
  // #region Properties
  /**
   * Property code
   * @readonly
   *
   * @description
   * Kind of finding.
   */
  readonly code: SeoAuditCode;

  /**
   * Property severity
   * @readonly
   *
   * @description
   * Importance of the finding.
   */
  readonly severity: SeoAuditSeverity;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Page language concerned, or `null` for a finding shared by both pages (the cover).
   */
  readonly locale: Locale | null;

  /**
   * Property length
   * @readonly
   *
   * @description
   * Length in characters of the text the page emits, for the length findings.
   */
  readonly length?: number;

  /**
   * Property limit
   * @readonly
   *
   * @description
   * Bound the text crosses, for the length findings.
   */
  readonly limit?: number;

  /**
   * Property count
   * @readonly
   *
   * @description
   * Number of images lacking an alternative text, for `image-alt-missing`.
   */
  readonly count?: number;

  /**
   * Property fields
   * @readonly
   *
   * @description
   * Untranslated fields (`title.en`, `article.en`…), for `translation-missing`.
   */
  readonly fields?: readonly string[];
  // #endregion
}

/**
 * Type SeoKeywordsSource
 * @type SeoKeywordsSource
 *
 * @description
 * Origin of the keywords a page writes (D42): the administrator's, the technologies, or none.
 */
export type SeoKeywordsSource = 'custom' | 'techs' | 'none';

/**
 * Interface SeoPageAudit
 * @interface SeoPageAudit
 *
 * @description
 * Search texts one page of a project emits, as the public page computes them.
 */
export interface SeoPageAudit {
  // #region Properties
  /**
   * Property path
   * @readonly
   *
   * @description
   * Path of the page on the site (`/fr/projects/<slug>` or `/en/projects/<slug>`).
   */
  readonly path: string;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Search title: the custom one, or `<project title> — Valentin Fortin`.
   */
  readonly title: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Search description: the custom one, or the summary cut near 160 characters.
   */
  readonly description: string;

  /**
   * Property keywords
   * @readonly
   *
   * @description
   * Keywords written to the page, empty when none.
   */
  readonly keywords: readonly string[];

  /**
   * Property keywordsSource
   * @readonly
   *
   * @description
   * Where the keywords come from.
   */
  readonly keywordsSource: SeoKeywordsSource;
  // #endregion
}

/**
 * Interface ProjectSeoAudit
 * @interface ProjectSeoAudit
 *
 * @description
 * Audit of one published project: what each page emits and the findings.
 */
export interface ProjectSeoAudit {
  // #region Properties
  /**
   * Property projectId
   * @readonly
   *
   * @description
   * Project identifier.
   */
  readonly projectId: string;

  /**
   * Property slug
   * @readonly
   *
   * @description
   * Public URL segment.
   */
  readonly slug: string;

  /**
   * Property title
   * @readonly
   *
   * @description
   * French project title, naming the project in the dashboard.
   */
  readonly title: string;

  /**
   * Property pages
   * @readonly
   *
   * @description
   * Search texts per page language.
   */
  readonly pages: Readonly<Record<Locale, SeoPageAudit>>;

  /**
   * Property issues
   * @readonly
   *
   * @description
   * Findings: the shared ones first, then the French page's, then the English page's.
   */
  readonly issues: readonly SeoAuditIssue[];
  // #endregion
}

/**
 * Function fallbackDescription
 *
 * @description
 * Flattens the whitespace of a summary and cuts it near `max` characters at a word boundary with an
 * ellipsis, as `seoDescription` of the content web data access does for a page without a search
 * description.
 *
 * @param {string} text - Summary.
 * @param {number} max - Longest result.
 * @returns {string} Description the page emits.
 */
export function fallbackDescription(
  text: string,
  max: number = SEO_FALLBACK_DESCRIPTION_LENGTH,
): string {
  const flat: string = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const head: string = flat.slice(0, max - 1);
  const space: number = head.lastIndexOf(' ');
  // A single very long word is cut inside it rather than reduced to a few characters.
  const cut: string = space >= max / 2 ? head.slice(0, space) : head;
  return `${cut.replace(/[\s,;:.!?…\-–—]+$/u, '')}…`;
}

/**
 * Function lengthIssues
 *
 * @description
 * Reports a search text missing (the page then uses its fallback), shorter than `min` or longer
 * than `max`, measured on the text the page emits.
 *
 * @param {'search-title' | 'search-description'} field - Text audited.
 * @param {Locale} locale - Page language.
 * @param {string | null} custom - Administrator's text, `null` when absent.
 * @param {string} emitted - Text the page emits.
 * @param {number} min - Shortest length without warning.
 * @param {number} max - Longest length without warning.
 * @returns {SeoAuditIssue[]} Findings for this text.
 */
function lengthIssues(
  field: 'search-title' | 'search-description',
  locale: Locale,
  custom: string | null,
  emitted: string,
  min: number,
  max: number,
): SeoAuditIssue[] {
  const issues: SeoAuditIssue[] = [];
  if (custom === null) {
    issues.push({ code: `${field}-missing`, severity: 'info', locale });
  }
  if (emitted.length < min) {
    issues.push({
      code: `${field}-too-short`,
      severity: 'warning',
      locale,
      length: emitted.length,
      limit: min,
    });
  } else if (emitted.length > max) {
    issues.push({
      code: `${field}-too-long`,
      severity: 'warning',
      locale,
      length: emitted.length,
      limit: max,
    });
  }
  return issues;
}

/**
 * Function auditPage
 *
 * @description
 * Computes the search texts of one page and its findings: text lengths, keywords, alternative texts
 * of the cover and of the article figures and, for English, untranslated fields.
 *
 * @param {Project} project - Published project.
 * @param {Locale} locale - Page language.
 * @returns {{ page: SeoPageAudit; issues: SeoAuditIssue[] }} Page texts and findings.
 */
function auditPage(
  project: Project,
  locale: Locale,
): { page: SeoPageAudit; issues: SeoAuditIssue[] } {
  const props: ProjectProps = project.snapshot();
  const seo: LocalizedProjectSeo = props.seo.in(locale);
  const title: string = seo.title ?? `${props.title.in(locale)} — ${SEO_SITE_NAME}`;
  const description: string = seo.description ?? fallbackDescription(props.summary.in(locale));
  const keywordsSource: SeoKeywordsSource =
    seo.keywords.length > 0 ? 'custom' : props.techs.length > 0 ? 'techs' : 'none';
  const keywords: readonly string[] = keywordsSource === 'custom' ? seo.keywords : props.techs;
  const issues: SeoAuditIssue[] = [
    ...lengthIssues(
      'search-title',
      locale,
      seo.title,
      title,
      SEO_TITLE_MIN_LENGTH,
      PROJECT_SEO_TITLE_MAX_LENGTH,
    ),
    ...lengthIssues(
      'search-description',
      locale,
      seo.description,
      description,
      SEO_DESCRIPTION_MIN_LENGTH,
      PROJECT_SEO_DESCRIPTION_MAX_LENGTH,
    ),
  ];
  if (keywordsSource !== 'custom') {
    issues.push({
      code: 'keywords-missing',
      severity: keywordsSource === 'techs' ? 'info' : 'warning',
      locale,
    });
  }
  const cover: ProjectCover | null = props.cover;
  if (cover !== null && (cover.alt[locale] ?? '').trim() === '') {
    issues.push({ code: 'cover-alt-missing', severity: 'error', locale });
  }
  const document: ArticleDocument | undefined = props.article[locale];
  const withoutAlt: number = document?.figuresMissingAlt().length ?? 0;
  if (withoutAlt > 0) {
    issues.push({ code: 'image-alt-missing', severity: 'error', locale, count: withoutAlt });
  }
  if (locale !== 'fr') {
    // Alternative texts have their own findings above.
    const fields: string[] = project
      .missingFor([locale])
      .filter(
        (field: string): boolean => !field.endsWith('.figures') && !field.startsWith('cover.'),
      );
    if (fields.length > 0) {
      issues.push({ code: 'translation-missing', severity: 'error', locale, fields });
    }
  }
  const path: string = `/${locale}/projects/${encodeURIComponent(props.slug.value)}`;
  return { page: { path, title, description, keywords: [...keywords], keywordsSource }, issues };
}

/**
 * Function auditProjectSeo
 *
 * @description
 * Audits the search and sharing metadata a published project's pages emit (D42, D47), from the
 * project alone: the same fallbacks as the public page, so the findings describe what crawlers read.
 *
 * @param {Project} project - Published project.
 * @returns {ProjectSeoAudit} Page texts and findings.
 */
export function auditProjectSeo(project: Project): ProjectSeoAudit {
  const props: ProjectProps = project.snapshot();
  const issues: SeoAuditIssue[] = [];
  if (props.cover === null) {
    // Without a cover the pages share no image (no og:image, a `summary` Twitter card).
    issues.push({ code: 'cover-missing', severity: 'warning', locale: null });
  }
  const pages: Partial<Record<Locale, SeoPageAudit>> = {};
  for (const locale of LOCALES) {
    const audit: { page: SeoPageAudit; issues: SeoAuditIssue[] } = auditPage(project, locale);
    pages[locale] = audit.page;
    issues.push(...audit.issues);
  }
  return {
    projectId: props.id,
    slug: props.slug.value,
    title: props.title.in('fr'),
    pages: pages as Record<Locale, SeoPageAudit>,
    issues,
  };
}
