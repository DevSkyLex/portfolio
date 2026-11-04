import type { ProjectShortField } from '@internal/content-web-feature-admin/lib/models/project-short-field/project-short-field.interface';

/**
 * Constant PROJECT_SHORT_FIELDS
 *
 * @description
 * Bilingual short fields of the form, in display order (`PROJECT_TEXT_SECTIONS` groups them); each one requires its French value.
 *
 * @type {readonly ProjectShortField[]}
 */
export const PROJECT_SHORT_FIELDS: readonly ProjectShortField[] = [
  { key: 'title', label: $localize`:@@admin.project.field.title:Titre`, multiline: false },
  { key: 'summary', label: $localize`:@@admin.project.field.summary:Résumé`, multiline: true },
  { key: 'lead', label: $localize`:@@admin.project.field.lead:Chapô`, multiline: true },
  { key: 'client', label: $localize`:@@admin.project.field.client:Client`, multiline: false },
  { key: 'role', label: $localize`:@@admin.project.field.role:Rôle`, multiline: false },
  { key: 'place', label: $localize`:@@admin.project.field.place:Lieu`, multiline: false },
];
