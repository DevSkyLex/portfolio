import type { MediaRecord, PublishedContent } from '@vfortin/content-application';
import {
  type ContentLocale,
  type ContentSnapshot,
  ContentSnapshotSchema,
  type PublicArticleBlockDto,
  type PublicArticleDocumentDto,
  type PublicLegalDocumentDto,
} from '@vfortin/content-contracts';
import type {
  ArticleBlock,
  ArticleDocument,
  LegalDocument,
  LocalizedProjectSeo,
  LocalizedText,
  ProfileFact,
  ProfileLink,
  Project,
  ProjectProps,
  SkillGroup,
  SkillTech,
  TimelineEntry,
} from '@vfortin/content-domain';
import { toPublicCodeBlock } from '@internal/content-adapters-in/lib/http/presenters/code-tokens/code-tokens.presenter';
import { toPublicImage } from '@internal/content-adapters-in/lib/http/presenters/media/media.presenter';
import { projectPeriodLabel } from '@internal/content-adapters-in/lib/http/presenters/project-period/project-period.presenter';

/**
 * Function publicArticle
 *
 * @description
 * Resolves the figures of a document to their public images and highlights its code blocks
 * (`toPublicCodeBlock`). A figure whose media is not stored
 * (which the revision check prevents) is left out rather than published broken; a document left
 * without blocks keeps one empty paragraph, as the editor does.
 *
 * @param {ArticleDocument} document - Document of the snapshot locale.
 * @param {ReadonlyMap<string, MediaRecord>} media - Stored media by identifier.
 * @returns {PublicArticleDocumentDto} Public document.
 */
function publicArticle(
  document: ArticleDocument,
  media: ReadonlyMap<string, MediaRecord>,
): PublicArticleDocumentDto {
  const content: PublicArticleBlockDto[] = document
    .toProps()
    .content.flatMap((block: ArticleBlock): PublicArticleBlockDto[] => {
      if (block.type === 'codeBlock') {
        return [toPublicCodeBlock(block)];
      }
      if (block.type !== 'figure') {
        return [block];
      }
      const record: MediaRecord | undefined = media.get(block.attrs.media);
      return record === undefined
        ? []
        : [
            {
              type: 'figure',
              attrs: {
                ...toPublicImage(record),
                alt: block.attrs.alt,
                caption: block.attrs.caption,
              },
            },
          ];
    });
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

/**
 * Constant PARIS_DAY
 *
 * @description
 * Formats an instant as its `YYYY-MM-DD` calendar date in Paris, the publisher's time zone, so that
 * a save at 00:30 in Paris is not dated the day before.
 */
const PARIS_DAY: Intl.DateTimeFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Function publicLegal
 *
 * @description
 * Projects a legal document into the snapshot locale; it has no figure, so no media is resolved.
 *
 * @param {LegalDocument} document - Legal document.
 * @param {ContentLocale} locale - Snapshot locale.
 * @returns {PublicLegalDocumentDto} Public document.
 */
function publicLegal(document: LegalDocument, locale: ContentLocale): PublicLegalDocumentDto {
  return {
    updatedOn: PARIS_DAY.format(document.updatedAt),
    document: publicArticle(document.body[locale], new Map()),
  };
}

/**
 * Function toContentSnapshot
 *
 * @description
 * Projects the published domain content into the requested API locale, with figures and covers
 * resolved to their public images, then validates the result against the shared snapshot contract
 * before it leaves the HTTP adapter.
 *
 * @param {PublishedContent} content - Consistent published content snapshot.
 * @param {ContentLocale} locale - Locale selected by the site build.
 * @returns {ContentSnapshot} Contract-validated public content DTO.
 */
export function toContentSnapshot(
  content: PublishedContent,
  locale: ContentLocale,
): ContentSnapshot {
  const t: (text: LocalizedText) => string = (text: LocalizedText): string => text.in(locale);

  return ContentSnapshotSchema.parse({
    locale,
    revision: content.revision,
    profile: {
      heroIntro: t(content.profile.heroIntro),
      aboutStatement: t(content.profile.aboutStatement),
      aboutLead: t(content.profile.aboutLead),
      facts: content.profile.facts.map(
        (fact: ProfileFact): ContentSnapshot['profile']['facts'][number] => ({
          label: t(fact.label),
          value: t(fact.value),
        }),
      ),
      links: content.profile.links.map(
        (link: ProfileLink): ContentSnapshot['profile']['links'][number] => link.toProps(),
      ),
    },
    projects: content.projects.map((project: Project): ContentSnapshot['projects'][number] => {
      const p: ProjectProps = project.snapshot();
      const cover: MediaRecord | undefined =
        p.cover === null ? undefined : content.media.get(p.cover.media);
      const seo: LocalizedProjectSeo = p.seo.in(locale);
      return {
        slug: p.slug.value,
        title: t(p.title),
        summary: t(p.summary),
        lead: t(p.lead),
        periodLabel: projectPeriodLabel(p.period, locale),
        client: t(p.client),
        role: t(p.role),
        place: t(p.place),
        siteUrl: p.siteUrl,
        techs: [...p.techs],
        featured: p.featured,
        // A published project has both documents; French is the fallback of an English snapshot.
        article: publicArticle(p.article[locale] ?? p.article.fr, content.media),
        cover:
          p.cover === null || cover === undefined
            ? null
            : { ...toPublicImage(cover), alt: p.cover.alt[locale] ?? p.cover.alt.fr },
        // Custom search values of this locale only; the page falls back on its own title, summary
        // and technologies.
        seo: { ...seo, keywords: [...seo.keywords] },
      };
    }),
    timeline: content.timeline.map((entry: TimelineEntry): ContentSnapshot['timeline'][number] => ({
      id: entry.id,
      kind: entry.kind,
      title: t(entry.title),
      place: t(entry.place),
      description: t(entry.description),
      start: entry.period.start,
      end: entry.period.end,
      techs: [...entry.techs],
    })),
    skills: content.skills.map((group: SkillGroup): ContentSnapshot['skills'][number] => ({
      id: group.id,
      domain: t(group.domain),
      techs: group.techs.map(
        (tech: SkillTech): ContentSnapshot['skills'][number]['techs'][number] => ({
          key: tech.key,
          language: tech.language,
        }),
      ),
      usage: t(group.usage),
    })),
    legal: {
      notice: publicLegal(content.legal.notice, locale),
      privacy: publicLegal(content.legal.privacy, locale),
    },
  });
}
