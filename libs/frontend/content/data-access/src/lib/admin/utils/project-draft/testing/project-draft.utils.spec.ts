import type { ProjectRevisionRequest } from '@vfortin/content-contracts';
import type { ProjectDraft } from '@internal/content-web-data-access/lib/admin/models/project-draft/project-draft.interface';
import { ProjectRevisionRequestSchema } from '@vfortin/content-contracts';
import { UNTRANSLATED } from '@internal/content-web-data-access/lib/admin/constants/untranslated.constants';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import {
  misalignedSections,
  toProjectDraft,
  toRevisionRequest,
} from '@internal/content-web-data-access/lib/admin/utils/project-draft/project-draft.utils';

/**
 * Function t
 *
 * @description
 * Creates a localized project fixture field and omits English when no translation is supplied.
 *
 * @param {string} fr - French source text.
 * @param {string} [en] - Optional English translation.
 *
 * @returns {{ fr: string; en?: string }} Localized fixture value.
 */
const t = (fr: string, en?: string): { fr: string; en?: string } =>
  en === undefined ? { fr } : { fr, en };

/**
 * Constant project
 *
 * @description
 * Published project fixture containing two aligned context paragraphs and one intentionally missing English lead.
 *
 * @type {AdminProject}
 */
const project: AdminProject = {
  id: 'p1',
  slug: 'movah',
  status: 'published',
  version: 3,
  position: 0,
  title: t('Movah', 'Movah'),
  summary: t('Résumé', 'Summary'),
  lead: t('Chapô'),
  periodLabel: t('2026', '2026'),
  client: t('Perso', 'Personal'),
  role: t('Dév', 'Dev'),
  place: t('Blois', 'Blois'),
  siteUrl: null,
  techs: ['flutter', 'dart'],
  featured: true,
  article: {
    context: [t('Un.', 'One.'), t('Deux.', 'Two.')],
    work: [t('Travail.')],
    workList: [],
    choices: [],
    result: [],
    lessons: [],
    captions: [],
  },
  missing: ['lead.en'],
};

describe('edit draft', (): void => {
  it('round-trips without loss, matching the contract', (): void => {
    const request: ProjectRevisionRequest = toRevisionRequest(toProjectDraft(project));
    expect(ProjectRevisionRequestSchema.safeParse(request).success).toBe(true);
    expect(request.article.context).toEqual(project.article.context);
    expect(request.article.work).toEqual([{ fr: 'Travail.' }]);
    expect(request.lead).toEqual({ fr: 'Chapô' });
    expect(request.techs).toEqual(['flutter', 'dart']);
  });

  it('keeps each translated paragraph of a partly translated section', (): void => {
    const partial: AdminProject = {
      ...project,
      article: {
        ...project.article,
        context: [t('Un.'), t('Deux.', 'Two.'), t('Trois.')],
        work: [t('Travail.', 'Work.'), t('Suite.')],
      },
    };
    const draft: ProjectDraft = toProjectDraft(partial);
    expect(draft.article.context.en).toBe(`${UNTRANSLATED}

Two.

${UNTRANSLATED}`);
    expect(misalignedSections(draft)).toEqual([]);
    const request: ProjectRevisionRequest = toRevisionRequest(draft);
    expect(request.article.context).toEqual(partial.article.context);
    expect(request.article.work).toEqual(partial.article.work);
  });

  it('flags a section whose English does not follow the French paragraphs', (): void => {
    const draft: ProjectDraft = toProjectDraft(project);
    draft.article.context.en = 'One only.';
    expect(misalignedSections(draft)).toEqual(['context']);
  });
});
