import { PROJECT_SHORT_FIELDS } from '@internal/content-web-feature-admin/lib/constants/project-short-fields.constants';
import type { ProjectShortField } from '@internal/content-web-feature-admin/lib/models/project-short-field/project-short-field.interface';
import type { ProjectShortFieldKey } from '@internal/content-web-feature-admin/lib/models/project-short-field/project-short-field-key.type';
import type { ProjectTextSection } from '@internal/content-web-feature-admin/lib/models/project-text-section/project-text-section.interface';

/**
 * Function fieldsOf
 *
 * @description
 * Short fields of the given keys, in the order of `PROJECT_SHORT_FIELDS`.
 *
 * @param {readonly ProjectShortFieldKey[]} keys - Keys of the section.
 *
 * @returns {readonly ProjectShortField[]} The fields.
 */
const fieldsOf: (keys: readonly ProjectShortFieldKey[]) => readonly ProjectShortField[] = (
  keys: readonly ProjectShortFieldKey[],
): readonly ProjectShortField[] =>
  PROJECT_SHORT_FIELDS.filter((field: ProjectShortField): boolean => keys.includes(field.key));

/**
 * Constant PROJECT_TEXT_SECTIONS
 *
 * @description
 * Sections of short fields at the top of the project form: the texts of the card and of the article
 * opening, then the project facts, two by two. The first description explains the language
 * selector joined to each field.
 *
 * @type {readonly ProjectTextSection[]}
 */
export const PROJECT_TEXT_SECTIONS: readonly ProjectTextSection[] = [
  {
    key: 'presentation',
    title: $localize`:@@admin.project.section.presentation:Présentation`,
    description: $localize`:@@admin.project.section.presentationHint:Le titre et le résumé forment la carte de l’accueil ; le chapô ouvre l’article. Le sélecteur accolé à chaque champ change sa langue.`,
    fields: fieldsOf(['title', 'summary', 'lead']),
    columns: false,
  },
  {
    key: 'details',
    title: $localize`:@@admin.project.section.details:Informations`,
    description: null,
    fields: fieldsOf(['client', 'role', 'place']),
    columns: true,
  },
];
