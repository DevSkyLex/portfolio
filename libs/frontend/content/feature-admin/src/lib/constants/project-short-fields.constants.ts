import type { ProjectShortField } from '@internal/content-web-feature-admin/lib/models/project-short-field/project-short-field.interface';

/**
 * Constant PROJECT_SHORT_FIELDS
 *
 * @description
 * Bilingual fields of the form's presentation part, in display order; each one requires its French value.
 *
 * @type {readonly ProjectShortField[]}
 */
export const PROJECT_SHORT_FIELDS: readonly ProjectShortField[] = [
  { key: 'title', label: 'Titre', multiline: false },
  { key: 'summary', label: 'Résumé (carte de l’accueil)', multiline: true },
  { key: 'lead', label: 'Chapô de l’article', multiline: true },
  { key: 'periodLabel', label: 'Période', multiline: false },
  { key: 'client', label: 'Client', multiline: false },
  { key: 'role', label: 'Rôle', multiline: false },
  { key: 'place', label: 'Lieu', multiline: false },
];
