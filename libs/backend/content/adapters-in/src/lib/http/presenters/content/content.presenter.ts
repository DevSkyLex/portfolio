import type { PublishedContent } from '@vfortin/content-application';
import {
  type ContentLocale,
  type ContentSnapshot,
  ContentSnapshotSchema,
} from '@vfortin/content-contracts';
import type {
  LocalizedText,
  ProfileFact,
  Project,
  ProjectProps,
  SkillGroup,
  SkillTech,
  TimelineEntry,
} from '@vfortin/content-domain';

/**
 * Function toContentSnapshot
 *
 * @description
 * Projects the published domain content into the requested API locale, then validates the result
 * against the shared snapshot contract before it leaves the HTTP adapter.
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
  const all: (texts: readonly LocalizedText[]) => string[] = (
    texts: readonly LocalizedText[],
  ): string[] => texts.map(t);

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
    },
    projects: content.projects.map((project: Project): ContentSnapshot['projects'][number] => {
      const p: ProjectProps = project.snapshot();
      return {
        slug: p.slug.value,
        title: t(p.title),
        summary: t(p.summary),
        lead: t(p.lead),
        periodLabel: t(p.periodLabel),
        client: t(p.client),
        role: t(p.role),
        place: t(p.place),
        siteUrl: p.siteUrl,
        techs: [...p.techs],
        featured: p.featured,
        article: {
          context: all(p.article.context),
          work: all(p.article.work),
          workList: all(p.article.workList),
          choices: all(p.article.choices),
          result: all(p.article.result),
          lessons: all(p.article.lessons),
          captions: all(p.article.captions),
        },
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
  });
}
