/**
 * Constant INCOMPLETE_ERROR
 *
 * @description
 * Error of a localized field left empty or untranslated on a published project, which the API refuses
 * to save (`content.project-incomplete`).
 *
 * @type {Readonly<{ kind: string; message: string }>}
 */
export const INCOMPLETE_ERROR: Readonly<{ kind: string; message: string }> = {
  kind: 'incomplete',
  message: $localize`:@@admin.content.incomplete:Obligatoire tant que le projet est publié.`,
};
