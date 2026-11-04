import type { ContentSnapshot, ProjectDto, TimelineEntryDto } from '@vfortin/content-contracts';
import type { ProjectArticle, SiteContent, TimelineStep } from '@vfortin/content-web-model';
import { toArticle } from '@internal/content-web-data-access/lib/adapters/article/article.adapter';
import { toLegalDocument } from '@internal/content-web-data-access/lib/adapters/legal-document/legal-document.adapter';
import { toSiteLinks } from '@internal/content-web-data-access/lib/adapters/site-link/site-link.adapter';

/**
 * Function yearOf
 *
 * @description
 * Converts a calendar year and one-based month into the decimal-year axis used by timeline layout.
 *
 * @param {{ year: number; month: number }} value - Calendar position from the content API.
 *
 * @returns {number} Decimal year with each month occupying one twelfth of a year.
 */
const yearOf: (value: { year: number; month: number }) => number = (value: {
  year: number;
  month: number;
}): number => value.year + (value.month - 1) / 12;

/**
 * Function dateLabel
 *
 * @description
 * Builds the localized year label shown for a timeline entry; ongoing entries use the start year only.
 *
 * @param {TimelineEntryDto} entry - Validated timeline entry from the content contract.
 * @param {SiteContent['locale']} locale - Locale that controls the ongoing-period wording.
 *
 * @returns {string} Localized year or year range for the entry.
 */
function dateLabel(entry: TimelineEntryDto, locale: SiteContent['locale']): string {
  if (entry.end === null) {
    return locale === 'en' ? `Since ${entry.start.year}` : `Depuis ${entry.start.year}`;
  }
  return entry.start.year === entry.end.year
    ? String(entry.start.year)
    : `${entry.start.year} — ${entry.end.year}`;
}

/**
 * Function toTimelineStep
 *
 * @description
 * Projects a validated timeline entry into the public view model, extending an ongoing entry to the end of the current year.
 *
 * @param {TimelineEntryDto} entry - Validated timeline entry from the content contract.
 * @param {SiteContent['locale']} locale - Locale used to build its date label.
 *
 * @returns {TimelineStep} Timeline view model with decimal-year axis positions.
 */
function toTimelineStep(entry: TimelineEntryDto, locale: SiteContent['locale']): TimelineStep {
  return {
    id: entry.id,
    kind: entry.kind,
    title: entry.title,
    place: entry.place,
    description: entry.description,
    dateLabel: dateLabel(entry, locale),
    start: yearOf(entry.start),
    // An ongoing step extends to the end of the current year on the axis.
    end: entry.end === null ? new Date().getFullYear() + 1 : yearOf(entry.end) + 1 / 12,
    techs: entry.techs,
  };
}

/**
 * Function toProjectArticle
 *
 * @description
 * Projects a validated project DTO into its public article model and derives a display label from any external site URL.
 *
 * @param {ProjectDto} dto - Validated project data returned by the content contract.
 *
 * @returns {ProjectArticle} Public project article, its document split into an introduction and sections.
 */
function toProjectArticle(dto: ProjectDto): ProjectArticle {
  return {
    slug: dto.slug,
    title: dto.title,
    summary: dto.summary,
    periodLabel: dto.periodLabel,
    techs: dto.techs,
    featured: dto.featured,
    lead: dto.lead,
    client: dto.client,
    role: dto.role,
    place: dto.place,
    site:
      dto.siteUrl === null
        ? null
        : { url: dto.siteUrl, label: new URL(dto.siteUrl).hostname.replace(/^www\./, '') },
    cover: dto.cover,
    seo: {
      title: dto.seo.title,
      description: dto.seo.description,
      // Only the prerender validates the snapshot (D10); a raw snapshot given to
      // `provideContentSnapshots` without the keywords field reads as having none.
      keywords: (dto.seo as Partial<ProjectDto['seo']>).keywords ?? [],
    },
    ...toArticle(dto.article),
  };
}

/**
 * Function toSiteContent
 *
 * @description
 * Maps a contract-validated snapshot into public view models; callers must validate untrusted snapshot data before this projection.
 *
 * @param {ContentSnapshot} snapshot - Content snapshot that has already passed contract validation.
 *
 * @returns {SiteContent} Locale-specific content consumed by public sections and pages.
 */
export function toSiteContent(snapshot: ContentSnapshot): SiteContent {
  return {
    locale: snapshot.locale,
    revision: snapshot.revision,
    profile: { ...snapshot.profile, links: toSiteLinks(snapshot.profile.links) },
    projects: snapshot.projects.map(toProjectArticle),
    timeline: snapshot.timeline.map((entry): TimelineStep =>
      toTimelineStep(entry, snapshot.locale),
    ),
    skills: snapshot.skills,
    legal: {
      notice: toLegalDocument(snapshot.legal.notice),
      privacy: toLegalDocument(snapshot.legal.privacy),
    },
  };
}
